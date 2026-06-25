import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import { getSession } from '../data/curriculum/a1';
import { lessons } from '../data/courseData';
import { useAuth } from '../AuthContext';
import { teachStep, getSessionState, saveSessionState, askTeacher, getPractice } from '../api/chat';
import { speak } from '../speak';
import SpeakButton from '../components/SpeakButton';
import SentenceBuilder from '../components/SentenceBuilder';

// The teacher-led session player (PROJECT.md §15). Walks the student through the
// authored step plan; teaching steps stream Astrid's verified prose from /teach;
// every step has a "Fråga Astrid" bar; position + answers persist for resume.
export default function SessionPlayerScreen({ sessionId, onBack }) {
  const session = getSession(sessionId);
  const { progress } = useAuth();
  const knownWords = useMemo(() => {
    const done = new Set((progress || []).filter((p) => p.completed).map((p) => p.item_id));
    return lessons.filter((l) => done.has(l.id)).flatMap((l) => (l.vocab || []).map((v) => v.sv));
  }, [progress]);

  const [step, setStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await getSessionState(sessionId);
        if (d?.state) { setStep(Math.min(d.state.current_step || 0, (session?.steps.length || 1) - 1)); setStepData(d.state.step_data || {}); }
      } catch {}
      setLoading(false);
    })();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;
  const steps = session.steps;
  const total = steps.length;
  const cur = steps[step];
  const fact = session.grammarFacts?.[0] || null;

  const persist = (s, data, completed) => saveSessionState(sessionId, { currentStep: s, stepData: data, completed }).catch(() => {});
  const recordAndNext = (answer) => {
    const data = answer != null ? { ...stepData, [cur.id]: answer } : stepData;
    if (answer != null) setStepData(data);
    if (step >= total - 1) { persist(step, data, true); onBack(); return; }
    const next = step + 1;
    setStep(next); persist(next, data, false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ Course</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{session.title}</Text>
        <View style={{ width: 64 }} />
      </View>
      <View style={styles.dots}>
        {steps.map((s, i) => <View key={s.id} style={[styles.dot, i < step && styles.dotDone, i === step && styles.dotNow]} />)}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {(cur.kind === 'intro' || cur.kind === 'concept' || cur.kind === 'pitfall' || cur.kind === 'recap') && (
            <TeachStep key={cur.id} session={session} step={cur} fact={fact} knownWords={knownWords} onContinue={() => recordAndNext(null)} />
          )}
          {cur.kind === 'warmup' && <WarmupStep step={cur} onContinue={() => recordAndNext(null)} />}
          {cur.kind === 'check' && <CheckStep step={cur} saved={stepData[cur.id]} onDone={(r) => recordAndNext(r)} />}
          {cur.kind === 'drill' && <DrillStep step={cur} knownWords={knownWords} onDone={(r) => recordAndNext(r)} />}
          {cur.kind === 'produce' && <ProduceStep step={cur} onDone={() => recordAndNext({ done: true })} />}
          {cur.kind === 'complete' && <CompleteStep session={session} onFinish={() => recordAndNext(null)} />}
        </ScrollView>
      )}

      {/* Fråga Astrid bar */}
      {!loading && cur.kind !== 'complete' && (
        <Pressable onPress={() => setAskOpen(true)} style={({ pressed }) => [styles.askBar, pressed && styles.pressed]}>
          <Text style={styles.askBarText}>💬  Fråga Astrid</Text>
        </Pressable>
      )}
      <AstridSheet
        visible={askOpen} onClose={() => setAskOpen(false)}
        sessionId={sessionId} session={session} fact={fact} focus={cur.focus || cur.kind}
      />
    </View>
  );
}

