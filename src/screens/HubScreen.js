import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import SwedishFlag from '../components/SwedishFlag';
import { lessons as allLessons } from '../data/courseData';
import { useAuth } from '../AuthContext';

const COACHES = [
  { id: 'talking', emoji: '🗣️', title: 'Talking coach', sub: 'Practise speaking', ready: true },
  { id: 'grammar', emoji: '📖', title: 'Grammar coach', sub: 'Rules & drills', ready: false },
  { id: 'listening', emoji: '🎧', title: 'Listening coach', sub: 'Hear & answer', ready: false },
  { id: 'reading', emoji: '📚', title: 'Reading coach', sub: 'Read & answer', ready: false },
];

export default function HubScreen({ onOpenConversation, onOpenLesson }) {
  const { user, progress, logout } = useAuth();
  const level = user?.current_level || 'A1';
  const name = user?.display_name || (user?.email ? user.email.split('@')[0] : 'där');
  const completed = new Set(progress.filter((p) => p.completed).map((p) => p.item_id));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.who}>
          <SwedishFlag width={40} />
          <View>
            <Text style={styles.hej}>Hej, {name}!</Text>
            <Text style={styles.levelLine}>Level {level}</Text>
          </View>
        </View>
        <Pressable onPress={logout} hitSlop={8}><Text style={styles.signout}>Sign out</Text></Pressable>
      </View>

      <Text style={styles.sectionLabel}>YOUR COACHES</Text>
      <View style={styles.coachGrid}>
        {COACHES.map((c) => (
          <Pressable
            key={c.id}
            disabled={!c.ready}
            onPress={() => c.id === 'talking' && onOpenConversation()}
            style={({ pressed }) => [styles.coach, !c.ready && styles.coachLocked, pressed && c.ready && styles.pressed]}
          >
            <Text style={styles.coachEmoji}>{c.emoji}</Text>
            <Text style={[styles.coachTitle, !c.ready && styles.muted]}>{c.title}</Text>
            <Text style={[styles.coachSub, !c.ready && styles.muted]}>{c.ready ? c.sub : 'Coming soon'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>A1 · LESSONS</Text>
      {allLessons.map((ls) => {
        const done = completed.has(ls.id);
        return (
          <Pressable
            key={ls.id}
            disabled={!ls.unlocked}
            onPress={() => onOpenLesson(ls.id)}
            style={({ pressed }) => [styles.lesson, !ls.unlocked && styles.lessonLocked, pressed && ls.unlocked && styles.pressed]}
          >
            <View style={[styles.badge, done && styles.badgeDone, !ls.unlocked && styles.badgeLocked]}>
              <Text style={styles.badgeText}>{done ? '✓' : ls.unlocked ? ls.index : '🔒'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lessonTitle, !ls.unlocked && styles.muted]}>{ls.title}</Text>
              <Text style={[styles.lessonSub, !ls.unlocked && styles.muted]}>{ls.subtitle}</Text>
            </View>
            {ls.unlocked && !done ? <Text style={styles.arrow}>›</Text> : null}
            {!ls.unlocked ? <Text style={styles.soon}>soon</Text> : null}
          </Pressable>
        );
      })}

      <Text style={styles.footer}>Your progress is saved to your account.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hej: { fontSize: 20, fontWeight: '800', color: colors.ink },
  levelLine: { fontSize: 13, color: colors.muted, marginTop: 1 },
  signout: { color: colors.blue, fontWeight: '700', fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.muted, marginBottom: 12, marginTop: 6 },

  coachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  coach: {
    width: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.line, minHeight: 110, justifyContent: 'center',
  },
  coachLocked: { backgroundColor: '#F4F7FA' },
  coachEmoji: { fontSize: 28, marginBottom: 8 },
  coachTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  coachSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  lesson: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line,
  },
  lessonLocked: { backgroundColor: '#F4F7FA', opacity: 0.85 },
  badge: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: colors.green },
  badgeLocked: { backgroundColor: '#C7D2DD' },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  lessonTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  lessonSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  arrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },
  soon: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  muted: { color: colors.muted },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 14 },
  pressed: { opacity: 0.9 },
});
