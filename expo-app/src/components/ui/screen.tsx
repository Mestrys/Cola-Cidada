import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <ThemedText type="heading" accessibilityRole="header">
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Estilo de conteúdo comum às telas: largura máxima centralizada e folga para a barra de abas. */
export const screenContent = {
  padding: Spacing.three,
  paddingBottom: BottomTabInset + Spacing.five,
  gap: Spacing.three,
  width: '100%',
  maxWidth: MaxContentWidth,
  alignSelf: 'center',
} as const;

/** Tela rolável com cabeçalho. Para listas longas, use FlatList com `screenContent` e `ScreenHeader`. */
export function Screen({ title, subtitle, children, ...rest }: { title?: string; subtitle?: string } & ScrollViewProps) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={screenContent} {...rest}>
          {title ? <ScreenHeader title={title} subtitle={subtitle} /> : null}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: Spacing.one, paddingTop: Spacing.two },
});