// ── teaching step: Astrid's generated prose + authored structured bits ──
function TeachStep({ session, step, fact, knownWords, onContinue }) {
  const [blocks, setBlocks] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await teachStep({
          sessionId: session.id, stepId: step.id, version: session.version, level: session.level,
          focus: step.focus || '', facts: fact?.rule || '', examples: session.examplesSeed || [], knownWords,
        });
        if (alive) setBlocks(d.blocks || []);
      } catch { if (alive) setBlocks([]); }
    })();
    return () => { alive = false; };
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{kickerFor(step.kind)}</Text>
      {blocks === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.blue} /><Text style={styles.centerText}>Astrid is preparing…</Text></View>
      ) : (
        <>
          {blocks.map((b, i) => <Block key={i} b={b} />)}
          {step.kind === 'concept' && fact?.paradigm && <ParadigmTable p={fact.paradigm} />}
          {step.kind === 'pitfall' && (fact?.commonErrors || []).map((e, i) => (
            <View key={i} style={styles.errRow}>
              <Text style={styles.errWrong}>✗ {e.wrong}</Text>
              <Text style={styles.errRight}>✓ {e.right}</Text>
              <Text style={styles.errWhy}>{e.why}</Text>
            </View>
          ))}
          <Cta title="Continue" onPress={onContinue} />
        </>
      )}
    </View>
  );
}
function Block({ b }) {
  if (b.type === 'example') return (
    <View style={styles.exampleRow}>
      <SpeakButton text={b.sv} />
      <View style={{ flex: 1 }}><Text style={styles.exampleSv}>{b.sv}</Text><Text style={styles.exampleEn}>{b.en}</Text></View>
    </View>
  );
  if (b.type === 'tip') return <View style={styles.tip}><Text style={styles.tipText}>💡 {b.text}</Text></View>;
  return <Text style={styles.prose}>{b.text}</Text>;
}
function ParadigmTable({ p }) {
  return (
    <View style={styles.table}>
      {p.caption ? <Text style={styles.tableCap}>{p.caption}</Text> : null}
      {p.rows.map((r, i) => (
        <View key={i} style={[styles.tableRow, i > 0 && styles.tableDivider]}>
          {r.map((c, j) => <Text key={j} style={[styles.tableCell, j === 0 && styles.tableCellFirst]}>{c}</Text>)}
        </View>
      ))}
    </View>
  );
}

function WarmupStep({ step, onContinue }) {
  const [shown, setShown] = useState(false);
  const r = step.recall || {};
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>QUICK RECALL</Text>
      <Text style={styles.prose}>{r.prompt_en}</Text>
      {shown ? (
        <View style={styles.exampleRow}><SpeakButton text={r.answer_sv} /><View style={{ flex: 1 }}><Text style={styles.exampleSv}>{r.answer_sv}</Text>{r.note ? <Text style={styles.exampleEn}>{r.note}</Text> : null}</View></View>
      ) : (
        <Pressable onPress={() => setShown(true)} style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}><Text style={styles.revealText}>Tap to reveal</Text></Pressable>
      )}
      {shown && <Cta title="Continue" onPress={onContinue} />}
    </View>
  );
}

