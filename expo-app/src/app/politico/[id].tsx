import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PartyChip } from '@/components/party-chip';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { deputyProfile, deputyPropositions } from '@/lib/api';
import { formatDate, mandateProgress, ROLES } from '@/lib/mandate';
import { senatorCeaps } from '@/lib/ceaps';
import { money } from '@/lib/contas';
import { authorEmendas, cityEmendas, EMENDAS_DESDE, type AuthorEmendas } from '@/lib/emendas';
import { CITY_YEARS, cityFacts, findSeen, placeOf } from '@/lib/directory';
import { birthplace, photoCredit } from '@/lib/simbolos';
import { useStore } from '@/lib/store';
import type { Politician } from '@/lib/types';

const officialPage = (p: Politician) =>
  p.camaraId
    ? `https://www.camara.leg.br/deputados/${p.camaraId}`
    : p.senadoId
      ? `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${p.senadoId}`
      : p.roleKey === 'ministro-stf'
        ? 'https://portal.stf.jus.br/'
        : undefined;

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// Ficha do cargo para quem não é parlamentar federal: Executivo, STF e o que o TSE registrou.
function officeRows(p: Politician): [string, string | undefined][] {
  if (p.roleKey === 'ministro-stf')
    return [
      ['Cargo', p.cargo || 'Ministro(a)'],
      ['Nome completo', p.fullName],
      ['Natural de', birthplace(p)?.texto],
      ['No STF desde', formatDate(p.posse)],
      ['Indicado(a) por', p.indicadoPor],
      ['Aposentadoria compulsória (75 anos)', p.aposentadoriaCompulsoria ? String(p.aposentadoriaCompulsoria) : undefined],
    ];
  const viceLabel = p.roleKey === 'prefeito' ? 'Vice-prefeito(a)' : p.roleKey === 'governador' ? 'Vice-governador(a)' : 'Vice-presidente';
  return [
    ['Órgão', p.house],
    ['Nome completo', p.fullName],
    ['Situação', p.situacao],
    ['No cargo desde', formatDate(p.desde)],
    ...(['presidente', 'governador', 'prefeito'].includes(p.roleKey)
      ? ([[viceLabel, p.vice?.name ?? 'Não há (o cargo de vice está vago)']] as [string, string][])
      : []),
    ['Eleito(a) na chapa original', p.eleitoPeloTse ? `${p.eleitoPeloTse.name} (${p.eleitoPeloTse.party}), em ${p.eleitoPeloTse.year}` : undefined],
  ];
}

// Contexto da cidade (IBGE): ajuda a ler o tamanho do orçamento e da câmara. Vale para capitais e cidades-polo.
function CityCard({ c }: { c: NonNullable<ReturnType<typeof cityFacts>> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" accessibilityRole="header">
        A cidade: {c.nome}
      </ThemedText>
      <Row label="Posição no estado (PIB)" value={c.kind === 'capital' ? `Capital · ${c.rankPib}ª economia do estado` : `${c.rankPib}ª maior economia do estado`} />
      <Row label={`PIB (${CITY_YEARS.pib})`} value={money(c.pib)} />
      <Row label={`População (Censo ${CITY_YEARS.populacao})`} value={c.populacao ? c.populacao.toLocaleString('pt-BR') : 'Não informada'} />
      <Row label="PIB por habitante" value={c.pibPerCapita ? brl(c.pibPerCapita) : 'Não informado'} />
      <ThemedText type="small" themeColor="textSecondary">
        Fonte: IBGE (PIB dos Municípios e Censo Demográfico).
      </ThemedText>
      <CityEmendasBlock ibge={c.ibge} />
    </View>
  );
}

