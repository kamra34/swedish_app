import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../theme';
import { scenes as fallbackScenes } from '../data/scenes';
import { lessons } from '../data/courseData';
import { sendChat, fetchScenes } from '../api/chat';
import SpeakButton from '../components/SpeakButton';

export default function ConversationScreen({ onBack }) {
  const [scene, setScene] = useState(null);
  const [list, setList] = useState(null); // generated (or fallback) scene list
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [scenesNote, setScenesNote] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // What the AI partner may assume you know — from your unlocked lessons.
  const { knownWords, knownGrammar } = useMemo(() => {
    const unlocked = lessons.filter((l) => l.unlocked);
    return {
      knownWords: unlocked.flatMap((l) => (l.vocab || []).map((v) => v.sv)),
      knownGrammar: unlocked.flatMap((l) => l.grammar?.body || []),
    };
  }, []);

  // Ask the LLM for fresh, randomized scenes (falls back to built-ins offline).
  const loadScenes = useCallback(async () => {
    setLoadingScenes(true);
    setScenesNote(null);
    try {
      const nonce = String(Math.floor(Math.random() * 1e9));
      const data = await fetchScenes({ level: 'A1', knownWords, knownGrammar, nonce });
      const norm = (data.scenes || []).map((s, i) => ({
        id: 'gen' + i + '-' + nonce,
        emoji: s.emoji || '💬',
        title: s.title || 'Samtal',
        subtitle: s.subtitle || '',
        sceneDesc: s.scene_desc || '',
        opener: { sv: s.opener_sv || 'Hej!', en: s.opener_en || 'Hi!' },
      }));
      if (norm.length) setList(norm);
      else { setList(fallbackScenes); setScenesNote('Using built-in scenes.'); }
    } catch (e) {
      setList(fallbackScenes);
      setScenesNote('Offline — built-in scenes. (' + (e.message || 'network error') + ')');
    } finally {
      setLoadingScenes(false);
    }
  }, [knownWords, knownGrammar]);

  useEffect(() => { loadScenes(); }, [loadScenes]);

  const startScene = (s) => {
    stopVoice();
    setScene(s);
    setError(null);
    setMessages([{ id: 'opener', role: 'ai', sv: s.opener.sv, en: s.opener.en, showEn: false, correction: null }]);
  };

  const leaveScene = () => {
    stopVoice();
    setScene(null);
    setMessages([]);
    setInput('');
  };

  const toggleEn = (id) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, showEn: !m.showEn } : m)));

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
      const history = next
        .slice(0, -1)
        .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.role === 'ai' ? m.sv : m.text }));
      const data = await sendChat({
        level: 'A1', scene: scene.sceneDesc, knownWords, knownGrammar, history, userMessage: text,
      });
      setMessages((ms) => [
        ...ms,
        {
          id: 'a' + ms.length, role: 'ai',
          sv: data.reply_sv || '…', en: data.reply_en || '', showEn: false,
          correction: data.correction?.had_error ? data.correction.note : null,
        },
      ]);
    } catch (e) {
      setError('Could not reach the tutor — is the backend running? (' + (e.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  // --- Voice input (web Speech API; types as fallback elsewhere) ---
  const stopVoice = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    setListening(false);
  };

  const startVoice = () => {
    if (listening) { stopVoice(); return; }
    const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (Platform.OS !== 'web' || !SR) {
      setError('🎤 Voice works in the web preview (and on the phone after the next build). For now, just type your reply.');
      return;
    }
    const rec = new SR();
    rec.lang = 'sv-SE';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput(txt);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  };

  useEffect(() => () => stopVoice(), []); // stop on unmount

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, loading]);

  // ---------- Scene picker ----------
  if (!scene) {
    return (
      <View style={styles.root}>
        <Header title="Talk in Swedish" backLabel="Home" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.pickerBody}>
          <Text style={styles.pickerIntro}>
            Pick a scene and start chatting. Your AI partner stays at your level and gently corrects you. You can speak or type.
          </Text>

          <Pressable
            onPress={loadScenes}
            disabled={loadingScenes}
            style={({ pressed }) => [styles.shuffle, pressed && styles.pressed, loadingScenes && styles.shuffleDisabled]}
          >
            <Text style={styles.shuffleText}>{loadingScenes ? 'Creating…' : '🔀 New scenes'}</Text>
          </Pressable>

          {!list && loadingScenes ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} />
              <Text style={styles.centerText}>Creating fresh scenes for you…</Text>
            </View>
          ) : (
            (list || []).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => startScene(s)}
                style={({ pressed }) => [styles.sceneCard, pressed && styles.pressed]}
              >
                <Text style={styles.sceneEmoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sceneTitle}>{s.title}</Text>
                  <Text style={styles.sceneSub}>{s.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))
          )}
          {scenesNote ? <Text style={styles.note}>{scenesNote}</Text> : null}
        </ScrollView>
      </View>
    );
  }

  // ---------- Chat ----------
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={`${scene.emoji} ${scene.title}`} backLabel="Scenes" onBack={leaveScene} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.chatBody}>
        {messages.map((m) =>
          m.role === 'ai' ? (
            <AiBubble key={m.id} m={m} onToggle={() => toggleEn(m.id)} />
          ) : (
            <View key={m.id} style={styles.userRow}>
              <View style={styles.userBubble}><Text style={styles.userText}>{m.text}</Text></View>
            </View>
          )
        )}
        {loading && (
          <View style={styles.aiRow}><View style={styles.aiBubble}><Text style={styles.typing}>•••</Text></View></View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.inputBar}>
        <Pressable
          onPress={startVoice}
          style={({ pressed }) => [styles.micBtn, listening && styles.micActive, pressed && styles.pressed]}
        >
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
        <Pressable
          onPress={send}
          disabled={!input.trim() || loading}
          style={({ pressed }) => [styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
        <Pressable onPress={onToggle} hitSlop={6}>
          <Text style={styles.translate}>{m.showEn ? m.en : 'Tap to translate'}</Text>
        </Pressable>
        {m.correction ? (
          <View style={styles.correction}><Text style={styles.correctionText}>✏️ {m.correction}</Text></View>
        ) : null}
      </View>
    </View>
  );
}

function Header({ title, onBack, backLabel = 'Back' }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}><Text style={styles.back}>‹ {backLabel}</Text></Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 64 }} />
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
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },

  pickerBody: { padding: 20 },
  pickerIntro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 14 },
  shuffle: { alignSelf: 'flex-start', backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 16 },
  shuffleDisabled: { backgroundColor: '#B9C6D2' },
  shuffleText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  centerText: { color: colors.muted, fontSize: 14 },
  sceneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line,
  },
  sceneEmoji: { fontSize: 26 },
  sceneTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sceneSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  arrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },
  note: { fontSize: 12, color: colors.muted, marginTop: 8, textAlign: 'center' },

  chatBody: { padding: 16, paddingBottom: 24 },
  aiRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 },
  aiBubble: {
    maxWidth: '85%', backgroundColor: colors.card, borderRadius: 16, borderTopLeftRadius: 4,
    paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line,
  },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiText: { fontSize: 17, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  translate: { fontSize: 13, color: colors.blue, marginTop: 6, fontWeight: '600' },
  correction: { marginTop: 8, backgroundColor: '#FFF6E5', borderRadius: 8, padding: 8 },
  correctionText: { fontSize: 13, color: '#8a6d1a' },
  typing: { fontSize: 18, color: colors.muted, letterSpacing: 2 },

  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  userBubble: {
    maxWidth: '85%', backgroundColor: colors.blue, borderRadius: 16, borderTopRightRadius: 4,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  userText: { fontSize: 16, color: colors.white, fontWeight: '600' },

  error: { color: colors.red, fontSize: 13, textAlign: 'center', marginTop: 8 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card,
  },
  micBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  micActive: { backgroundColor: '#FBE2E0', borderColor: colors.red },
  input: {
    flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16,
    paddingVertical: 11, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line,
  },
  sendBtn: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 11 },
  sendDisabled: { backgroundColor: '#B9C6D2' },
  sendText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.85 },
});
