// Swedish flag drawn with plain Views so it renders identically on
// web, iOS and Android (emoji flags don't render on Windows/web).
import { View } from 'react-native';
import { colors } from '../theme';

export default function SwedishFlag({ width = 64, rounded = 5 }) {
  const w = width;
  const h = (width * 10) / 16; // official 16:10 ratio
  const stripe = (w * 2) / 16; // cross thickness
  return (
    <View style={{ width: w, height: h, backgroundColor: colors.blue, borderRadius: rounded, overflow: 'hidden' }}>
      {/* vertical bar of the cross (offset toward the hoist) */}
      <View style={{ position: 'absolute', left: (w * 5) / 16, top: 0, width: stripe, height: h, backgroundColor: colors.yellow }} />
      {/* horizontal bar of the cross */}
      <View style={{ position: 'absolute', top: (h * 4) / 10, left: 0, height: (h * 2) / 10, width: w, backgroundColor: colors.yellow }} />
    </View>
  );
}
