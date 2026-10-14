import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PoliticianCard } from '@/components/politician-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ScreenHeader, screenContent } from '@/components/ui/screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function PoliticosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, ready, remove } = useStore();

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <FlatList
          data={state.politicians}
          keyExtractor={(p) => p.id}
          contentContainerStyle={screenContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenHeader title="Meus Políticos" subtitle="Representantes que você fiscaliza, com dados abertos da Câmara e do Senado." />
              <Button label="Seguir novo político" onPress={() => router.push('/adicionar')} />
            </View>
          }
          ListEmptyComponent={
            ready ? (
              <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="smallBold" accessibilityRole="header">
                  Nenhum representante acompanhado
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Toque em “Seguir novo político” para buscar deputados federais e senadores.
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PoliticianCard
              politician={item}
              onPress={() => router.push({ pathname: '/politico/[id]', params: { id: item.id } })}
              onRemove={() => {
                const undo = remove(item.id);
                snackbar.show(`${item.name} removido do monitoramento.`, { label: 'Desfazer', onPress: undo });
              }}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: Spacing.three, marginBottom: Spacing.one },
  empty: { borderRadius: 16, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
});
