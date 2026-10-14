import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import type { CamaraVoting, Category, Politician, SenateVoting } from '@/lib/types';
import { CATEGORY_LABELS, confront, loadCamaraComparison, loadSenateComparison } from '@/lib/votes';

type House = 'camara' | 'senado' | 'confronto';
const HOUSES: { key: House; label: string }[] = [
  { key: 'camara', label: 'Câmara' },
  { key: 'senado', label: 'Senado' },
  { key: 'confronto', label: '1 contra 1' },
];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const shortName = (n: string) => n.split(' ').slice(0, 2).join(' ');
const fmtDate = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');

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

function VoteTag({ vote }: { vote?: string | null }) {
  const theme = useTheme();
  const v = vote?.toLowerCase();
  const color = v === 'sim' ? theme.primary : v === 'não' ? theme.danger : theme.textSecondary;
  return (
    <ThemedText type="smallBold" style={{ color }}>
      {vote || 'Ausente'}
    </ThemedText>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>;
}

function Status({ loading, error, empty, onRetry, children }: { loading: boolean; error?: Error; empty?: string; onRetry: () => void; children?: React.ReactNode }) {
  if (loading) return <ActivityIndicator accessibilityLabel="Carregando votações" />;
  if (error)
    return (
      <Card>
        <ThemedText type="small">Não foi possível consultar as votações agora.</ThemedText>
        <Button label="Tentar de novo" variant="secondary" onPress={onRetry} />
      </Card>
    );
  if (empty)
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {empty}
        </ThemedText>
      </Card>
    );
  return <>{children}</>;
}

function Members({ members, votes }: { members: Politician[]; votes: Record<string, string | null | undefined> }) {
  return (
    <View style={styles.members}>
      {members.map((p) => (
        <View key={p.id} style={styles.member}>
          <Avatar name={p.name} uri={p.photo} size={32} />
          <View style={styles.flex}>
            <ThemedText type="small" numberOfLines={1}>
              {shortName(p.name)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {p.party}/{p.uf}
            </ThemedText>
          </View>
          <VoteTag vote={votes[p.id]} />
        </View>
      ))}
    </View>
  );
}

function CamaraCard({ v, deputies }: { v: CamaraVoting; deputies: Politician[] }) {
  const total = v.tally.Sim + v.tally.Não + v.tally.Outros || 1;
  const pct = Math.round((v.tally.Sim / total) * 100);
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {v.siglaOrgao} · {v.approved ? 'Aprovada' : 'Rejeitada'} · {fmtDate(v.data)}
      </ThemedText>
      <ThemedText type="smallBold">{v.descricao}</ThemedText>
      <ProgressBar pct={pct} label={`Sim ${pct}%`} />
      <ThemedText type="small" themeColor="textSecondary">
        Sim {v.tally.Sim} · Não {v.tally.Não} · Outros {v.tally.Outros}
      </ThemedText>
      <Members members={deputies} votes={v.byPol} />
    </Card>
  );
}

function SenateCard({ v, senators }: { v: SenateVoting; senators: Politician[] }) {
  const pct = Math.round((v.yes / (v.yes + v.no || 1)) * 100);
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {v.matter} · {v.result || 'Deliberado'} · {fmtDate(v.date)}
      </ThemedText>
      <ThemedText type="smallBold">{v.summary || 'Deliberação no Senado Federal'}</ThemedText>
      {v.yes + v.no > 0 ? (
        <>
          <ProgressBar pct={pct} label={`Sim ${pct}%`} />
          <ThemedText type="small" themeColor="textSecondary">
            Sim {v.yes} · Não {v.no}
          </ThemedText>
        </>
      ) : null}
      <Members members={senators} votes={v.bySenator} />
    </Card>
  );
}

