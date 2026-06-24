// Tap-to-hear Swedish using the device's built-in text-to-speech.
// On iPhone this uses iOS's Swedish voice; in the browser preview it uses the
// browser's Swedish voice if one is installed (otherwise a default voice).
import * as Speech from 'expo-speech';

export function speak(text) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: 'sv-SE', rate: 0.95, pitch: 1.0 });
}
