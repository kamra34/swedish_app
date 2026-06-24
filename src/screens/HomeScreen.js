import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import SwedishFlag from '../components/SwedishFlag';

export default function HomeScreen({ levels, lessons, completed, onOpenLesson }) {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <SwedishFlag width={72} />
        <Text style={styles.heroTitle}>Svenska</Text>
        <Text style={styles.heroSub}>Learn Swedish · A1 → C1</Text>
      </View>

      <Text style={styles.sectionLabel}>YOUR PATH</Text>
      <View style={styles.levelRow}>
        {levels.map((lv) => (
          <View key={lv.id} style={[styles.levelPill, lv.unlocked ? styles.levelActive : styles.levelLocked]}>
            <Text style={[styles.levelText, lv.unlocked ? styles.levelTextActive : styles.levelTextLocked]}>{lv.id}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>A1 · LESSONS</Text>
      {lessons.map((ls) => {
        const done = completed.includes(ls.id);
        return (
          <Pressable
            key={ls.id}
            disabled={!ls.unlocked}
            onPress={() => onOpenLesson(ls.id)}
            style={({ pressed }) => [styles.card, !ls.unlocked && styles.cardLocked, pressed && ls.unlocked && styles.cardPressed]}
          >
            <View style={[styles.badge, !ls.unlocked && styles.badgeLocked, done && styles.badgeDone]}>
              <Text style={styles.badgeText}>{done ? '✓' : ls.unlocked ? ls.index : '🔒'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, !ls.unlocked && styles.lockedText]}>{ls.title}</Text>
              <Text style={[styles.cardSub, !ls.unlocked && styles.lockedText]}>{ls.subtitle}</Text>
            </View>
            {ls.unlocked && !done && <Text style={styles.arrow}>›</Text>}
            {!ls.unlocked && <Text style={styles.soon}>soon</Text>}
          </Pressable>
        );
      })}

      <Text style={styles.footer}>More lessons unlock as you progress.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  hero: {
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 26,
  },
  heroTitle: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: 12, letterSpacing: 0.5 },
  heroSub: { color: '#CFE5F3', fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.muted, marginBottom: 10, marginTop: 6 },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  levelPill: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  levelActive: { backgroundColor: colors.blue },
  levelLocked: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  levelText: { fontWeight: '800', fontSize: 14 },
  levelTextActive: { color: colors.white },
  levelTextLocked: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardLocked: { backgroundColor: '#F4F7FA', opacity: 0.85 },
  cardPressed: { backgroundColor: '#F0F6FB' },
  badge: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: '#C7D2DD' },
  badgeDone: { backgroundColor: colors.green },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  lockedText: { color: colors.muted },
  arrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },
  soon: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 14 },
});