function CheckStep({ step, onDone }) {
  const [picked, setPicked] = useState(null);
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>QUICK CHECK</Text>
      <Text style={styles.question}>{step.question}</Text>
      <View style={{ marginTop: 14, gap: 10 }}>
        {step.options.map((o, i) => {
          const showRight = picked != null && i === step.answer;
          const showWrong = picked === i && i !== step.answer;
          return (
            <Pressable key={i} disabled={picked != null} onPress={() => setPicked(i)}
              style={({ pressed }) => [styles.option, showRight && styles.optRight, showWrong && styles.optWrong, pressed && picked == null && styles.pressed]}>
              <Text style={styles.optionText}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked != null && (
        <View style={styles.feedback}>
          <Text style={[styles.feedbackText, picked === step.answer ? styles.ok : styles.no]}>
            {picked === step.answer ? step.explain_right : step.explain_wrong}
          </Text>
          <Cta title="Continue" onPress={() => onDone({ choice: picked, correct: picked === step.answer })} />
        </View>
      )}
    </View>
  );
}

function DrillStep({ step, knownWords, onDone }) {
  const spec = step.drill || {};
  const [items, setItems] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const isTap = spec.type === 'en_ett';

  const load = async () => {
    setItems(null); setI(0); setPicked(null); setTyped(''); setAnswered(false); setCorrect(0);
    try {
      const d = await getPractice({ type: spec.type, count: spec.count || 4, knownWords: spec.seedWords || knownWords });
      setItems(d.items || []);
    } catch { setItems([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items === null) return <View style={styles.card}><View style={styles.center}><ActivityIndicator color={colors.blue} /><Text style={styles.centerText}>Loading practice…</Text></View></View>;
  if (!items.length) return <View style={styles.card}><Text style={styles.prose}>Practice unavailable right now.</Text><Cta title="Continue" onPress={() => onDone({ skipped: true })} /></View>;

  const it = items[i];
  const ansText = isTap ? it.article : (spec.type === 'verb_conj' ? it.present : it.answer);
  const norm = (s) => String(s || '').trim().toLowerCase();
  const grade = (ok, spoken) => { setAnswered(true); if (ok) setCorrect((c) => c + 1); if (spoken) speak(spoken); };
  const tap = (a) => { if (answered) return; setPicked(a); grade(a === it.article, `${it.article} ${it.noun}`); };
  const check = () => { if (answered || !typed.trim()) return; grade(norm(typed) === norm(ansText), ansText); };
  const next = () => {
    if (i + 1 >= items.length) { onDone({ correct, total: items.length }); return; }
    setI(i + 1); setPicked(null); setTyped(''); setAnswered(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>PRACTICE · {i + 1}/{items.length}</Text>
      {isTap ? (
        <>
          <View style={styles.promptRow}><Text style={styles.blank}>___ </Text><Text style={styles.bigWord}>{it.noun}</Text></View>
          <Text style={styles.gloss}>({it.en})</Text>
          <View style={styles.choices}>
            {['en', 'ett'].map((a) => {
              const showRight = answered && it.article === a; const showWrong = picked === a && it.article !== a;
              return <Pressable key={a} disabled={answered} onPress={() => tap(a)} style={({ pressed }) => [styles.choice, showRight && styles.optRight, showWrong && styles.optWrong, pressed && !answered && styles.pressed]}><Text style={styles.choiceText}>{a}</Text></Pressable>;
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.bigWord}>{it.infinitive || it.base || (it.before + ' ___ ' + it.after)}</Text>
          <Text style={styles.gloss}>({it.en || it.hint})</Text>
          <View style={styles.typedRow}><TextInput style={[styles.typedInput, answered && styles.typedDone]} value={typed} onChangeText={setTyped} editable={!answered} autoCapitalize="none" autoCorrect={false} placeholder="…" placeholderTextColor={colors.muted} onSubmitEditing={check} returnKeyType="done" /></View>
          {!answered && <Cta title="Check" onPress={check} disabled={!typed.trim()} />}
        </>
      )}
      {answered && (
        <View style={styles.feedback}>
          <Text style={[styles.feedbackText, (isTap ? picked === it.article : norm(typed) === norm(ansText)) ? styles.ok : styles.no]}>
            {(isTap ? picked === it.article : norm(typed) === norm(ansText)) ? '✓ Rätt!' : `✗ — ${isTap ? it.article + ' ' + it.noun : ansText}`}
          </Text>
          <Cta title={i + 1 >= items.length ? 'Done' : 'Next'} onPress={next} />
        </View>
      )}
    </View>
  );
}

function ProduceStep({ step, onDone }) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>NOW YOU TRY</Text>
      <SentenceBuilder item={step.builder} onCorrect={onDone} />
    </View>
  );
}

function CompleteStep({ session, onFinish }) {
  return (
    <View style={[styles.card, styles.doneCard]}>
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={styles.doneTitle}>Klart!</Text>
      <Text style={styles.doneSub}>{(session.steps.find((s) => s.kind === 'complete') || {}).outcome || session.canDo}</Text>
      <Cta title="Finish session" onPress={onFinish} variant="accent" />
    </View>
  );
}

// ── Fråga Astrid bottom sheet ──
function AstridSheet({ visible, onClose, sessionId, session, fact, focus }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const chips = ['Why?', 'More examples', 'Say it slower'];

  const send = async (q) => {
    const text = (q || input).trim();
    if (!text || busy) return;
    setInput(''); setBusy(true);
    const history = msgs.map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text }]);
    try {
      const d = await askTeacher(sessionId, { level: session.level, sessionTitle: session.title, facts: fact?.rule || '', focus, question: text, history });
      setMsgs((m) => [...m, { role: 'assistant', text: d.answer, ex_sv: d.example_sv, ex_en: d.example_en }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'Sorry — I couldn’t answer just now. Try again in a moment.' }]);
    } finally { setBusy(false); setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>👩‍🏫 Fråga Astrid</Text>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.sheetClose}>Close</Text></Pressable>
          </View>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {msgs.length === 0 && <Text style={styles.sheetHint}>Ask anything about this step — in English or Swedish.</Text>}
            {msgs.map((m, i) => (
              <View key={i} style={m.role === 'user' ? styles.uRow : styles.aRow}>
                <View style={m.role === 'user' ? styles.uBub : styles.aBub}>
                  <Text style={m.role === 'user' ? styles.uText : styles.aText}>{m.text}</Text>
                  {m.ex_sv ? <View style={styles.exampleRow}><SpeakButton text={m.ex_sv} /><View style={{ flex: 1 }}><Text style={styles.exampleSv}>{m.ex_sv}</Text><Text style={styles.exampleEn}>{m.ex_en}</Text></View></View> : null}
                </View>
              </View>
            ))}
            {busy && <Text style={styles.typing}>•••</Text>}
          </ScrollView>
          <View style={styles.chips}>{chips.map((c) => <Pressable key={c} onPress={() => send(c)} style={styles.chip}><Text style={styles.chipText}>{c}</Text></Pressable>)}</View>
          <View style={styles.sheetInputRow}>
            <TextInput style={styles.sheetInput} value={input} onChangeText={setInput} placeholder="Type a question…" placeholderTextColor={colors.muted} onSubmitEditing={() => send()} returnKeyType="send" />
            <Pressable onPress={() => send()} disabled={!input.trim() || busy} style={({ pressed }) => [styles.sheetSend, (!input.trim() || busy) && styles.disabled, pressed && styles.pressed]}><Text style={styles.sheetSendText}>Ask</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const kickerFor = (k) => k === 'intro' ? 'WELCOME' : k === 'concept' ? 'LEARN' : k === 'pitfall' ? 'WATCH OUT' : k === 'recap' ? 'RECAP' : 'LESSON';
function Cta({ title, onPress, disabled, variant = 'primary' }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.cta, variant === 'accent' && styles.ctaAccent, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.ctaText, variant === 'accent' && styles.ctaAccentText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.ink },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', paddingBottom: 8, paddingHorizontal: 16, flexWrap: 'wrap' },
  dot: { width: 16, height: 5, borderRadius: 3, backgroundColor: colors.line },
  dotDone: { backgroundColor: colors.green },
  dotNow: { backgroundColor: colors.blue },
  body: { padding: 18, paddingBottom: 90 },
  center: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  centerText: { color: colors.muted, fontSize: 14 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.blue, marginBottom: 12 },
  prose: { fontSize: 16, lineHeight: 24, color: colors.ink, marginBottom: 12 },
  tip: { backgroundColor: '#FFF6E5', borderRadius: radius.md, padding: 12, marginBottom: 12 },
  tipText: { fontSize: 14, color: '#8a6d1a', lineHeight: 20 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F4F8FB', borderRadius: radius.md, padding: 12, marginBottom: 10 },
  exampleSv: { fontSize: 16, fontWeight: '800', color: colors.blue },
  exampleEn: { fontSize: 13, color: colors.muted, marginTop: 1 },

  table: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden', marginVertical: 6 },
  tableCap: { fontSize: 12, fontWeight: '800', color: colors.muted, padding: 8, backgroundColor: '#F4F7FA' },
  tableRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10 },
  tableDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  tableCell: { flex: 1, fontSize: 13, color: colors.ink },
  tableCellFirst: { fontWeight: '800' },

  errRow: { marginTop: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.line },
  errWrong: { color: colors.red, fontWeight: '800', fontSize: 15 },
  errRight: { color: colors.green, fontWeight: '800', fontSize: 15, marginTop: 2 },
  errWhy: { color: colors.muted, fontSize: 13, marginTop: 4 },

  question: { fontSize: 18, fontWeight: '800', color: colors.ink },
  option: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 16, borderWidth: 1.5, borderColor: colors.line },
  optRight: { backgroundColor: '#E7F7EE', borderColor: colors.green },
  optWrong: { backgroundColor: '#FBE2E0', borderColor: colors.red },
  optionText: { fontSize: 17, fontWeight: '700', color: colors.ink },

  promptRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 4 },
  blank: { fontSize: 28, fontWeight: '800', color: colors.muted },
  bigWord: { fontSize: 28, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  gloss: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 4 },
  choices: { flexDirection: 'row', gap: 12, marginTop: 20 },
  choice: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line },
  choiceText: { fontSize: 21, fontWeight: '800', color: colors.ink },
  typedRow: { alignItems: 'center', marginTop: 16 },
  typedInput: { minWidth: 160, backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  typedDone: { borderColor: colors.blue },

  feedback: { marginTop: 16 },
  feedbackText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  ok: { color: colors.green },
  no: { color: colors.red },
  reveal: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.line, marginTop: 6 },
  revealText: { color: colors.blue, fontWeight: '800' },

  cta: { marginTop: 18, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  ctaAccent: { backgroundColor: colors.yellow },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ctaAccentText: { color: colors.ink },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  doneCard: { alignItems: 'center' },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 6 },
  doneSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  askBar: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  askBarText: { color: colors.white, fontWeight: '800', fontSize: 15 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '82%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sheetClose: { color: colors.blue, fontWeight: '700' },
  sheetBody: { padding: 16, gap: 4 },
  sheetHint: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 10 },
  uRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  aRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  uBub: { maxWidth: '85%', backgroundColor: colors.blue, borderRadius: 16, borderTopRightRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  aBub: { maxWidth: '90%', backgroundColor: colors.card, borderRadius: 16, borderTopLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  uText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  aText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  typing: { fontSize: 18, color: colors.muted, letterSpacing: 2, paddingLeft: 8 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 6, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  chipText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  sheetInputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  sheetInput: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  sheetSend: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 18, justifyContent: 'center' },
  sheetSendText: { color: colors.white, fontWeight: '800' },
});
