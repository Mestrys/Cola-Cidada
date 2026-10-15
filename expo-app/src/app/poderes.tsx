import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { money, SICONFI_URL } from '@/lib/contas';
import { ufName, UNITS } from '@/lib/directory';
import {
  entesFor, FUNCTIONS, functionRows, kindLabel, PODERES_GERADO_EM, POWERS, rankFunction, rankStates, STATE_LIMITS, status,
  type Ente, type FunctionKey, type PowerData, type PowerKey,
} from '@/lib/poderes';
import { formatDate } from '@/lib/mandate';
import { useStore } from '@/lib/store';

const pct = (v: number | null) => (v == null ? 'não informado' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);
const usedPct = (v: number) => `${Math.round(v * 100)}%`;
const share = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: v < 0.1 ? 1 : 0 })}%`;
const period = (p: PowerData) => `12 meses até o ${p.periodo}º quadrimestre de ${p.ano}`;

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

function PowerBlock({ name, p }: { name: string; p: PowerData | null | undefined }) {
  if (!p) {
    return (
      <View style={styles.block}>
        <ThemedText type="smallBold" accessibilityRole="header">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Sem relatório entregue ao Tesouro nos últimos períodos.</ThemedText>
      </View>
    );
  }
  if (p.nota) {
    return (
      <View style={styles.block}>
        <ThemedText type="smallBold" accessibilityRole="header">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{p.nota}</ThemedText>
      </View>
    );
  }
  const st = status(p.uso);
  const orgs = p.orgaos.map((o) => o.nome).join(', ') + (p.orgaosTotal > p.orgaos.length ? ` e mais ${p.orgaosTotal - p.orgaos.length}` : '');
  return (
    <View style={styles.block} accessible accessibilityLabel={`${name}: ${money(p.liquida)} com pessoal, ${pct(p.pctRcl)} da receita corrente líquida, ${st.label}${p.uso != null ? `, usa ${usedPct(p.uso)} do limite` : ''}`}>
      <ThemedText type="smallBold">{name} · {st.label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{orgs}</ThemedText>
      <ThemedText type="small">
        Pessoal (líquida): <ThemedText type="smallBold">{money(p.liquida)}</ThemedText> · {pct(p.pctRcl)} da receita corrente líquida
      </ThemedText>
      {p.limite != null ? <ThemedText type="small">Limite máximo informado: <ThemedText type="smallBold">{money(p.limite)}</ThemedText></ThemedText> : null}
      {p.uso != null ? <ProgressBar pct={p.uso * 100} label={`${name}: uso do limite`} /> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {p.uso != null ? `Usa ${usedPct(p.uso)} do limite. ` : ''}
        {period(p)}.
      </ThemedText>
    </View>
  );
}

function FunctionBlock({ f }: { f: Ente['funcoes'] }) {
  const rows = functionRows(f);
  if (!f || !rows.length) return <ThemedText type="small" themeColor="textSecondary">Despesa por função: sem declaração anual no Tesouro.</ThemedText>;
  return (
    <View style={styles.block}>
      <ThemedText type="smallBold" accessibilityRole="header">Despesa total por função</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Gasto liquidado em {f.ano}: {money(f.total)}. Função não é Poder: aposentadorias e outros gastos de cada Poder podem estar em outras funções.
      </ThemedText>
      {rows.map((r) => (
        <View key={r.key} accessible accessibilityLabel={`${r.name}: ${money(r.valor)}, ${share(r.pct)} do total`}>
          <ThemedText type="small">
            <ThemedText type="smallBold">{r.name}</ThemedText> · {money(r.valor)} · {share(r.pct)} do total
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{r.hint}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function EnteCard({ e }: { e: Ente }) {
  const theme = useTheme();
  const city = e.tipo === 'capital' || e.tipo === 'polo';
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View>
        <ThemedText type="smallBold" accessibilityRole="header">{e.nome}{city && e.uf ? ` — ${e.uf}` : ''}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{kindLabel(e)}</ThemedText>
      </View>
      {POWERS.filter((w) => w.key in e.poderes).map((w) => (
        <PowerBlock key={w.key} name={w.name} p={e.poderes[w.key]} />
      ))}
      {city ? <ThemedText type="small" themeColor="textSecondary">Município não tem Judiciário próprio: a Justiça local é do estado.</ThemedText> : null}
      <FunctionBlock f={e.funcoes} />
    </View>
  );
}

export default function PoderesScreen() {
  const theme = useTheme();
  const { state } = useStore();
  const home = (state.domicile?.state || 'SP').toUpperCase();
  const [tab, setTab] = useState<'estado' | 'comparar'>('estado');
  const [uf, setUf] = useState(home);
  const [measure, setMeasure] = useState<string>('p:E');
  const [kind, key] = measure.split(':') as ['p' | 'f', string];
  const poder = key as PowerKey;
  const power = POWERS.find((w) => w.key === poder);
  const fn = FUNCTIONS.find((f) => f.key === key);

  return (
    <Screen
      title="Gastos por Poder"
      subtitle="Quanto o Executivo, o Legislativo e o Judiciário gastam com pessoal na União, nos estados, nas capitais e nas duas maiores cidades de cada estado, e quanto do limite da Lei de Responsabilidade Fiscal isso já consome.">
      <View style={styles.row}>
        <Chip label="Por estado e cidades" on={tab === 'estado'} onPress={() => setTab('estado')} />
        <Chip label="Comparar estados" on={tab === 'comparar'} onPress={() => setTab('comparar')} />
      </View>

      {tab === 'estado' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Estado" contentContainerStyle={styles.chips}>
            {UNITS.map((u) => (
              <Chip key={u.uf} label={u.uf} on={u.uf === uf} onPress={() => setUf(u.uf)} />
            ))}
          </ScrollView>
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">A União e, em {ufName(uf)}, o governo, a capital e as duas maiores cidades</ThemedText>
          {entesFor(uf).map((e) => (
            <EnteCard key={e.chave} e={e} />
          ))}
        </>
      ) : (
        <>
          <View style={styles.row}>
            {POWERS.map((w) => (
              <Chip key={w.key} label={`${w.name}: pessoal`} on={measure === `p:${w.key}`} onPress={() => setMeasure(`p:${w.key}`)} />
            ))}
            {FUNCTIONS.slice(0, 3).map((f) => (
              <Chip key={f.key} label={`${f.name}: total`} on={measure === `f:${f.key}`} onPress={() => setMeasure(`f:${f.key}`)} />
            ))}
          </View>
          {kind === 'p' && power ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Os 27 estados do que mais para o que menos pesa em {power.name} (despesa líquida com pessoal sobre a receita corrente líquida). O teto da LRF para este Poder nos estados é de {STATE_LIMITS[poder]}% da receita, somando todos os órgãos dele.
              </ThemedText>
              {rankStates(poder).map(({ ente, p }, i) => {
                const st = p ? status(p.uso) : null;
                return (
                  <View
                    key={ente.chave}
                    accessible
                    accessibilityLabel={p ? `${i + 1}º ${ente.nome}: ${money(p.liquida)}, ${pct(p.pctRcl)} da receita, ${st!.label}${p.uso != null ? `, usa ${usedPct(p.uso)} do limite` : ''}` : `${ente.nome}: sem relatório`}
                    style={[styles.rankRow, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold" style={styles.flex}>{ente.nome}</ThemedText>
                    <ThemedText type="small">{p ? `${money(p.liquida)} · ${pct(p.pctRcl)}` : 'sem relatório'}</ThemedText>
                    {p ? <ThemedText type="small" themeColor="textSecondary">{p.uso != null ? `${usedPct(p.uso)} do limite · ` : ''}{st!.label}</ThemedText> : null}
                  </View>
                );
              })}
            </>
          ) : fn ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Os 27 estados pela parcela da despesa total (liquidada, DCA) que vai à função {fn.name} ({fn.hint}). Função não é Poder: aposentadorias e outros gastos de cada Poder podem estar em outras funções.
              </ThemedText>
              {rankFunction(fn.key as FunctionKey).map(({ ente, f, valor, pct: s }, i) => (
                <View
                  key={ente.chave}
                  accessible
                  accessibilityLabel={f ? `${i + 1}º ${ente.nome}: ${money(valor)}, ${share(s!)} da despesa total` : `${ente.nome}: sem declaração`}
                  style={[styles.rankRow, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={styles.flex}>{ente.nome}</ThemedText>
                  <ThemedText type="small">{f ? `${money(valor)} · ${share(s!)} da despesa total` : 'sem declaração'}</ThemedText>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary" onPress={() => Linking.openURL(SICONFI_URL)} accessibilityRole="link">
        Dados que cada ente entrega ao Tesouro Nacional (Siconfi): Relatório de Gestão Fiscal (RGF, Anexo 01) para o pessoal de cada Poder e Declaração de Contas Anuais (DCA, Anexo I-E) para a despesa por função, consultados em {formatDate(PODERES_GERADO_EM)}. É a despesa líquida com pessoal (ativos, aposentados e pensionistas, descontadas as parcelas que a lei exclui), e não o gasto total do Poder: custeio e investimentos não entram. Cada ente informa o próprio limite; quando ele aparece acima de 100%, é o que consta no relatório entregue. Toque para abrir o Siconfi.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chips: { gap: Spacing.two, paddingVertical: Spacing.half },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.three },
  block: { gap: Spacing.one },
  rankRow: { borderBottomWidth: 1, paddingVertical: Spacing.two, gap: Spacing.half },
});
