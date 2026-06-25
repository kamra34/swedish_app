import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  Platform, ActivityIndicator, Keyboard, Dimensions,
} from 'react-native';
import { colors, radius } from '../theme';
import { scenes as fallbackScenes } from '../data/scenes';
import { pickTopics } from '../data/sceneTopics';
import { lessons } from '../data/courseData';
import {
  sendChat, fetchScenes, customScene, getSavedScenes, saveScene, deleteSavedScene,
} from '../api/chat';
import SpeakButton from '../components/SpeakButton';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';

// --- normalize the various scene shapes into one ---
const normGen = (s, id) => ({
  id,
  emoji: s.emoji || '💬',
  title: s.title || 'Samtal',
  subtitle: s.subtitle || '',
  sceneDesc: s.scene_desc || '',
  opener: { sv: s.opener_sv || 'Hej!', en: s.opener_en || 'Hi!' },
});
const normSaved = (s) => ({
  id: 'saved-' + s.id,
  savedId: s.id,
  emoji: s.emoji || '💬',
  title: s.title || 'Samtal',
  subtitle: s.subtitle || '',
  sceneDesc: s.scene_desc || '',
  opener: { sv: s.opener_sv || 'Hej!', en: s.opener_en || 'Hi!' },
});
const toRaw = (s) => ({
  emoji: s.emoji, title: s.title, subtitle: s.subtitle,
  scene_desc: s.sceneDesc, opener_sv: s.opener.sv, opener_en: s.opener.en,
});

// Always-available "free talk" — no fixed scene. Empty sceneDesc tells the
// backend to use open small-talk mode (still level-aware + coaching).
const GENERAL_SCENE = {
  id: 'general',
  emoji: '💬',
  title: 'Småprat',
  subtitle: 'Free chat — talk about anything',
  sceneDesc: '',
  opener: { sv: 'Hej! Vad har du gjort idag?', en: 'Hi! What have you done today?' },
};

