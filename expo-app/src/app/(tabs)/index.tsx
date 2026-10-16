import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { PartyChip } from '@/components/party-chip';
import { Button } from '@/components/ui/button';
import { ScreenHeader, screenContent } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { budgetSummary, federalBodies, money, personnelSpending, recentContracts, SICONFI_URL, stateBodies, type Body, type Contract } from '@/lib/contas';
import { CHECKED_AT, POLOS_CHECKED_AT, loadSection, matches, placeOf, SECTIONS, STF_VACANCY, UNITS, type SectionKey } from '@/lib/directory';
import { formatDate, ROLES } from '@/lib/mandate';
import { partyOrBirth } from '@/lib/simbolos';
import { useStore } from '@/lib/store';
import type { Politician } from '@/lib/types';

// Chip de escolha única (cargo ou estado). O leitor de tela ouve "selecionado" no ativo.
function Chip({ label, a11y, on, onPress, role = 'button' }: { label: string; a11y?: string; on: boolean; onPress: () => void; role?: 'button' | 'tab' }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: on ? theme.primaryContainer : theme.backgroundElement, borderColor: on ? theme.primary : theme.border }]}>
      <ThemedText type="small" style={{ color: on ? theme.primary : theme.text, fontWeight: on ? '700' : '400' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Row({ p, followed, onPress }: { p: Politician; followed: boolean; onPress: () => void }) {
  const theme = useTheme();
  const role = ROLES[p.roleKey]?.label ?? 'Agente público';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${role}, ${[partyOrBirth(p).replace('/', ' '), placeOf(p)].filter(Boolean).join(', ')}${followed ? ', você acompanha' : ''}. Ver perfil`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}>
      <Avatar name={p.name} uri={p.photo} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {p.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[role, placeOf(p)].filter(Boolean).join(' · ')}
        </ThemedText>
        <PartyChip politician={p} />
        {p.condicao || followed ? (
          <ThemedText type="small" style={{ color: theme.primary }}>
            {[p.condicao, followed ? 'Você acompanha' : ''].filter(Boolean).join(' · ')}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function ContractRow({ c }: { c: Contract }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${c.value == null ? 'valor não informado' : money(c.value)}, ${c.object}. Abrir no PNCP`}
      onPress={() => Linking.openURL(c.url)}
      style={[styles.contract, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold">
        {c.value == null ? 'valor não informado' : money(c.value)} · {formatDate(c.date)}
      </ThemedText>
      <ThemedText type="small" numberOfLines={3}>
        {c.object}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {c.supplier}
        {c.kind ? ` · ${c.kind}` : ''}
        {c.emenda ? ' · emenda parlamentar' : ''}
      </ThemedText>
    </Pressable>
  );
}

/** Contratos que a prefeitura publicou no PNCP nos últimos 30 dias, consultados na hora ao abrir. */
function ContractsPanel({ cnpj }: { cnpj: string }) {
  const [tick, setTick] = useState(0);
  const res = useAsync(() => recentContracts(cnpj), [cnpj, tick]);
  if (res.loading) return <ActivityIndicator accessibilityLabel="Consultando o PNCP" />;
  if (res.error || !res.data) {
    return (
      <View style={styles.bodyRows}>
        <ThemedText type="small">Falha ao consultar o PNCP.</ThemedText>
        <Button label="Tentar de novo" variant="secondary" onPress={() => setTick(tick + 1)} />
      </View>
    );
  }
  const d = res.data;
  if (!d.total) return <ThemedText type="small" themeColor="textSecondary">Nenhum contrato publicado no PNCP nos últimos {d.days} dias por esta prefeitura.</ThemedText>;
  return (
    <View style={styles.bodyRows}>
      <ThemedText type="small">
        <ThemedText type="smallBold">{d.total.toLocaleString('pt-BR')}</ThemedText> contratos publicados nos últimos {d.days} dias{d.partial ? ' (somados os 500 mais recentes)' : ''}. Soma dos valores informados: <ThemedText type="smallBold">{money(d.sum)}</ThemedText> (empenhos e contratos, sem descontar repetições).
      </ThemedText>
      <ThemedText type="smallBold" accessibilityRole="header">Maiores contratos</ThemedText>
      {d.biggest.map((c) => (
        <ContractRow key={`b${c.id}`} c={c} />
      ))}
      <ThemedText type="smallBold" accessibilityRole="header">Mais recentes</ThemedText>
      {d.items.map((c) => (
        <ContractRow key={`r${c.id}`} c={c} />
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Fonte: Portal Nacional de Contratações Públicas (PNCP). Só o que a prefeitura publicou lá; a Câmara Municipal e outras entidades da cidade têm CNPJ próprio.
      </ThemedText>
    </View>
  );
}

/** Um órgão da aba Contas: abre as contas sob demanda, direto do Tesouro Nacional. */
function BodyCard({ body }: { body: Body }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [showContracts, setShowContracts] = useState(false);
  const [tick, setTick] = useState(0);
  const res = useAsync(
    async () => (open ? (body.budget ? await budgetSummary(body.ente) : await personnelSpending(body.ente, body.poder!, body.match!)) : undefined),
    [open, body.key, tick]
  );
  const data = res.data as any;
  const rows: [string, string, string?][] = !data
    ? []
    : body.budget
      ? [
          ['Receita arrecadada até o período', money(data.revenue), data.revenueForecast ? `de ${money(data.revenueForecast)} previstos` : undefined],
          ['Despesa empenhada (contratada)', money(data.committed), data.budget ? `de ${money(data.budget)} autorizados` : undefined],
          ['Despesa liquidada (serviço entregue)', money(data.liquidated)],
          ['Despesa paga', money(data.paid)],
        ]
      : [
          ['Gasto com pessoal', money(data.gross), 'ativos, aposentados e pensionistas'],
          ...(data.rclPct != null ? ([['Peso na receita corrente líquida', `${Number(data.rclPct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`, 'a Lei de Responsabilidade Fiscal limita esse percentual']] as [string, string, string][]) : []),
        ];
  return (
    <View style={[styles.row, styles.bodyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.flex}>
        <ThemedText type="smallBold" accessibilityRole="header">
          {body.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {body.budget ? 'Receitas e despesas do orçamento' : 'Gasto com pessoal do órgão'}
          {body.heavy ? ' · consulta maior' : ''}
          {body.note ? ` · ${body.note}` : ''}
        </ThemedText>
      </View>
      <Button
        label={open ? 'Ocultar contas' : 'Ver contas'}
        variant="secondary"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      />
      {body.cnpj ? (
        <Button
          label={showContracts ? 'Ocultar contratos' : 'Contratos recentes'}
          variant="secondary"
          accessibilityState={{ expanded: showContracts }}
          onPress={() => setShowContracts(!showContracts)}
        />
      ) : null}
      {showContracts && body.cnpj ? <ContractsPanel cnpj={body.cnpj} /> : null}
      {open ? (
        res.loading ? (
          <ActivityIndicator accessibilityLabel="Consultando o Tesouro Nacional" />
        ) : res.error ? (
          <View style={styles.bodyRows}>
            <ThemedText type="small">Falha ao consultar o Tesouro Nacional.</ThemedText>
            <Button label="Tentar de novo" variant="secondary" onPress={() => setTick(tick + 1)} />
          </View>
        ) : !data ? (
          <ThemedText type="small" themeColor="textSecondary">
            Este órgão ainda não entregou o relatório ao Tesouro nos últimos períodos.
          </ThemedText>
        ) : (
          <View style={styles.bodyRows}>
            {rows.map(([label, value, note]) => (
              <View key={label} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
                <ThemedText type="small" themeColor="textSecondary">
                  {label}
                </ThemedText>
                <ThemedText type="smallBold">{value}</ThemedText>
                {note ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {note}
                  </ThemedText>
                ) : null}
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              {data.institution} · {data.periodLabel}. Fonte: Siconfi, Tesouro Nacional.
            </ThemedText>
          </View>
        )
      ) : null}
      {body.portal ? <Button label={body.portalLabel ?? 'Portal de transparência'} variant="secondary" onPress={() => Linking.openURL(body.portal!)} /> : null}
    </View>
  );
}

export default function PainelScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useStore();
  const [section, setSection] = useState<SectionKey>('presidencia');
  const [pickedUf, setPickedUf] = useState('');
  const [pickedCity, setPickedCity] = useState('');
  const [query, setQuery] = useState('');

  const current = SECTIONS.find((s) => s.key === section)!;
  // assembleias e câmaras são por estado: começam no estado do domicílio
  const home = (state.domicile?.state || 'SP').toUpperCase();
  const uf = current.requiresUf ? pickedUf || home : pickedUf;
  const units = section === 'prefeitos' || section === 'vereadores' ? UNITS.filter((u) => u.hasCouncil) : UNITS;

  const list = useAsync(() => loadSection(section, current.requiresUf ? uf : ''), [section, current.requiresUf ? uf : '']);
  const bodies = section === 'orgaos' ? [...federalBodies(), ...stateBodies(uf)] : [];
  const followedIds = useMemo(() => new Set(state.politicians.map((p) => p.id)), [state.politicians]);
  // câmaras: a capital e as duas maiores cidades do estado; a pessoa pode afunilar para uma
  const cities = useMemo(
    () => (section === 'vereadores' ? [...new Set((list.data ?? []).map((p) => p.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')) : []),
    [section, list.data]
  );
  const city = cities.includes(pickedCity) ? pickedCity : '';
  const visible = (list.data ?? []).filter((p) => (!uf || p.uf === uf) && (!city || p.city === city) && matches(p, query));

  const pickSection = (k: SectionKey) => {
    setSection(k);
    setQuery('');
    setPickedUf('');
    setPickedCity('');
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title="Painel público"
        subtitle="Quem ocupa cada cargo, do Presidente aos vereadores das capitais e das maiores cidades de cada estado. Tudo aberto, sem cadastro: abra um perfil e, se quiser, acompanhe essa pessoa."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.chips}>
        {SECTIONS.map((s) => (
          <Chip key={s.key} role="tab" label={s.label} on={s.key === section} onPress={() => pickSection(s.key)} />
        ))}
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary">
        {current.hint}
      </ThemedText>
      {section !== 'presidencia' && section !== 'stf' && section !== 'orgaos' ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nome, partido ou cidade"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Buscar por nome, partido ou cidade"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        />
      ) : null}
      {current.byUf ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Estado" contentContainerStyle={styles.chips}>
          {current.requiresUf ? null : <Chip label="Todos" a11y="Todos os estados" on={!uf} onPress={() => setPickedUf('')} />}
          {units.map((u) => (
            // a sigla fica na tela; o leitor de tela ouve o nome do estado (sigla seria lida letra por letra)
            <Chip key={u.uf} label={u.uf} a11y={u.name} on={u.uf === uf} onPress={() => {
              setPickedUf(u.uf);
              setPickedCity('');
            }} />
          ))}
        </ScrollView>
      ) : null}
      {cities.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Cidade" contentContainerStyle={styles.chips}>
          <Chip label="Todas" a11y="Todas as cidades" on={!city} onPress={() => setPickedCity('')} />
          {cities.map((c) => (
            <Chip key={c} label={c} on={c === city} onPress={() => setPickedCity(c)} />
          ))}
        </ScrollView>
      ) : null}
      {section === 'orgaos' ? (
        <>
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">
            {bodies.length} órgãos: federais, do estado escolhido, da capital e das duas maiores cidades dele
          </ThemedText>
          <Button label="Ver gastos por Poder: Executivo, Legislativo e Judiciário" variant="secondary" onPress={() => router.push('/poderes')} />
        </>
      ) : list.data ? (
        <ThemedText type="smallBold" accessibilityLiveRegion="polite">
          {visible.length ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : 'Nenhum resultado para esse filtro.'}
        </ThemedText>
      ) : null}
    </View>
  );

  const footer =
    section === 'stf' && STF_VACANCY ? (
      <ThemedText type="small" themeColor="textSecondary">
        {STF_VACANCY}
      </ThemedText>
    ) : section === 'orgaos' ? (
      <ThemedText type="small" themeColor="textSecondary" onPress={() => Linking.openURL(SICONFI_URL)} accessibilityRole="link">
        As contas vêm dos relatórios que a União, os estados e os municípios entregam ao Tesouro Nacional por exigência da Lei de Responsabilidade Fiscal (RREO e RGF). Valores acumulados no período indicado em cada órgão. Toque para abrir o Siconfi.
      </ThemedText>
    ) : section === 'governadores' || section === 'prefeitos' ? (
      <ThemedText type="small" themeColor="textSecondary">
        Ocupantes atuais conferidos em {formatDate(CHECKED_AT)}. Renúncias e afastamentos mudam esses cargos: confira também o site oficial.
        {section === 'prefeitos' ? ` Nas cidades que não são capitais, os ocupantes foram conferidos em notícias de ${formatDate(POLOS_CHECKED_AT)} (veja a nota de cada perfil) e podem ter mudado depois.` : ''}
      </ThemedText>
    ) : null;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <FlatList
          data={section === 'orgaos' ? [] : list.data ? visible : []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={screenContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            section === 'orgaos' ? (
              <View style={styles.bodies}>
                {bodies.map((b) => (
                  <BodyCard key={b.key} body={b} />
                ))}
              </View>
            ) : list.loading ? (
              <ActivityIndicator accessibilityLabel="Carregando dados oficiais" />
            ) : list.error ? (
              <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="small">Não foi possível carregar agora. Verifique a conexão.</ThemedText>
                <Button label="Tentar de novo" variant="secondary" onPress={list.reload} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Row p={item} followed={followedIds.has(item.id)} onPress={() => router.push({ pathname: '/politico/[id]', params: { id: item.id } })} />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, gap: Spacing.half },
  header: { gap: Spacing.two, marginBottom: Spacing.one },
  chips: { gap: Spacing.two, paddingVertical: Spacing.half },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 16, borderWidth: 1, padding: Spacing.three },
  pressed: { opacity: 0.7 },
  empty: { borderRadius: 16, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  bodies: { gap: Spacing.two },
  bodyCard: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.two },
  bodyRows: { gap: Spacing.two },
  contract: { borderRadius: 12, padding: Spacing.two, gap: Spacing.half },
});