function Filters({ query, setQuery, category, setCategory }: { query: string; setQuery: (q: string) => void; category: Category; setCategory: (c: Category) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.gap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por palavra-chave"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Buscar votações por palavra-chave"
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={CATEGORY_LABELS[c]} on={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
    </View>
  );
}

function CamaraList({ deputies, all, query, category }: { deputies: Politician[]; all: Politician[]; query: string; category: Category }) {
  const ids = deputies.map((d) => d.camaraId).join(',');
  const res = useAsync(() => loadCamaraComparison(all, 12), [ids]);
  const q = query.trim().toLowerCase();
  const rows = (res.data ?? []).filter((v) => (!q || v.descricao.toLowerCase().includes(q)) && (category === 'geral' || v.category === category));
  return (
    <Status loading={res.loading && !res.data} error={res.error} onRetry={res.reload} empty={!rows.length ? 'Nenhuma votação nominal encontrada.' : undefined}>
      {rows.map((v) => (
        <CamaraCard key={v.id} v={v} deputies={deputies} />
      ))}
    </Status>
  );
}

function SenateList({ senators, query, category }: { senators: Politician[]; query: string; category: Category }) {
  const ids = senators.map((s) => s.senadoId).join(',');
  const res = useAsync(() => loadSenateComparison(senators, 12), [ids]);
  const q = query.trim().toLowerCase();
  const rows = (res.data ?? []).filter((v) => (!q || `${v.matter} ${v.summary}`.toLowerCase().includes(q)) && (category === 'geral' || v.category === category));
  return (
    <Status loading={res.loading && !res.data} error={res.error} onRetry={res.reload} empty={!rows.length ? 'Nenhuma votação recente para os senadores acompanhados.' : undefined}>
      {rows.map((v) => (
        <SenateCard key={v.key} v={v} senators={senators} />
      ))}
    </Status>
  );
}

function Picker({ title, options, value, onChange }: { title: string; options: Politician[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((p) => (
          <Chip key={p.id} label={shortName(p.name)} on={value === p.id} onPress={() => onChange(p.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Confronto({ deputies }: { deputies: Politician[] }) {
  const theme = useTheme();
  const [a, setA] = useState(deputies[0]?.id ?? '');
  const [b, setB] = useState(deputies[1]?.id ?? '');
  const ids = deputies.map((d) => d.camaraId).join(',');
  const res = useAsync(() => loadCamaraComparison(deputies, 16), [ids]);

  if (deputies.length < 2)
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Acompanhe ao menos dois deputados federais para calcular a convergência de votos.
        </ThemedText>
      </Card>
    );

  const pa = deputies.find((d) => d.id === a);
  const pb = deputies.find((d) => d.id === b);
  const result = res.data && a !== b ? confront(res.data, a, b) : null;
  return (
    <View style={styles.gap}>
      <Picker title="Parlamentar A" options={deputies} value={a} onChange={setA} />
      <Picker title="Parlamentar B" options={deputies} value={b} onChange={setB} />
      <Status loading={res.loading && !res.data} error={res.error} onRetry={res.reload} empty={a === b ? 'Escolha dois parlamentares diferentes.' : undefined}>
        {result && pa && pb ? (
          <>
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                Convergência
              </ThemedText>
              <ThemedText type="heading" style={{ color: theme.primary }} accessibilityLabel={`${result.pct}% de alinhamento`}>
                {result.pct}% de alinhamento
              </ThemedText>
              <ProgressBar pct={result.pct} label="Alinhamento" />
              <ThemedText type="small" themeColor="textSecondary">
                {result.items.length} votações em comum: {result.matches} iguais, {result.diffs} divergentes.
              </ThemedText>
            </Card>
            {result.items.map((i) => (
              <Card key={i.id}>
                <ThemedText type="small" themeColor="textSecondary">
                  {i.same ? 'Votos iguais' : 'Divergência'} · {fmtDate(i.date)}
                </ThemedText>
                <ThemedText type="smallBold">{i.matter}</ThemedText>
                <View style={styles.row}>
                  <ThemedText type="small">{pa.name.split(' ')[0]}</ThemedText>
                  <VoteTag vote={i.voteA} />
                </View>
                <View style={styles.row}>
                  <ThemedText type="small">{pb.name.split(' ')[0]}</ThemedText>
                  <VoteTag vote={i.voteB} />
                </View>
              </Card>
            ))}
            {!result.items.length ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma votação recente em que os dois tenham votado.
              </ThemedText>
            ) : null}
          </>
        ) : null}
      </Status>
    </View>
  );
}

export default function ComparadorScreen() {
  const router = useRouter();
  const { state } = useStore();
  const all = state.politicians;
  const deputies = all.filter((p) => p.camaraId);
  const senators = all.filter((p) => p.senadoId);
  const [house, setHouse] = useState<House>('camara');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('geral');

  return (
    <Screen title="Comparador Cívico" subtitle="Como seus parlamentares votaram nas votações nominais recentes.">
      {!all.length ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Para ver como votaram, acompanhe deputados ou senadores: abra o perfil deles no Painel público e toque em “Acompanhar”.
          </ThemedText>
          <Button label="Abrir o Painel público" onPress={() => router.navigate('/')} />
        </Card>
      ) : (
        <>
          <View style={[styles.chips, styles.wrap]} accessibilityRole="tablist">
            {HOUSES.map((h) => (
              <Chip key={h.key} label={h.label} on={house === h.key} onPress={() => setHouse(h.key)} />
            ))}
          </View>
          {house !== 'confronto' ? <Filters query={query} setQuery={setQuery} category={category} setCategory={setCategory} /> : null}
          {house === 'camara' ? (
            deputies.length ? (
              <CamaraList deputies={deputies} all={all} query={query} category={category} />
            ) : (
              <Card>
                <ThemedText type="small" themeColor="textSecondary">
                  Nenhum deputado federal acompanhado.
                </ThemedText>
              </Card>
            )
          ) : null}
          {house === 'senado' ? (
            senators.length ? (
              <SenateList senators={senators} query={query} category={category} />
            ) : (
              <Card>
                <ThemedText type="small" themeColor="textSecondary">
                  Nenhum senador acompanhado.
                </ThemedText>
              </Card>
            )
          ) : null}
          {house === 'confronto' ? <Confronto deputies={deputies} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.two },
  wrap: { flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: { minHeight: 44, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  members: { gap: Spacing.two, marginTop: Spacing.one },
  member: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
