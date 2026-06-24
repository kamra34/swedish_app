// Tap-to-build sentence game. Tap words from the bank to place them in
// order; tap a placed word to send it back. Works with tap (iOS) and
// click (web). The core game that teaches Swedish word order.
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceBuilder({ item, onCorrect }) {
  const tokens = useMemo(() => item.answer.map((w, i) => ({ id: i, word: w })), [item]);
  const [bank, setBank] = useState(() => shuffle(tokens));
  const [picked, setPicked] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | wrong | correct

  useEffect(() => {
    setBank(shuffle(tokens));
    setPicked([]);
    setStatus('idle');
  }, [tokens]);

  const solved = status === 'correct';

  const pick = (tok) => {
    if (solved) return;
    setBank((b) => b.filter((t) => t.id !== tok.id));
    setPicked((p) => [...p, tok]);
    setStatus('idle');
  };
  const unpick = (tok) => {
    if (solved) return;
    setPicked((p) => p.filter((t) => t.id !== tok.id));
    setBank((b) => [...b, tok]);
    setStatus('idle');
  };
  const check = () =>
    setStatus(picked.map((t) => t.word).join(' ') === item.answer.join(' ') ? 'correct' : 'wrong');

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <Text style={styles.hint}>Hint: {item.hint}</Text>

      <View style={[styles.build, status === 'wrong' && styles.buildWrong, solved && styles.buildCorrect]}>
        {picked.length === 0 ? (
          <Text style={styles.placeholder}>Tap the words below, in order…</Text>
        ) : (
          picked.map((t) => (
            <Pressable key={t.id} onPress={() => unpick(t)} style={styles.chipPicked}>
              <Text style={styles.chipPickedText}>{t.word}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.bank}>
        {bank.map((t) => (
          <Pressable key={t.id} onPress={() => pick(t)} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <Text style={styles.chipText}>{t.word}</Text>
          </Pressable>
        ))}
        {bank.length === 0 && !solved && <Text style={styles.placeholder}>All words placed — press Check.</Text>}
      </View>

      {status === 'wrong' && <Text style={styles.wrongMsg}>Not quite — tap a placed word to remove it, then retry.</Text>}

      {solved && (
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Rätt! ✓</Text>
          <Text style={styles.tipText}>{item.tip}</Text>
        </View>
      )}

      {solved ? (
        <Pressable onPress={onCorrect} style={({ pressed }) => [styles.btn, styles.btnAccent, pressed && styles.btnPressed]}>
          <Text style={styles.btnAccentText}>Next  →</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={check}
          disabled={picked.length === 0}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, picked.length === 0 && styles.btnDisabled, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnPrimaryText}>Check</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { },
  prompt: { fontSize: 20, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  build: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  buildWrong: { borderColor: colors.red, backgroundColor: colors.redSoft, borderStyle: 'solid' },
  buildCorrect: { borderColor: colors.green, backgroundColor: colors.greenSoft, borderStyle: 'solid' },
  placeholder: { color: colors.muted, fontSize: 14, fontStyle: 'italic' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, minHeight: 44, alignItems: 'center' },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.blue,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipPressed: { backgroundColor: '#EAF3F9' },
  chipText: { color: colors.blue, fontWeight: '700', fontSize: 16 },
  chipPicked: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipPickedText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  wrongMsg: { color: colors.red, marginTop: 12, fontSize: 13, fontWeight: '600' },
  tipBox: { backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: 14, marginTop: 14 },
  tipTitle: { color: colors.green, fontWeight: '800', marginBottom: 4, fontSize: 15 },
  tipText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  btn: { marginTop: 18, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.blue },
  btnPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  btnAccent: { backgroundColor: colors.yellow },
  btnAccentText: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  btnDisabled: { backgroundColor: '#B9C6D2' },
  btnPressed: { opacity: 0.85 },
});
