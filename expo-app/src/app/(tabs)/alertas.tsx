import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { collectAlerts, EXPENSE_THRESHOLD, prefOn } from '@/lib/alerts';
import { useStore } from '@/lib/store';
import type { Alert, AlertKind, Prefs } from '@/lib/types';

const KINDS: Record<AlertKind, { label: string; link?: string }> = {
  plenario: { label: 'Plenário' },
  votacao: { label: 'Voto de quem acompanho' },
  gasto: { label: 'Gasto da cota', link: 'Ver nota fiscal' },
  proposicao: { label: 'Projeto de lei', link: 'Ver tramitação' },
};
// alertas gravados antes desta versão não têm tipo: eram todos votos de quem a pessoa acompanha
const kindOf = (a: Alert): AlertKind => (a.kind && KINDS[a.kind] ? a.kind : 'votacao');
const fmtDate = (d: string | number) => String(typeof d === 'number' ? new Date(d).toISOString() : d).slice(0, 10).split('-').reverse().join('/');

const money = EXPENSE_THRESHOLD.toLocaleString('pt-BR');
const TOGGLES: { key: keyof Prefs; title: string; hint: string }[] = [
  { key: 'plenario', title: 'Votações do Plenário', hint: 'Novas votações nominais na Câmara e no Senado, para qualquer pessoa, sem acompanhar ninguém.' },
  { key: 'rollcall', title: 'Votos de quem você acompanha', hint: 'Como cada deputado ou senador que você acompanha votou nessas votações.' },
  { key: 'expenses', title: `Gastos da cota acima de R$ ${money}`, hint: 'Notas da cota parlamentar (CEAP) dos deputados federais que você acompanha.' },
  { key: 'bills', title: 'Projetos de lei apresentados', hint: 'PLs e PECs de autoria dos deputados federais que você acompanha.' },
];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: on ? theme.primaryContainer : theme.backgroundElement, borderColor: on ? theme.primary : theme.border }]}>
      <ThemedText type="small" style={{ color: on ? theme.primary : theme.text, fontWeight: on ? '700' : '400' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function AlertasScreen() {
  const router = useRouter();
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, addAlerts, setPref } = useStore();
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<'all' | AlertKind>('all');
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  const counts = (Object.keys(KINDS) as AlertKind[]).reduce((acc, k) => ({ ...acc, [k]: state.alerts.filter((a) => kindOf(a) === k).length }), {} as Record<AlertKind, number>);
  const shown = state.alerts.filter((a) => filter === 'all' || kindOf(a) === filter);

  const check = async () => {
    setChecking(true);
    try {
      const { alerts, failures } = await collectAlerts({ politicians: state.politicians, prefs: state.prefs });
      const count = addAlerts(alerts);
      const found = count > 0 ? `${count} ${count === 1 ? 'alerta novo' : 'alertas novos'}.` : 'Nada novo desde a última verificação.';
      // um aviso só: o seguinte apagaria o anterior antes de ser lido
      snackbar.show(failures.length ? `${found} Não foi possível consultar: ${failures.join(', ')}.` : found);
    } catch {
      snackbar.show('Erro temporário ao consultar as bases de dados abertas.');
    }
    setChecking(false);
  };

  return (
    <Screen title="Central de Alertas" subtitle="Novas votações do Congresso e, se você acompanha alguém, os votos, gastos e projetos dessas pessoas. A consulta acontece quando você toca em “Verificar agora”.">
      <Button label={checking ? 'Consultando o Congresso…' : 'Verificar agora'} disabled={checking} onPress={check} />

      <View style={styles.chips} accessibilityLabel="Filtrar alertas">
        <Chip label={`Todos (${state.alerts.length})`} on={filter === 'all'} onPress={() => setFilter('all')} />
        {(Object.keys(KINDS) as AlertKind[]).map((k) => (
          <Chip key={k} label={`${KINDS[k].label} (${counts[k]})`} on={filter === k} onPress={() => setFilter(k)} />
        ))}
      </View>

      {!state.alerts.length ? (
        <View style={card}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Nenhum alerta ainda
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Toque em “Verificar agora” para ver as votações recentes do Plenário. Para receber também votos, gastos e projetos de alguém, acompanhe essa pessoa pelo perfil no Painel público.
          </ThemedText>
          <Button label="Abrir o Painel público" variant="secondary" onPress={() => router.navigate('/')} />
        </View>
      ) : !shown.length ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          Nenhum alerta deste tipo ainda.
        </ThemedText>
      ) : (
        shown.map((a) => {
          const k = KINDS[kindOf(a)];
          return (
            <View key={a.id} style={card}>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {k.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {fmtDate(a.ts)}
                </ThemedText>
              </View>
              <ThemedText type="small">{a.text}</ThemedText>
              {a.url && k.link ? <Button label={k.link} variant="secondary" onPress={() => Linking.openURL(a.url!)} /> : null}
            </View>
          );
        })
      )}

      <View style={card}>
        <ThemedText type="smallBold" accessibilityRole="header">
          O que gera alertas
        </ThemedText>
        {TOGGLES.map((t) => (
          <View key={t.key} style={styles.toggle}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{t.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.hint}
              </ThemedText>
            </View>
            <Switch
              value={prefOn(state.prefs, t.key)}
              onValueChange={(v) => setPref(t.key, v)}
              accessibilityLabel={t.title}
              trackColor={{ true: theme.primary }}
            />
          </View>
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          Tudo é calculado neste aparelho, a partir das APIs públicas. Gastos e projetos só existem para deputados federais.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.half },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 44, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56 },
});