export default function ConversationScreen({ onBack }) {
  const [scene, setScene] = useState(null);
  const [sceneSaved, setSceneSaved] = useState(false);

  // scene-picker state
  const [suggested, setSuggested] = useState(null);
  const [loadingSug, setLoadingSug] = useState(false);
  const [saved, setSaved] = useState([]);
  const [customText, setCustomText] = useState('');
  const [customBusy, setCustomBusy] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  // chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [kbPad, setKbPad] = useState(0); // iOS: lift the input bar above the keyboard
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const startingRef = useRef(false); // guards against double-starting voice recognition

  // hands-free "call" mode (continuous listen → reply → speak → auto-listen loop)
  const [callActive, setCallActive] = useState(false);
  const [callState, setCallState] = useState('idle'); // UI: starting|listening|thinking|speaking
  const [partial, setPartial] = useState(''); // live transcript of what you're saying
  const callRef = useRef(false); // mirrors callActive for use inside captured listeners
  const phaseRef = useRef('idle'); // synchronous state-machine gate (see setPhase)
  const partialRef = useRef('');
  const callSubsRef = useRef([]);
  const sceneRef = useRef(null);
  const messagesRef = useRef([]);
  const restartTimerRef = useRef(null); // pending listen-restart (coalesces duplicate triggers)
  const speakWatchdogRef = useRef(null); // rescues a swallowed TTS onDone (e.g. on web)
  const noResultRef = useRef(0); // consecutive turns with nothing heard
  const failRef = useRef(0); // consecutive backend failures
  const justEndedCallRef = useRef(false); // brief guard so stop()'s trailing result can't leak

  const { knownWords, knownGrammar } = useMemo(() => {
    const unlocked = lessons.filter((l) => l.unlocked);
    return {
      knownWords: unlocked.flatMap((l) => (l.vocab || []).map((v) => v.sv)),
      knownGrammar: unlocked.flatMap((l) => l.grammar?.body || []),
    };
  }, []);

  const loadSuggested = useCallback(async () => {
    setLoadingSug(true);
    setPickerError(null);
    try {
      const topics = pickTopics(4);
      const data = await fetchScenes({ level: 'A1', knownWords, knownGrammar, topics });
      const norm = (data.scenes || []).map((s, i) => normGen(s, 'sug-' + i + '-' + Math.random().toString(36).slice(2, 7)));
      setSuggested(norm.length ? norm : fallbackScenes);
    } catch (e) {
      setSuggested(fallbackScenes);
      setPickerError('Offline — using built-in scenes.');
    } finally {
      setLoadingSug(false);
    }
  }, [knownWords, knownGrammar]);

  const loadSaved = useCallback(async () => {
    try {
      const d = await getSavedScenes();
      setSaved((d.scenes || []).map(normSaved));
    } catch {}
  }, []);

  useEffect(() => { loadSuggested(); loadSaved(); }, [loadSuggested, loadSaved]);

  const startScene = (s) => {
    stopVoice();
    setScene(s);
    setSceneSaved(!!s.savedId);
    setError(null);
    setMessages([{ id: 'opener', role: 'ai', sv: s.opener.sv, en: s.opener.en, showEn: false, correction: null }]);
  };

  const startCustom = async () => {
    const desc = customText.trim();
    if (!desc || customBusy) return;
    setCustomBusy(true);
    setPickerError(null);
    try {
      const d = await customScene({ level: 'A1', knownWords, knownGrammar, description: desc });
      if (d.scene) { setCustomText(''); startScene(normGen(d.scene, 'custom-' + Math.random().toString(36).slice(2, 7))); }
      else setPickerError('Could not build that scene — try rephrasing.');
    } catch (e) {
      setPickerError('Could not build that scene. (' + (e.message || '') + ')');
    } finally {
      setCustomBusy(false);
    }
  };

  const doSave = async (s) => {
    try {
      const d = await saveScene(toRaw(s));
      if (d.scene) setSaved((prev) => [normSaved(d.scene), ...prev]);
    } catch {}
  };

  const saveCurrentScene = async () => {
    if (!scene || sceneSaved) return;
    try {
      const d = await saveScene(toRaw(scene));
      if (d.scene) { setSaved((prev) => [normSaved(d.scene), ...prev]); setSceneSaved(true); }
    } catch {}
  };

  const doDelete = async (savedId) => {
    setSaved((prev) => prev.filter((x) => x.savedId !== savedId));
    try { await deleteSavedScene(savedId); } catch { loadSaved(); }
  };

  const leaveScene = () => { endCall(); stopVoice(); setScene(null); setMessages([]); setInput(''); };

  const toggleEn = (id) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, showEn: !m.showEn } : m)));

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    stopVoice();
    setInput('');
    setError(null);
    const userMsg = { id: 'u' + messages.length, role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.slice(0, -1).map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.role === 'ai' ? m.sv : m.text }));
      const data = await sendChat({ level: 'A1', scene: scene.sceneDesc, knownWords, knownGrammar, history, userMessage: text });
      setMessages((ms) => [...ms, {
        id: 'a' + ms.length, role: 'ai',
        sv: data.reply_sv || '…', en: data.reply_en || '', showEn: false,
        correction: data.correction?.had_error ? data.correction.note : null,
      }]);
    } catch (e) {
      setError('Could not reach the tutor — is the backend running? (' + (e.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  // --- voice ---
  // Native (iOS/Android) on-device speech-to-text events. On web we use the
  // browser's SpeechRecognition instead (in startVoice), so these never fire there.
  useSpeechRecognitionEvent('result', (e) => {
    // hands-free call mode handles its own events; the grace flag also drops the
    // trailing result that stop() emits just after a call ends.
    if (callRef.current || justEndedCallRef.current) return;
    const t = e?.results?.[0]?.transcript;
    if (typeof t === 'string') setInput(t);
  });
  useSpeechRecognitionEvent('end', () => {
    if (callRef.current) return;
    setListening(false);
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (callRef.current) return;
    setListening(false);
    if (e?.error && e.error !== 'aborted' && e.error !== 'no-speech') {
      setError('🎤 Could not hear that clearly — try again, or type your reply.');
    }
  });

  const stopVoice = () => {
    if (Platform.OS === 'web') {
      try { recognitionRef.current?.stop?.(); } catch {}
      recognitionRef.current = null;
    } else {
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    }
    setListening(false);
  };

  const startVoice = async () => {
    if (listening) { stopVoice(); return; }

    // Native: on-device speech recognition (works in the TestFlight/App Store build).
    if (Platform.OS !== 'web') {
      if (startingRef.current) return; // ignore a 2nd tap during the permission await
      startingRef.current = true;
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm?.granted) {
          setError('🎤 Allow microphone & speech access in iPhone Settings to talk to the coach.');
          return;
        }
        setError(null);
        setInput('');
        setListening(true);
        ExpoSpeechRecognitionModule.start({ lang: 'sv-SE', interimResults: true });
      } catch (err) {
        setListening(false);
        setError('🎤 Voice could not start — type your reply for now.');
      } finally {
        startingRef.current = false;
      }
      return;
    }

    // Web: browser SpeechRecognition (the dev preview).
    const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!SR) {
      setError('🎤 This browser doesn’t support voice input — just type your reply.');
      return;
    }
    const rec = new SR();
    rec.lang = 'sv-SE';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  };

  // ----- hands-free "call" mode: listen → reply → speak → auto-listen, looping -----
  // Keep refs fresh so the captured native listeners always read current values.
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const MAX_NO_RESULT = 8; // stop listening after this many silent turns in a row
  const MAX_FAIL = 3;      // stop after this many backend failures in a row

  // Single source of truth for the loop. phaseRef is read synchronously by the
  // native event handlers; callState mirrors it for the UI.
  const setPhase = (p) => { phaseRef.current = p; setCallState(p); };
  const clearRestart = () => { if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; } };
  const clearWatchdog = () => { if (speakWatchdogRef.current) { clearTimeout(speakWatchdogRef.current); speakWatchdogRef.current = null; } };

  // Start ONE mic session after a short settle delay. Coalesces duplicate
  // triggers (the recognizer emits a paired error+end for one session) and lets
  // the previous session reach 'inactive' so start() can't fail with 'busy'.
  const scheduleListen = (delay = 350) => {
    if (!callRef.current) return;
    if (restartTimerRef.current) return; // a restart is already pending
    setPhase('starting');
    setPartial(''); partialRef.current = '';
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (!callRef.current || phaseRef.current !== 'starting') return;
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'sv-SE',
          interimResults: true,
          continuous: false, // auto-stops when you pause speaking → fires 'end'
          contextualStrings: knownWords.slice(0, 100),
        });
        setPhase('listening');
      } catch (err) {
        setError('🎤 Voice could not start.');
        endCall();
      }
    }, delay);
  };

  const giveUpListening = () => {
    endCall();
    setError('🎤 I didn’t catch anything — tap “Start hands-free conversation” to resume.');
  };

  const onCallResult = (e) => {
    if (phaseRef.current !== 'listening') return; // ignore stale / out-of-phase events
    const t = e?.results?.[0]?.transcript;
    if (typeof t === 'string') { setPartial(t); partialRef.current = t; }
  };

  const onCallEnd = () => {
    if (phaseRef.current !== 'listening') return; // duplicate / stale 'end' → drop
    const said = (partialRef.current || '').trim();
    partialRef.current = '';
    if (said) {
      noResultRef.current = 0;
      setPhase('thinking'); // leave 'listening' synchronously so a paired event bails
      callExchange(said);
    } else {
      noResultRef.current += 1;
      if (noResultRef.current >= MAX_NO_RESULT) giveUpListening();
      else scheduleListen();
    }
  };

  const onCallError = (e) => {
    if (!callRef.current) return;
    const code = e?.error;
    if (code === 'not-allowed' || code === 'service-not-allowed' ||
        code === 'language-not-supported' || code === 'audio-capture') {
      endCall();
      setError('🎤 Voice isn’t available right now (' + (code || 'error') + '). Tap to try again.');
      return;
    }
    // transient ('no-speech' / 'network' / 'busy' / interruption). One session can
    // emit a paired error+end, so only act while still listening/starting, then
    // move out of that phase so the trailing event is dropped.
    if (phaseRef.current !== 'listening' && phaseRef.current !== 'starting') return;
    noResultRef.current += 1;
    if (noResultRef.current >= MAX_NO_RESULT) giveUpListening();
    else scheduleListen();
  };

  const callExchange = async (text) => {
    if (!callRef.current || phaseRef.current !== 'thinking') return;
    const base = messagesRef.current;
    const userMsg = { id: 'cu' + base.length + '-' + Date.now(), role: 'user', text };
    const next = [...base, userMsg];
    setMessages(next);
    try {
      const history = next.slice(0, -1).map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.role === 'ai' ? m.sv : m.text,
      }));
      const data = await sendChat({
        level: 'A1', scene: sceneRef.current?.sceneDesc || '',
        knownWords, knownGrammar, history, userMessage: text,
      });
      if (!callRef.current || phaseRef.current !== 'thinking') return;
      failRef.current = 0;
      const sv = data.reply_sv || '…';
      setMessages((ms) => [...ms, {
        id: 'ca' + ms.length + '-' + Date.now(), role: 'ai',
        sv, en: data.reply_en || '', showEn: false,
        correction: data.correction?.had_error ? data.correction.note : null,
      }]);
      callSpeak(sv);
    } catch (err) {
      if (!callRef.current || phaseRef.current !== 'thinking') return;
      failRef.current += 1;
      if (failRef.current >= MAX_FAIL) {
        endCall();
        setError('Lost the connection to the tutor — call ended.');
      } else {
        setError('Tutor unreachable — retrying…');
        scheduleListen(1500); // back off before listening again
      }
    }
  };

  const callSpeak = (sv) => {
    if (!callRef.current) return;
    setPhase('speaking');
    try { Speech.stop(); } catch {}
    const done = () => { clearWatchdog(); if (callRef.current && phaseRef.current === 'speaking') scheduleListen(); };
    // Watchdog first: some platforms (web speechSynthesis) can swallow onDone —
    // never let the loop freeze on 'speaking'.
    clearWatchdog();
    const ms = Math.min(15000, 1800 + (sv ? sv.length : 0) * 90);
    speakWatchdogRef.current = setTimeout(() => {
      speakWatchdogRef.current = null;
      if (callRef.current && phaseRef.current === 'speaking') scheduleListen();
    }, ms);
    try {
      Speech.speak(sv, { language: 'sv-SE', rate: 0.95, pitch: 1.0, onDone: done, onError: done });
    } catch (err) { done(); }
  };

  const startCall = async () => {
    if (callRef.current) return;
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm?.granted) {
        setError('🎤 Allow microphone & speech access in iPhone Settings to use hands-free voice.');
        return;
      }
    } catch (err) {
      setError('🎤 Hands-free voice is unavailable on this device.');
      return;
    }
    stopVoice();
    Keyboard.dismiss();
    setError(null);
    noResultRef.current = 0;
    failRef.current = 0;
    partialRef.current = '';
    setPartial('');
    justEndedCallRef.current = false;
    callRef.current = true;
    setCallActive(true);
    phaseRef.current = 'starting'; // drop the manual stop()'s trailing events
    callSubsRef.current = [
      ExpoSpeechRecognitionModule.addListener('result', onCallResult),
      ExpoSpeechRecognitionModule.addListener('end', onCallEnd),
      ExpoSpeechRecognitionModule.addListener('error', onCallError),
    ];
    scheduleListen(); // first listen after a settle delay
  };

  const endCall = () => {
    callRef.current = false;
    clearRestart();
    clearWatchdog();
    setPhase('idle');
    setCallActive(false);
    setPartial(''); partialRef.current = '';
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
    try { Speech.stop(); } catch {}
    callSubsRef.current.forEach((s) => { try { s.remove?.(); } catch {} });
    callSubsRef.current = [];
    // brief grace so stop()'s trailing 'result' can't leak into the manual input box
    justEndedCallRef.current = true;
    setTimeout(() => { justEndedCallRef.current = false; }, 700);
  };

  useEffect(() => () => { stopVoice(); endCall(); }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, loading]);

  // iOS: lift the input bar (and re-pin the chat) above the keyboard using its
  // real on-screen frame. RN's KeyboardAvoidingView mis-measures inside a
  // SafeAreaView (it ignores the notch's top inset), which left the input bar
  // clipped behind the keyboard — so we drive paddingBottom directly instead.
  // (Android resizes the window itself; web has no soft keyboard.)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const update = (e) => {
      const winH = Dimensions.get('window').height;
      const endY = e?.endCoordinates?.screenY ?? winH;
      setKbPad(Math.max(0, winH - endY));
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 0);
    };
    const reset = () => setKbPad(0);
    const subs = [
      Keyboard.addListener('keyboardWillChangeFrame', update),
      Keyboard.addListener('keyboardWillShow', update),
      Keyboard.addListener('keyboardWillHide', reset),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  // ---------- Scene picker ----------
  if (!scene) {
    return (
      <View style={styles.root}>
        <Header title="Talk in Swedish" backLabel="Home" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.pickerBody} keyboardShouldPersistTaps="handled">
          {/* free talk — always available, no fixed scene */}
          <Text style={styles.sectionLabel}>FREE TALK</Text>
          <View style={styles.sceneCard}>
            <Pressable style={styles.sceneMain} onPress={() => startScene(GENERAL_SCENE)}>
              <Text style={styles.sceneEmoji}>{GENERAL_SCENE.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sceneTitle}>{GENERAL_SCENE.title}</Text>
                <Text style={styles.sceneSub}>{GENERAL_SCENE.subtitle}</Text>
              </View>
            </Pressable>
          </View>

          {/* make your own */}
          <Text style={styles.sectionLabel}>MAKE YOUR OWN</Text>
          <View style={styles.makeRow}>
            <TextInput
              style={styles.makeInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="e.g. a job interview, ordering pizza…"
              placeholderTextColor={colors.muted}
              maxLength={120}
              editable={!customBusy}
              onSubmitEditing={startCustom}
              returnKeyType="go"
            />
            <Pressable
              onPress={startCustom}
              disabled={!customText.trim() || customBusy}
              style={({ pressed }) => [styles.makeBtn, (!customText.trim() || customBusy) && styles.btnDisabled, pressed && styles.pressed]}
            >
              {customBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.makeBtnText}>Start</Text>}
            </Pressable>
          </View>

          {/* saved */}
          {saved.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>SAVED</Text>
              {saved.map((s) => (
                <View key={s.id} style={styles.sceneCard}>
                  <Pressable style={styles.sceneMain} onPress={() => startScene(s)}>
                    <Text style={styles.sceneEmoji}>{s.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sceneTitle}>{s.title}</Text>
                      <Text style={styles.sceneSub}>{s.subtitle}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => doDelete(s.savedId)} hitSlop={8} style={styles.cardAction}><Text style={styles.cardActionIcon}>🗑</Text></Pressable>
                </View>
              ))}
            </>
          )}

          {/* suggested */}
          <View style={styles.sugHead}>
            <Text style={styles.sectionLabel}>SUGGESTED</Text>
            <Pressable onPress={loadSuggested} disabled={loadingSug} hitSlop={8}>
              <Text style={[styles.shuffle, loadingSug && styles.muted]}>{loadingSug ? 'Creating…' : '🔀 New'}</Text>
            </Pressable>
          </View>
          {!suggested && loadingSug ? (
            <View style={styles.center}><ActivityIndicator color={colors.blue} /><Text style={styles.centerText}>Creating fresh scenes…</Text></View>
          ) : (
            (suggested || []).map((s) => (
              <View key={s.id} style={styles.sceneCard}>
                <Pressable style={styles.sceneMain} onPress={() => startScene(s)}>
                  <Text style={styles.sceneEmoji}>{s.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sceneTitle}>{s.title}</Text>
                    <Text style={styles.sceneSub}>{s.subtitle}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => doSave(s)} hitSlop={8} style={styles.cardAction}><Text style={styles.cardActionIcon}>⭐</Text></Pressable>
              </View>
            ))
          )}
          {pickerError ? <Text style={styles.note}>{pickerError}</Text> : null}
        </ScrollView>
      </View>
    );
  }

  // ---------- Chat ----------
  return (
    <View style={[styles.root, { paddingBottom: kbPad }]}>
      <Header
        title={`${scene.emoji} ${scene.title}`}
        backLabel="Scenes"
        onBack={leaveScene}
        right={
          <Pressable onPress={saveCurrentScene} disabled={sceneSaved} hitSlop={8}>
            <Text style={[styles.saveScene, sceneSaved && styles.saveSceneDone]}>{sceneSaved ? '✓ Saved' : '⭐ Save'}</Text>
          </Pressable>
        }
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatBody}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
      >
        {messages.map((m) =>
          m.role === 'ai' ? (
            <AiBubble key={m.id} m={m} onToggle={() => toggleEn(m.id)} />
          ) : (
            <View key={m.id} style={styles.userRow}><View style={styles.userBubble}><Text style={styles.userText}>{m.text}</Text></View></View>
          )
        )}
        {loading && <View style={styles.aiRow}><View style={styles.aiBubble}><Text style={styles.typing}>•••</Text></View></View>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {callActive ? (
        <CallPanel state={callState} partial={partial} onEnd={endCall} />
      ) : (
        <>
          <Pressable onPress={startCall} style={({ pressed }) => [styles.callCta, pressed && styles.pressed]}>
            <Text style={styles.callCtaText}>📞  Start hands-free conversation</Text>
          </Pressable>
          <View style={styles.inputBar}>
            <Pressable onPress={startVoice} style={({ pressed }) => [styles.micBtn, listening && styles.micActive, pressed && styles.pressed]}>
              <Text style={{ fontSize: 18 }}>{listening ? '⏺' : '🎤'}</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={listening ? 'Lyssnar… (listening)' : 'Skriv på svenska…'}
              placeholderTextColor={colors.muted}
              editable={!loading}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable onPress={send} disabled={!input.trim() || loading} style={({ pressed }) => [styles.sendBtn, (!input.trim() || loading) && styles.btnDisabled, pressed && styles.pressed]}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function CallPanel({ state, partial, onEnd }) {
  const listening = state === 'listening' || state === 'starting';
  const label =
    listening ? '🎧  Listening…' :
    state === 'thinking' ? '💭  Thinking…' :
    state === 'speaking' ? '🗣️  Speaking…' : '…';
  const live = listening;
  return (
    <View style={styles.callPanel}>
      <View style={styles.callTopRow}>
        <View style={[styles.callDot, live && styles.callDotLive]} />
        <Text style={styles.callStatus}>{label}</Text>
      </View>
      <Text style={styles.callBody} numberOfLines={2}>
        {partial ? partial : 'Just talk — I’ll reply out loud, then listen again.'}
      </Text>
      <Pressable onPress={onEnd} style={({ pressed }) => [styles.callEndBtn, pressed && styles.pressed]}>
        <Text style={styles.callEndText}>✕  End call</Text>
      </Pressable>
    </View>
  );
}

function AiBubble({ m, onToggle }) {
  return (
    <View style={styles.aiRow}>
      <View style={styles.aiBubble}>
        <View style={styles.aiTop}>
          <Text style={styles.aiText}>{m.sv}</Text>
          <SpeakButton text={m.sv} />
        </View>
        <Pressable onPress={onToggle} hitSlop={6}><Text style={styles.translate}>{m.showEn ? m.en : 'Tap to translate'}</Text></Pressable>
        {m.correction ? <View style={styles.correction}><Text style={styles.correctionText}>✏️ {m.correction}</Text></View> : null}
      </View>
    </View>
  );
}

function Header({ title, onBack, backLabel = 'Back', right = null }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}><Text style={styles.back}>‹ {backLabel}</Text></Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.card,
  },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 74 },
  headerRight: { width: 74, alignItems: 'flex-end' },
  saveScene: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  saveSceneDone: { color: colors.green },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },

  pickerBody: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.muted, marginBottom: 10, marginTop: 8 },
  makeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  makeInput: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.line,
  },
  makeBtn: { backgroundColor: colors.blue, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: 'center', minWidth: 72, alignItems: 'center' },
  makeBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },

  sugHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shuffle: { color: colors.blue, fontWeight: '800', fontSize: 14 },
  center: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  centerText: { color: colors.muted, fontSize: 14 },

  sceneCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden',
  },
  sceneMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  sceneEmoji: { fontSize: 26 },
  sceneTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sceneSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardAction: { paddingHorizontal: 16, paddingVertical: 18, alignSelf: 'stretch', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.line },
  cardActionIcon: { fontSize: 18 },
  note: { fontSize: 12, color: colors.muted, marginTop: 8, textAlign: 'center' },
  muted: { color: colors.muted },

  chatBody: { padding: 16, paddingBottom: 24 },
  aiRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 },
  aiBubble: { maxWidth: '85%', backgroundColor: colors.card, borderRadius: 16, borderTopLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiText: { fontSize: 17, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  translate: { fontSize: 13, color: colors.blue, marginTop: 6, fontWeight: '600' },
  correction: { marginTop: 8, backgroundColor: '#FFF6E5', borderRadius: 8, padding: 8 },
  correctionText: { fontSize: 13, color: '#8a6d1a' },
  typing: { fontSize: 18, color: colors.muted, letterSpacing: 2 },

  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  userBubble: { maxWidth: '85%', backgroundColor: colors.blue, borderRadius: 16, borderTopRightRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  userText: { fontSize: 16, color: colors.white, fontWeight: '600' },

  error: { color: colors.red, fontSize: 13, textAlign: 'center', marginTop: 8 },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  micBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  micActive: { backgroundColor: '#FBE2E0', borderColor: colors.red },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  sendBtn: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 11 },
  btnDisabled: { backgroundColor: '#B9C6D2' },
  sendText: { color: colors.white, fontWeight: '800', fontSize: 15 },

  // hands-free call mode
  callCta: { alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  callCtaText: { color: colors.blue, fontWeight: '800', fontSize: 15 },
  callPanel: { padding: 18, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, alignItems: 'center', gap: 10 },
  callTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.muted },
  callDotLive: { backgroundColor: colors.red },
  callStatus: { fontSize: 17, fontWeight: '800', color: colors.ink },
  callBody: { fontSize: 15, color: colors.muted, textAlign: 'center', minHeight: 40 },
  callEndBtn: { backgroundColor: '#FBE2E0', borderRadius: radius.pill, paddingHorizontal: 24, paddingVertical: 11, borderWidth: 1, borderColor: colors.red },
  callEndText: { color: colors.red, fontWeight: '800', fontSize: 15 },

  pressed: { opacity: 0.85 },
});
