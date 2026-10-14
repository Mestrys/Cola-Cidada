import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PoliticianCard } from '@/components/politician-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mandateProgress } from '@/lib/mandate';
import { useStore } from '@/lib/store';

export default function InicioScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state, ready } = useStore();
  const list = state.politicians;

  // o mandato que termina primeiro, entre os que ainda estão em curso
  const next = list
    .map((p) => ({ p, m: mandateProgress(p) }))
    .filter((x) => !x.m.ended && x.m.end)
    .sort((a, b) => b.m.pct - a.m.pct)[0]; // maior progresso = menos tempo restante

  return (
    <Screen title="Painel Cívico" subtitle="Acompanhe o mandato de quem você elegeu, com dados oficiais.">
      {!ready ? null : list.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Nenhum representante acompanhado
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Busque deputados federais e senadores nas bases oficiais da Câmara e do Senado e siga os que importam para você.
          </ThemedText>
          <Button label="Seguir um político" onPress={() => router.push('/adicionar')} />
        </View>
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: theme.primaryContainer }]}>
            <ThemedText type="heading" style={{ color: theme.primary }}>
              {list.length}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.primary }}>
              {list.length === 1 ? 'representante acompanhado' : 'representantes acompanhados'}
              {next ? `. Mandato mais próximo do fim: ${next.p.name}, em ${next.m.end}.` : '.'}
            </ThemedText>
          </View>

          <ThemedText type="smallBold" accessibilityRole="header">
            Políticos monitorados
          </ThemedText>
          {list.map((p) => (
            <PoliticianCard key={p.id} politician={p} onPress={() => router.push({ pathname: '/politico/[id]', params: { id: p.id } })} />
          ))}
          <Button label="Seguir outro político" variant="secondary" onPress={() => router.push('/adicionar')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: 16, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  summary: { borderRadius: 16, padding: Spacing.four, gap: Spacing.one },
});
