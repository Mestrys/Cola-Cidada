import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Foto do parlamentar, com as iniciais quando não há foto ou ela não carrega. */
export function Avatar({ name, uri, size = 56 }: { name: string; uri?: string; size?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return <Image source={{ uri }} style={[box, { backgroundColor: theme.backgroundSelected }]} contentFit="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.fallback, box, { backgroundColor: theme.primaryContainer }]}>
      <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: size * 0.34 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
