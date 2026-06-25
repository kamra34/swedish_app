import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { colors } from './src/theme';
import { lessons } from './src/data/courseData';
import { AuthProvider, useAuth } from './src/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import HubScreen from './src/screens/HubScreen';
import LessonScreen from './src/screens/LessonScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import CourseMapScreen from './src/screens/CourseMapScreen';
import SessionPlayerScreen from './src/screens/SessionPlayerScreen';
import { apiSaveProgress } from './src/api/chat';

function Main() {
  const { user, loading, refresh } = useAuth();
  const [nav, setNav] = useState({ screen: 'home' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }
  if (!user) return <AuthScreen />;

  const openLesson = (id) => setNav({ screen: 'lesson', lessonId: id });
  const goHome = () => setNav({ screen: 'home' });
  const openConversation = () => setNav({ screen: 'conversation' });
  const openPractice = () => setNav({ screen: 'practice' });
  const openCourse = () => setNav({ screen: 'course' });
  const openSession = (id) => setNav({ screen: 'session', sessionId: id });
  const completeLesson = async (id) => {
    try {
      await apiSaveProgress(id);
      await refresh();
    } catch {}
    goHome();
  };

  const currentLesson = nav.screen === 'lesson' ? lessons.find((l) => l.id === nav.lessonId) : null;

  return (
    <View style={styles.flex}>
      {nav.screen === 'home' && <HubScreen onOpenConversation={openConversation} onOpenLesson={openLesson} onOpenPractice={openPractice} onOpenCourse={openCourse} />}
      {nav.screen === 'lesson' && currentLesson && (
        <LessonScreen lesson={currentLesson} onBack={goHome} onComplete={() => completeLesson(currentLesson.id)} />
      )}
      {nav.screen === 'conversation' && <ConversationScreen onBack={goHome} />}
      {nav.screen === 'practice' && <PracticeScreen onBack={goHome} />}
      {nav.screen === 'course' && <CourseMapScreen onBack={goHome} onOpenSession={openSession} />}
      {nav.screen === 'session' && <SessionPlayerScreen sessionId={nav.sessionId} onBack={openCourse} />}
    </View>
  );
}

export default function App() {
  useEffect(() => {
    // Let Swedish text-to-speech play even when the iPhone's silent switch is on
    // (like videos/voice apps do), instead of being muted by the hardware mute.
    // Guarded so it can never crash the web preview (where it's a no-op/absent).
    try {
      setAudioModeAsync({ playsInSilentMode: true })?.catch?.(() => {});
    } catch {}
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AuthProvider>
        <Main />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  loadingText: { color: colors.muted },
});
