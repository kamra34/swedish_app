import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from './src/theme';
import { levels, lessons } from './src/data/courseData';
import HomeScreen from './src/screens/HomeScreen';
import LessonScreen from './src/screens/LessonScreen';
import ConversationScreen from './src/screens/ConversationScreen';

export default function App() {
  const [nav, setNav] = useState({ screen: 'home' });
  const [completed, setCompleted] = useState([]);

  const openLesson = (id) => setNav({ screen: 'lesson', lessonId: id });
  const goHome = () => setNav({ screen: 'home' });
  const openConversation = () => setNav({ screen: 'conversation' });
  const completeLesson = (id) => {
    setCompleted((c) => (c.includes(id) ? c : [...c, id]));
    goHome();
  };

  const currentLesson =
    nav.screen === 'lesson' ? lessons.find((l) => l.id === nav.lessonId) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.flex}>
        {nav.screen === 'home' && (
          <HomeScreen
            levels={levels}
            lessons={lessons}
            completed={completed}
            onOpenLesson={openLesson}
            onOpenConversation={openConversation}
          />
        )}
        {nav.screen === 'lesson' && currentLesson && (
          <LessonScreen
            lesson={currentLesson}
            onBack={goHome}
            onComplete={() => completeLesson(currentLesson.id)}
          />
        )}
        {nav.screen === 'conversation' && <ConversationScreen onBack={goHome} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
});
