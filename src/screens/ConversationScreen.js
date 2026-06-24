import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import { scenes } from '../data/scenes';
import { lessons } from '../data/courseData';
import { sendChat } from '../api/chat';
import SpeakButton from '../components/SpeakButton';

export default function ConversationScreen({ onBack }) {
  const [scene, setScene] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // What the AI partner is allowed to assume you know — drawn from unlocked lessons.
  const { knownWords, knownGrammar } = useMemo(() => {
    const unlocked = lessons.filter((l) => l.unlocked);
    return {
      knownWords: unlocked.flatMap((l) => (l.vocab || []).map((v) => v.sv)),
      knownGrammar: unlocked.flatMap((l) => l.grammar?.body || []),
    };
  }, []);

  const startScene = (s) => {
    setScene(s);
    setError(null);
    setMessages([{ id: 'opener', role: 'ai', sv: s.opener.sv, en: s.opener.en, showEn: false, correction: null }]);
  };

  const toggleEn = (id) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, showEn: !m.showEn } : m)));

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
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
        level: 'A1',
        scene: scene.sceneDesc,
        knownWords,
        knownGrammar,
        history,
        userMessage: text,
      });
      setMessages((ms) => [
        ...ms,
        {
          id: 'a' + ms.length,
          role: 'ai',
          sv: data.reply_sv || '…',
          en: data.reply_en || '',
          showEn: false,
          correction: data.correction?.had_error ? data.correction.note : null,
        },
      ]);
    } catch (e) {
      setError('Could not reach the tutor — is the backend running? (' + (e.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, loading]);

  // --- Scene picker ---
  if (!scene) {
    return (
      <View style={styles.root}>
        <Header title="Talk in Swedish" backLabel="Home" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.pickerBody}>
          <Text style={styles.pickerIntro}>
            Pick a scene and start chatting. Your AI partner stays at your level and gently corrects you.
          </Text>
          {scenes.map((s) => (
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
          ))}
        </ScrollView>
      </View>
    );
  }

  // --- Chat ---
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={`${scene.emoji} ${scene.title}`}
        backLabel="Scenes"
        onBack={() => { setScene(null); setMessages([]); }}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.chatBody}>
        {messages.map((m) =>
          m.role === 'ai' ? (
            <AiBubble key={m.id} m={m} onToggle={() => toggleEn(m.id)} />
          ) : (
            <View key={m.id} style={styles.userRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{m.text}</Text>
              </View>
            </View>
          )
        )}
        {loading && (
          <View style={styles.aiRow}>
            <View style={styles.aiBubble}>
              <Text style={styles.typing}>•••</Text>
            </View>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Skriv på svenska…"
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
          <View style={styles.correction}>
            <Text style={styles.correctionText}>✏️ {m.correction}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Header({ title, onBack, backLabel = 'Back' }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Text style={styles.back}>‹ {backLabel}</Text>
      </Pressable>
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
  pickerIntro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 18 },
  sceneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line,
  },
  sceneEmoji: { fontSize: 26 },
  sceneTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sceneSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  arrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },

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
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card,
  },
  input: {
    flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16,
    paddingVertical: 11, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line,
  },
  sendBtn: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 11 },
  sendDisabled: { backgroundColor: '#B9C6D2' },
  sendText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.85 },
});
