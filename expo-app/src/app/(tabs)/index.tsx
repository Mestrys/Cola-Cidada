import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader, screenContent } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { CHECKED_AT, loadSection, matches, placeOf, SECTIONS, STF_VACANCY, UNITS, type SectionKey } from '@/lib/directory';
import { formatDate, ROLES } from '@/lib/mandate';
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
  const party = p.party && p.party !== '—' ? p.party : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${role}, ${[party, placeOf(p)].filter(Boolean).join(', ')}${followed ? ', você acompanha' : ''}. Ver perfil`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}>
      <Avatar name={p.name} uri={p.photo} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {p.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[role, party, placeOf(p)].filter(Boolean).join(' · ')}
        </ThemedText>
        {p.condicao || followed ? (
          <ThemedText type="small" style={{ color: theme.primary }}>
            {[p.condicao, followed ? 'Você acompanha' : ''].filter(Boolean).join(' · ')}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PainelScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useStore();
  const [section, setSection] = useState<SectionKey>('presidencia');
  const [pickedUf, setPickedUf] = useState('');
  const [query, setQuery] = useState('');

  const current = SECTIONS.find((s) => s.key === section)!;
  // assembleias e câmaras são por estado: começam no estado do domicílio
  const home = (state.domicile?.state || 'SP').toUpperCase();
  const uf = current.requiresUf ? pickedUf || home : pickedUf;
  const units = section === 'prefeitos' || section === 'vereadores' ? UNITS.filter((u) => u.hasCouncil) : UNITS;

  const list = useAsync(() => loadSection(section, current.requiresUf ? uf : ''), [section, current.requiresUf ? uf : '']);
  const followedIds = useMemo(() => new Set(state.politicians.map((p) => p.id)), [state.politicians]);
  const visible = (list.data ?? []).filter((p) => (!uf || p.uf === uf) && matches(p, query));

  const pickSection = (k: SectionKey) => {
    setSection(k);
    setQuery('');
    setPickedUf('');
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title="Painel público"
        subtitle="Quem ocupa cada cargo, do Presidente aos vereadores das capitais. Tudo aberto, sem cadastro: abra um perfil e, se quiser, acompanhe essa pessoa."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.chips}>
        {SECTIONS.map((s) => (
          <Chip key={s.key} role="tab" label={s.label} on={s.key === section} onPress={() => pickSection(s.key)} />
        ))}
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary">
        {current.hint}
      </ThemedText>
      {section !== 'presidencia' && section !== 'stf' ? (
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
            <Chip key={u.uf} label={u.uf} a11y={u.name} on={u.uf === uf} onPress={() => setPickedUf(u.uf)} />
          ))}
        </ScrollView>
      ) : null}
      {list.data ? (
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
    ) : section === 'governadores' || section === 'prefeitos' ? (
      <ThemedText type="small" themeColor="textSecondary">
        Ocupantes atuais conferidos em {formatDate(CHECKED_AT)}. Renúncias e afastamentos mudam esses cargos: confira também o site oficial.
      </ThemedText>
    ) : null;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <FlatList
          data={list.data ? visible : []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={screenContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            list.loading ? (
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
});
