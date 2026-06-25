import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { A1_ORDER, getSession } from '../data/curriculum/a1';
import { getSessionsState } from '../api/chat';

// The A1 teacher-led course map (PROJECT.md §15). Sessions unlock linearly:
// session N+1 opens once N is completed; completed sessions stay re-openable.
export default function CourseMapScreen({ onBack, onOpenSession }) {
  const [byId, setById] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const d = await getSessionsState();
        const map = {};
        (d.states || []).forEach((s) => { map[s.session_id] = s; });
        setById(map);
      } catch {}
    })();
  }, []);

  let prevDone = true; // first session is always open
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ Home</Text></Pressable>
        <Text style={styles.headerTitle}>A1 · Course</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>A complete, teacher-led Swedish course. Each session is taught by Astrid — learn, practise, and ask her anything. Pick up exactly where you left off.</Text>
        <Text style={styles.sectionLabel}>SESSIONS</Text>
        {A1_ORDER.map((id, i) => {
          const s = getSession(id);
          if (!s) return null;
          const st = byId[id];
          const completed = st?.status === 'completed';
          const inProgress = st?.status === 'in_progress';
          const open = completed || inProgress || prevDone;
          const wasPrevDone = prevDone;
          prevDone = completed;
          const badge = completed ? '✓' : open ? i + 1 : '🔒';
          return (
            <Pressable
              key={id}
              disabled={!open}
              onPress={() => onOpenSession(id)}
              style={({ pressed }) => [styles.row, !open && styles.rowLocked, pressed && open && styles.pressed]}
            >
              <View style={[styles.badge, completed && styles.badgeDone, !open && styles.badgeLocked]}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, !open && styles.muted]}>{s.title}</Text>
                <Text style={[styles.rowSub, !open && styles.muted]}>
                  {completed ? 'Completed — tap to review'
                    : inProgress ? `Resume — step ${(st.current_step || 0) + 1}/${s.steps.length}`
                    : open ? s.canDo
                    : 'Locked'}
                </Text>
              </View>
              {open && !completed ? <Text style={styles.arrow}>›</Text> : null}
            </Pressable>
          );
        })}
        <Text style={styles.note}>More A1 sessions are on the way — the full Rivstart A1 course (≈ 50 sessions) is being built.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', width: 60 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },
  body: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.muted, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  rowLocked: { backgroundColor: '#F4F7FA', opacity: 0.85 },
  badge: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: colors.green },
  badgeLocked: { backgroundColor: '#C7D2DD' },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  arrow: { fontSize: 26, color: colors.blue, fontWeight: '700' },
  muted: { color: colors.muted },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});