// Emendas que a cidade recebeu desde 2023 (todas as modalidades), com os autores que mais enviaram.
function CityEmendasBlock({ ibge }: { ibge: number }) {
  const e = cityEmendas(ibge);
  if (!e) return <ThemedText type="small" themeColor="textSecondary">Emendas parlamentares: nenhuma registrada para esta cidade desde {EMENDAS_DESDE} (Portal da Transparência).</ThemedText>;
  const tot = Object.values(e.anos).reduce((a, y) => ({ e: a.e + y.empenhado, p: a.p + y.pago }), { e: 0, p: 0 });
  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold" accessibilityRole="header">Emendas parlamentares desde {e.desde}</ThemedText>
      <Row label="Empenhado (reservado)" value={money(tot.e)} />
      <Row label="Pago até agora" value={money(tot.p)} />
      <Row label="Emendas" value={String(e.emendas)} />
      <ThemedText type="small" themeColor="textSecondary">Quem mais enviou:</ThemedText>
      {e.autores.map((a) => (
        <Row key={a.nome} label={a.nome} value={money(a.valor)} />
      ))}
      <ThemedText type="small" themeColor="textSecondary">Fonte: Portal da Transparência (CGU), resumo de {formatDate(e.geradoEm)}.</ThemedText>
    </View>
  );
}

// Emendas individuais do parlamentar desde 2023, do resumo gerado do Portal da Transparência (ligado pelo nome parlamentar).
function EmendasCard({ e, name }: { e: AuthorEmendas | null; name: string }) {
  const theme = useTheme();
  if (!e) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold" accessibilityRole="header">Emendas parlamentares</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nenhuma emenda individual encontrada com o nome parlamentar {name} desde {EMENDAS_DESDE}. A ligação é feita pelo nome: se o nome no Portal da Transparência for outro, ela não aparece aqui.
        </ThemedText>
        <Button label="Consultar no Portal da Transparência" variant="secondary" onPress={() => Linking.openURL('https://portaldatransparencia.gov.br/emendas')} />
      </View>
    );
  }
  const years = Object.keys(e.anos).sort().reverse();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" accessibilityRole="header">Emendas individuais desde {e.desde}</ThemedText>
      {years.map((y) => (
        <View key={y} style={styles.gap}>
          <Row label={y === e.geradoEm.slice(0, 4) ? `${y} (até ${formatDate(e.geradoEm)})` : y} value={`${money(e.anos[y].empenhado)} empenhado`} />
          <Row label="Pago até agora" value={money(e.anos[y].pago)} />
        </View>
      ))}
      <ThemedText type="small">
        {e.emendas} emendas no período{e.especial ? `, ${money(e.especial)} delas em transferências especiais (as "emendas Pix", que vão direto ao caixa do município)` : ''}.
      </ThemedText>
      {e.destinos.length ? (
        <View style={styles.gap}>
          <ThemedText type="smallBold">Municípios que mais receberam</ThemedText>
          {e.destinos.map((d) => (
            <Row key={`${d.nome}${d.uf}`} label={`${d.nome}${d.uf ? ` (${d.uf})` : ''}`} value={money(d.valor)} />
          ))}
        </View>
      ) : null}
      {e.favorecidos.length ? (
        <View style={styles.gap}>
          <ThemedText type="smallBold">Quem mais recebeu o dinheiro</ThemedText>
          {e.favorecidos.map((f) => (
            <Row key={f.nome} label={f.nome} value={money(f.valor)} />
          ))}
        </View>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" onPress={() => Linking.openURL('https://portaldatransparencia.gov.br/emendas')} accessibilityRole="link">
        Fonte: Portal da Transparência (CGU), resumo de {formatDate(e.geradoEm)}. O pago inclui restos a pagar de anos anteriores. O parlamentar é ligado pelo nome parlamentar. Toque para abrir o Portal.
      </ThemedText>
    </View>
  );
}

