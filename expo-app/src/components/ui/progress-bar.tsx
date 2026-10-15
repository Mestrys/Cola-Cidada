import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Barra de progresso (0 a 100). O texto de apoio fica a cargo de quem usa. */
export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const theme = useTheme();
  const value = Math.max(0, Math.min(100, pct));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { backgroundColor: theme.primary, width: `${value}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
