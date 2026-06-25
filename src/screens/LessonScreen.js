import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import SentenceBuilder from '../components/SentenceBuilder';
import SpeakButton from '../components/SpeakButton';

export default function LessonScreen({ lesson, onBack, onComplete }) {
  const builderCount = lesson.builder.length;
  const totalSteps = 2 + builderCount; // 0: grammar, 1: vocab, then one per builder
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => s + 1);
  const isDone = step >= totalSteps;
  const progress = Math.min(step / totalSteps, 1);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {step === 0 && <GrammarStep lesson={lesson} onNext={next} />}
        {step === 1 && <VocabStep lesson={lesson} onNext={next} />}
        {step >= 2 && step < totalSteps && (
          <View style={styles.card}>
            <Text style={styles.kicker}>SENTENCE BUILDER · {step - 1}/{builderCount}</Text>
            <SentenceBuilder item={lesson.builder[step - 2]} onCorrect={next} />
          </View>
        )}
        {isDone && <DoneStep lesson={lesson} onComplete={onComplete} />}
      </ScrollView>
    </View>
  );
}

function GrammarStep({ lesson, onNext }) {
  const g = lesson.grammar;
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>GRAMMAR NOTE</Text>
      <Text style={styles.cardTitle}>{g.title}</Text>
      {g.body.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
      <View style={styles.exampleBox}>
        {g.examples.map((ex, i) => (
          <View key={i} style={[styles.exampleRow, i > 0 && styles.exampleDivider]}>
            <View style={styles.rowLeft}>
              <SpeakButton text={ex.sv} />
              <Text style={styles.exampleSv}>{ex.sv}</Text>
            </View>
            <Text style={styles.exampleEn}>{ex.en}</Text>
          </View>
        ))}
      </View>
      <Cta title="Continue" onPress={onNext} />
    </View>
  );
}

function VocabStep({ lesson, onNext }) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>VOCABULARY · {lesson.vocab.length} WORDS</Text>
      <Text style={styles.cardTitle}>New words</Text>
      <View style={{ marginTop: 6 }}>
        {lesson.vocab.map((w, i) => (
          <View key={i} style={[styles.vocabRow, i > 0 && styles.exampleDivider]}>
            <View style={styles.rowLeft}>
              <SpeakButton text={w.sv} />
              <Text style={styles.vocabSv}>{w.sv}</Text>
            </View>
            <Text style={styles.vocabEn}>{w.en}</Text>
          </View>
        ))}
      </View>
      <Cta title="I know these — continue" onPress={onNext} />
    </View>
  );
}

function DoneStep({ lesson, onComplete }) {
  return (
    <View style={[styles.card, styles.doneCard]}>
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={styles.doneTitle}>Klart!</Text>
      <Text style={styles.doneSub}>
        You finished “{lesson.title}”. {lesson.done || ''}
      </Text>
      <Cta title="Finish lesson" onPress={onComplete} variant="accent" />
    </View>
  );
}

function Cta({ title, onPress, variant = 'primary' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cta, variant === 'accent' && styles.ctaAccent, pressed && styles.ctaPressed]}
    >
      <Text style={[styles.ctaText, variant === 'accent' && styles.ctaAccentText]}>{title}</Text>
    </Pressable>
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
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.blue, marginBottom: 8 },
  cardTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dot: { color: colors.blue, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink },
  exampleBox: { backgroundColor: '#F4F8FB', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 6, marginTop: 18 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  exampleDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  exampleSv: { fontSize: 16, fontWeight: '800', color: colors.blue },
  exampleEn: { fontSize: 14, color: colors.muted },
  vocabRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  vocabSv: { fontSize: 17, fontWeight: '800', color: colors.ink },
  vocabEn: { fontSize: 15, color: colors.muted },
  cta: { marginTop: 22, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ctaAccent: { backgroundColor: colors.yellow },
  ctaAccentText: { color: colors.ink },
  ctaPressed: { opacity: 0.85 },
  doneCard: { alignItems: 'center' },
  doneEmoji: { fontSize: 52 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  doneSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
