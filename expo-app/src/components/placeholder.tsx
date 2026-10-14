import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tela de uma função que ainda vai chegar. Diz o que será, para não parecer quebrada. */
export function ComingSoon({ title, subtitle, items }: { title: string; subtitle: string; items: string[] }) {
  const theme = useTheme();
  return (
    <Screen title={title} subtitle={subtitle}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Em breve
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          O que vem aqui:
        </ThemedText>
        {items.map((t) => (
          <ThemedText key={t} type="small">
            • {t}
          </ThemedText>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  badge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
});
