import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { getPractice } from '../api/chat';
import { useAuth } from '../AuthContext';
import { lessons } from '../data/courseData';
import { speak } from '../speak';
import SpeakButton from '../components/SpeakButton';

// Phase-1 practice runner. For now: the en/ett gender drill, fed by the backend
// generate→QA engine (POST /practice). Same shell will host more drill types.
export default function PracticeScreen({ onBack }) {
  const { progress } = useAuth();
  const knownWords = useMemo(() => {
    const doneIds = new Set((progress || []).filter((p) => p.completed).map((p) => p.item_id));
    return lessons.filter((l) => doneIds.has(l.id)).flatMap((l) => (l.vocab || []).map((v) => v.sv));
  }, [progress]);

  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null); // 'en' | 'ett' | null
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error | done

  const load = async () => {
    setStatus('loading');
    setItems([]); setIdx(0); setPicked(null); setCorrect(0);
    try {
      const d = await getPractice({ type: 'en_ett', count: 8, knownWords });
      if (d.items && d.items.length) { setItems(d.items); setStatus('ready'); }
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const item = items[idx];

  const pick = (a) => {
    if (picked || !item) return;
    setPicked(a);
    if (a === item.article) setCorrect((c) => c + 1);
    speak(`${item.article} ${item.noun}`); // hear the correct form
  };
  const next = () => {
    if (idx + 1 >= items.length) setStatus('done');
    else { setIdx((i) => i + 1); setPicked(null); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ Home</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>En eller ett?</Text>
        <View style={{ width: 60 }} />
      </View>

      {status === 'ready' || status === 'done' ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((status === 'done' ? items.length : idx) / Math.max(items.length, 1)) * 100}%` }]} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} />
            <Text style={styles.centerText}>Creating fresh practice…</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.center}>
            <Text style={styles.centerText}>Couldn’t load practice. Check the connection and try again.</Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && item && (
          <View style={styles.card}>
            <Text style={styles.kicker}>PICK THE ARTICLE · {idx + 1}/{items.length}</Text>
            <View style={styles.promptRow}>
              <Text style={styles.blank}>___ </Text>
              <Text style={styles.noun}>{item.noun}</Text>
            </View>
            <Text style={styles.gloss}>({item.en})</Text>

            <View style={styles.choices}>
              {['en', 'ett'].map((a) => {
                const isPicked = picked === a;
                const isAnswer = item.article === a;
                const showRight = picked && isAnswer;
                const showWrong = isPicked && !isAnswer;
                return (
                  <Pressable
                    key={a}
                    onPress={() => pick(a)}
                    disabled={!!picked}
                    style={({ pressed }) => [
                      styles.choice,
                      showRight && styles.choiceRight,
                      showWrong && styles.choiceWrong,
                      pressed && !picked && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.choiceText, (showRight || showWrong) && styles.choiceTextOn]}>{a}</Text>
                  </Pressable>
                );
              })}
            </View>

            {picked && (
              <View style={styles.feedback}>
                <View style={styles.feedbackTop}>
                  <Text style={[styles.feedbackMark, picked === item.article ? styles.ok : styles.no]}>
                    {picked === item.article ? '✓ Rätt!' : '✗ Inte riktigt'}
                  </Text>
                  <SpeakButton text={`${item.article} ${item.noun}`} />
                </View>
                <Text style={styles.feedbackText}>
                  It’s <Text style={styles.feedbackStrong}>{item.article} {item.noun}</Text> — {item.en}.
                </Text>
                <Pressable onPress={next} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
                  <Text style={styles.ctaText}>{idx + 1 >= items.length ? 'See result' : 'Next'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {status === 'done' && (
          <View style={[styles.card, styles.doneCard]}>
            <Text style={styles.doneEmoji}>{correct === items.length ? '🌟' : '💪'}</Text>
            <Text style={styles.doneTitle}>{correct} / {items.length} rätt</Text>
            <Text style={styles.doneSub}>
              {correct === items.length
                ? 'Perfect — you’ve got the en/ett of these!'
                : 'Nice work. The more you practise, the more the genders stick.'}
            </Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>Practise again</Text>
            </Pressable>
            <Pressable onPress={onBack} style={({ pressed }) => [styles.ctaGhost, pressed && styles.pressed]}>
              <Text style={styles.ctaGhostText}>Done</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 60 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },
  track: { height: 6, backgroundColor: colors.line, borderRadius: radius.pill, marginHorizontal: 16 },
  fill: { height: 6, backgroundColor: colors.green, borderRadius: radius.pill },
  body: { padding: 18, paddingBottom: 48 },
  center: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  centerText: { color: colors.muted, fontSize: 15, textAlign: 'center' },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.line },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.blue, marginBottom: 14 },
  promptRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 6 },
  blank: { fontSize: 30, fontWeight: '800', color: colors.muted },
  noun: { fontSize: 32, fontWeight: '800', color: colors.ink },
  gloss: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 4 },

  choices: { flexDirection: 'row', gap: 12, marginTop: 24 },
  choice: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line },
  choiceRight: { backgroundColor: '#E7F7EE', borderColor: colors.green },
  choiceWrong: { backgroundColor: '#FBE2E0', borderColor: colors.red },
  choiceText: { fontSize: 22, fontWeight: '800', color: colors.ink },
  choiceTextOn: { color: colors.ink },

  feedback: { marginTop: 22 },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedbackMark: { fontSize: 17, fontWeight: '800' },
  ok: { color: colors.green },
  no: { color: colors.red },
  feedbackText: { fontSize: 16, color: colors.ink, marginTop: 8, lineHeight: 22 },
  feedbackStrong: { fontWeight: '800', color: colors.blue },

  cta: { marginTop: 20, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ctaGhost: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  ctaGhostText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.85 },

  doneCard: { alignItems: 'center' },
  doneEmoji: { fontSize: 52 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  doneSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
