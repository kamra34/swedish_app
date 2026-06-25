import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, StyleSheet, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import { getPractice } from '../api/chat';
import { useAuth } from '../AuthContext';
import { lessons } from '../data/courseData';
import { speak } from '../speak';
import SpeakButton from '../components/SpeakButton';

// Phase-1 practice runner: a menu of drill types, each fed by the backend
// generate → QA → cache engine (POST /practice). Same shell hosts future types.
const DRILLS = [
  { type: 'en_ett', emoji: '⚖️', title: 'En eller ett?', sub: 'Noun genders' },
  { type: 'verb_conj', emoji: '🏃', title: 'Verb i presens', sub: 'Conjugate verbs (present tense)' },
];

export default function PracticeScreen({ onBack }) {
  const { progress } = useAuth();
  const knownWords = useMemo(() => {
    const doneIds = new Set((progress || []).filter((p) => p.completed).map((p) => p.item_id));
    return lessons.filter((l) => doneIds.has(l.id)).flatMap((l) => (l.vocab || []).map((v) => v.sv));
  }, [progress]);

  const [drill, setDrill] = useState(null); // selected drill type, or null = menu

  if (!drill) {
    return (
      <View style={styles.root}>
        <Header title="Practice" onBack={onBack} backLabel="Home" />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.kicker}>CHOOSE A DRILL</Text>
          {DRILLS.map((d) => (
            <Pressable
              key={d.type}
              onPress={() => setDrill(d.type)}
              style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
            >
              <Text style={styles.menuEmoji}>{d.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{d.title}</Text>
                <Text style={styles.menuSub}>{d.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
          <Text style={styles.note}>Each set is freshly generated and checked by a Swedish-teacher AI.</Text>
        </ScrollView>
      </View>
    );
  }

  return <DrillRunner key={drill} type={drill} knownWords={knownWords} onExit={() => setDrill(null)} />;
}

function DrillRunner({ type, knownWords, onExit }) {
  const meta = DRILLS.find((d) => d.type === type) || {};
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState(null);   // en_ett
  const [typed, setTyped] = useState('');         // verb_conj
  const [wasRight, setWasRight] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error | done
  const inputRef = useRef(null);

  const load = async () => {
    setStatus('loading');
    setItems([]); setIdx(0); reset(); setCorrect(0);
    try {
      const d = await getPractice({ type, count: 8, knownWords });
      if (d.items && d.items.length) { setItems(d.items); setStatus('ready'); }
      else setStatus('error');
    } catch { setStatus('error'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setAnswered(false); setPicked(null); setTyped(''); setWasRight(false); };
  const item = items[idx];

  const norm = (s) => String(s || '').trim().toLowerCase().replace(/^(jag|du|han|hon|vi|ni|de)\s+/i, '');

  const grade = (ok, spoken) => { setAnswered(true); setWasRight(ok); if (ok) setCorrect((c) => c + 1); if (spoken) speak(spoken); };
  const pickEnEtt = (a) => { if (answered || !item) return; setPicked(a); grade(a === item.article, `${item.article} ${item.noun}`); };
  const checkVerb = () => { if (answered || !item || !typed.trim()) return; grade(norm(typed) === norm(item.present), `jag ${item.present}`); };

  const next = () => {
    if (idx + 1 >= items.length) setStatus('done');
    else { setIdx((i) => i + 1); reset(); }
  };

  return (
    <View style={styles.root}>
      <Header title={meta.title || 'Practice'} onBack={onExit} backLabel="Drills" />
      {(status === 'ready' || status === 'done') && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((status === 'done' ? items.length : idx) / Math.max(items.length, 1)) * 100}%` }]} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} />
            <Text style={styles.centerText}>Creating fresh practice…</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.center}>
            <Text style={styles.centerText}>Couldn’t load practice. Check the connection and try again.</Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>Try again</Text></Pressable>
          </View>
        )}

        {status === 'ready' && item && (
          <View style={styles.card}>
            {type === 'en_ett' ? (
              <>
                <Text style={styles.kicker}>PICK THE ARTICLE · {idx + 1}/{items.length}</Text>
                <View style={styles.promptRow}><Text style={styles.blank}>___ </Text><Text style={styles.noun}>{item.noun}</Text></View>
                <Text style={styles.gloss}>({item.en})</Text>
                <View style={styles.choices}>
                  {['en', 'ett'].map((a) => {
                    const showRight = answered && item.article === a;
                    const showWrong = picked === a && item.article !== a;
                    return (
                      <Pressable key={a} onPress={() => pickEnEtt(a)} disabled={answered}
                        style={({ pressed }) => [styles.choice, showRight && styles.choiceRight, showWrong && styles.choiceWrong, pressed && !answered && styles.pressed]}>
                        <Text style={styles.choiceText}>{a}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.kicker}>PRESENT TENSE · {idx + 1}/{items.length}</Text>
                <Text style={styles.noun}>{item.infinitive}</Text>
                <Text style={styles.gloss}>({item.en})</Text>
                <View style={styles.verbRow}>
                  <Text style={styles.verbLead}>jag</Text>
                  <TextInput
                    ref={inputRef}
                    style={[styles.verbInput, answered && (wasRight ? styles.verbInputRight : styles.verbInputWrong)]}
                    value={typed}
                    onChangeText={setTyped}
                    editable={!answered}
                    placeholder="…"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={checkVerb}
                    returnKeyType="done"
                  />
                </View>
                {!answered && (
                  <Pressable onPress={checkVerb} disabled={!typed.trim()} style={({ pressed }) => [styles.cta, !typed.trim() && styles.ctaDisabled, pressed && styles.pressed]}>
                    <Text style={styles.ctaText}>Check</Text>
                  </Pressable>
                )}
              </>
            )}

            {answered && (
              <View style={styles.feedback}>
                <View style={styles.feedbackTop}>
                  <Text style={[styles.feedbackMark, wasRight ? styles.ok : styles.no]}>{wasRight ? '✓ Rätt!' : '✗ Inte riktigt'}</Text>
                  <SpeakButton text={type === 'en_ett' ? `${item.article} ${item.noun}` : `jag ${item.present}`} />
                </View>
                <Text style={styles.feedbackText}>
                  {type === 'en_ett'
                    ? <>It’s <Text style={styles.feedbackStrong}>{item.article} {item.noun}</Text> — {item.en}.</>
                    : <>It’s <Text style={styles.feedbackStrong}>jag {item.present}</Text> ({item.infinitive}, {item.en}).</>}
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
            <Text style={styles.doneSub}>{correct === items.length ? 'Perfect — that set is yours!' : 'Nice work. The more you practise, the more it sticks.'}</Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>Practise again</Text></Pressable>
            <Pressable onPress={onExit} style={({ pressed }) => [styles.ctaGhost, pressed && styles.pressed]}><Text style={styles.ctaGhostText}>Back to drills</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack, backLabel }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ {backLabel}</Text></Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 64 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },
  track: { height: 6, backgroundColor: colors.line, borderRadius: radius.pill, marginHorizontal: 16 },
  fill: { height: 6, backgroundColor: colors.green, borderRadius: radius.pill },
  body: { padding: 18, paddingBottom: 48 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.blue, marginBottom: 14 },
  note: { fontSize: 12, color: colors.muted, marginTop: 16, textAlign: 'center' },

  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.md, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  menuEmoji: { fontSize: 26 },
  menuTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  menuSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  menuArrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },

  center: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  centerText: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.line },
  promptRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 6 },
  blank: { fontSize: 30, fontWeight: '800', color: colors.muted },
  noun: { fontSize: 30, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  gloss: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 4 },

  choices: { flexDirection: 'row', gap: 12, marginTop: 24 },
  choice: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line },
  choiceRight: { backgroundColor: '#E7F7EE', borderColor: colors.green },
  choiceWrong: { backgroundColor: '#FBE2E0', borderColor: colors.red },
  choiceText: { fontSize: 22, fontWeight: '800', color: colors.ink },

  verbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22 },
  verbLead: { fontSize: 22, fontWeight: '700', color: colors.muted },
  verbInput: { minWidth: 150, backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  verbInputRight: { backgroundColor: '#E7F7EE', borderColor: colors.green },
  verbInputWrong: { backgroundColor: '#FBE2E0', borderColor: colors.red },

  feedback: { marginTop: 22 },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedbackMark: { fontSize: 17, fontWeight: '800' },
  ok: { color: colors.green },
  no: { color: colors.red },
  feedbackText: { fontSize: 16, color: colors.ink, marginTop: 8, lineHeight: 22 },
  feedbackStrong: { fontWeight: '800', color: colors.blue },

  cta: { marginTop: 20, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  ctaDisabled: { backgroundColor: '#B9C6D2' },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ctaGhost: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  ctaGhostText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.85 },
  doneCard: { alignItems: 'center' },
  doneEmoji: { fontSize: 52 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  doneSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
