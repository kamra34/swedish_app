import { Pressable, Text, StyleSheet } from 'react-native';
import { speak } from '../speak';

// A small round 🔊 button that speaks the given Swedish text aloud.
export default function SpeakButton({ text, size = 15 }) {
  return (
    <Pressable
      onPress={() => speak(text)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Hear "${text}"`}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Text style={{ fontSize: size }}>🔊</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3F9',
  },
  pressed: { backgroundColor: '#D6E8F4' },
});