// Cota parlamentar (CEAPS) do senador, a partir do resumo gerado do dado aberto do Senado.
function CeapsCard({ c }: { c: NonNullable<ReturnType<typeof senatorCeaps>> }) {
  const theme = useTheme();
  const years = Object.keys(c.anos).sort().reverse();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" accessibilityRole="header">
        Cota parlamentar (CEAPS)
      </ThemedText>
      {years.map((y) => (
        <View key={y} style={styles.gap}>
          <Row label={y === c.geradoEm.slice(0, 4) ? `${y} (até ${formatDate(c.geradoEm)})` : y} value={brl(c.anos[y].total)} />
          {c.anos[y].tipos.slice(0, 3).map((t) => (
            <Row key={t.tipo} label={t.tipo} value={brl(t.valor)} />
          ))}
        </View>
      ))}
      {c.grandes.length ? (
        <View style={styles.gap}>
          <ThemedText type="smallBold">Despesas a partir de {brl(c.limite)}, as mais recentes</ThemedText>
          {c.grandes.slice(0, 5).map((e) => (
            <Row key={e.id} label={`${formatDate(e.data)} · ${e.tipo}${e.fornecedor ? ` · ${e.fornecedor}` : ''}`} value={brl(e.valor)} />
          ))}
        </View>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        Fonte: dados abertos do Senado, resumo de {formatDate(c.geradoEm)}. Pode não ter as despesas dos últimos dias.
      </ThemedText>
    </View>
  );
}

export default function PoliticoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, add, remove } = useStore();
  const followed = state.politicians.find((x) => x.id === id);
  // quem a pessoa acompanha está no aparelho; os demais vêm do Painel aberto nesta sessão
  const p = followed ?? findSeen(id);
  const camaraId = p?.camaraId;

  // A API da Câmara derruba conexões sob rajadas: perfil e projetos são consultados em sequência, e a
  // falha de um não esconde o outro.
  const dossier = useAsync(async () => {
    if (!camaraId) return undefined;
    const settle = <T,>(pr: Promise<T>) => pr.then((value) => ({ value }), (error: Error) => ({ error }));
    const profile = await settle(deputyProfile(camaraId));
    const bills = await settle(deputyPropositions(camaraId));
    return { profile, bills };
  }, [camaraId]);
  const profile = { loading: dossier.loading, error: dossier.data?.profile && 'error' in dossier.data.profile ? dossier.data.profile.error : undefined, reload: dossier.reload };
  const bills = { loading: dossier.loading, error: dossier.data?.bills && 'error' in dossier.data.bills ? dossier.data.bills.error : undefined, reload: dossier.reload, data: dossier.data?.bills && 'value' in dossier.data.bills ? dossier.data.bills.value : undefined };

  if (!p) {
    return (
      <Screen title="Político não encontrado">
        <Stack.Screen options={{ title: 'Ficha' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Abra o perfil a partir do Painel público.
        </ThemedText>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const m = mandateProgress(p);
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];
  const url = officialPage(p);
  const credit = photoCredit(p);
  const prof = dossier.data?.profile && 'value' in dossier.data.profile ? dossier.data.profile.value : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: p.name }} />
      <View style={styles.hero}>
        <Avatar name={p.name} uri={p.photo} size={88} />
        <View style={styles.heroText}>
          <ThemedText type="heading" accessibilityRole="header">
            {p.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[ROLES[p.roleKey]?.label, placeOf(p)].filter(Boolean).join(' • ')}
          </ThemedText>
          <PartyChip politician={p} />
          {credit ? (
            <ThemedText type="small" themeColor="textSecondary" accessibilityRole={credit.url ? 'link' : undefined} onPress={credit.url ? () => Linking.openURL(credit.url) : undefined}>
              {credit.texto}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.gap}>
        <Button
          label={followed ? 'Acompanhando · deixar de acompanhar' : 'Acompanhar'}
          variant={followed ? 'secondary' : 'primary'}
          accessibilityState={{ selected: !!followed }}
          onPress={() => {
            if (followed) {
              const undo = remove(p.id);
              snackbar.show(`Você deixou de acompanhar ${p.name}.`, { label: 'Desfazer', onPress: undo });
            } else {
              add(p);
              snackbar.show(`Você passou a acompanhar ${p.name}.`);
            }
          }}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Opcional. A lista de quem você acompanha fica só neste aparelho e não diz em quem você votou.
        </ThemedText>
      </View>

      <View style={card}>
        {m.open ? (
          <ThemedText type="smallBold">{m.label}</ThemedText>
        ) : (
          <>
            <View style={styles.between}>
              <ThemedText type="smallBold">Mandato{m.end ? ` até ${m.end}` : ''}</ThemedText>
              <ThemedText type="smallBold">{m.pct}%</ThemedText>
            </View>
            <ProgressBar pct={m.pct} label={`Mandato de ${p.name}`} />
            <ThemedText type="small" themeColor="textSecondary">
              {m.label}
            </ThemedText>
          </>
        )}
      </View>

      {(p.roleKey === 'prefeito' || p.roleKey === 'vereador') && cityFacts(p.uf, p.city) ? <CityCard c={cityFacts(p.uf, p.city)!} /> : null}

      {!camaraId && !p.senadoId ? (
        <View style={card}>
          <ThemedText type="smallBold" accessibilityRole="header">
            {p.roleKey === 'ministro-stf' ? 'No Supremo' : 'No cargo'}
          </ThemedText>
          {officeRows(p).map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
          {p.nota ? (
            <ThemedText type="small" themeColor="textSecondary">
              {p.nota}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {p.roleKey === 'ministro-stf'
              ? 'Ministros do STF não são eleitos: são indicados pelo Presidente e aprovados pelo Senado.'
              : 'Ocupante atual conferido com registros públicos; a ficha eleitoral do TSE é de quem venceu a eleição.'}
          </ThemedText>
        </View>
      ) : null}

      {p.tse ? (
        <View style={card}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Ficha eleitoral (TSE)
          </ThemedText>
          <Row label="Eleição" value={`${p.tse.year} · ${p.tse.status}`} />
          <Row label="Número na urna" value={p.tse.ballotNumber} />
          <Row label="Coligação ou federação" value={p.tse.coalition && p.tse.coalition !== 'PARTIDO ISOLADO' ? p.tse.coalition : 'Partido isolado'} />
          <Row label="Patrimônio declarado" value={p.tse.declaredAssets != null ? brl(p.tse.declaredAssets) : 'Não declarado'} />
          {p.pageUrl ? <Button label="Ver ficha no TSE" variant="secondary" onPress={() => Linking.openURL(p.pageUrl!)} /> : null}
        </View>
      ) : null}

      {camaraId ? (
        <View style={card}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Dados oficiais
          </ThemedText>
          {profile.loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Consultando a Câmara…
            </ThemedText>
          ) : profile.error || !prof ? (
            <View style={styles.gap}>
              <ThemedText type="small" themeColor="textSecondary">
                Não foi possível carregar os dados da Câmara.
              </ThemedText>
              <Button label="Tentar de novo" variant="secondary" onPress={profile.reload} />
            </View>
          ) : (
            <View style={styles.gap}>
              <Row label="Nome civil" value={prof.civilName} />
              <Row label="Situação" value={`${prof.electoralCondition}, ${prof.status}`} />
              <Row label="Nascimento" value={[formatDate(prof.birthDate), prof.birthCity].filter(Boolean).join(' • ')} />
              <Row label="Escolaridade" value={prof.schooling} />
              {prof.cabinet ? (
                <>
                  <Row label="Gabinete" value={`Sala ${prof.cabinet.room}, prédio ${prof.cabinet.building}, ${prof.cabinet.floor}º andar`} />
                  <Row label="Telefone" value={prof.cabinet.phone} />
                  <Row label="E-mail" value={prof.cabinet.email} />
                </>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {camaraId ? (
        <View style={card}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Projetos de lei e PECs de autoria
          </ThemedText>
          {bills.loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Consultando projetos…
            </ThemedText>
          ) : bills.error ? (
            <Button label="Tentar de novo" variant="secondary" onPress={bills.reload} />
          ) : (bills.data ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum projeto encontrado.
            </ThemedText>
          ) : (
            (bills.data ?? []).map((b) => (
              <Pressable key={b.id} accessibilityRole="link" accessibilityLabel={`${b.type} ${b.number}/${b.year}. Abrir ficha de tramitação`} onPress={() => Linking.openURL(b.url)} style={styles.bill}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {b.type} {b.number}/{b.year}
                </ThemedText>
                <ThemedText type="small" numberOfLines={3}>
                  {b.summary}
                </ThemedText>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {p.senadoId && senatorCeaps(p.senadoId) ? <CeapsCard c={senatorCeaps(p.senadoId)!} /> : null}

      {camaraId || p.senadoId ? <EmendasCard e={authorEmendas(p.name)} name={p.name} /> : null}

      {url ? <Button label="Ver página oficial" variant="secondary" onPress={() => Linking.openURL(url)} /> : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.rowItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroText: { flex: 1, gap: Spacing.one },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  gap: { gap: Spacing.two },
  rowItem: { gap: Spacing.half },
  bill: { minHeight: 44, gap: Spacing.half, paddingVertical: Spacing.one },
});
