import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSnackbar } from '@/components/ui/snackbar';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { searchDeputies, searchSenators } from '@/lib/api';
import { defaultMandate } from '@/lib/mandate';
import { useStore } from '@/lib/store';
import type { DeputyResult, Politician, SenatorResult } from '@/lib/types';

type House = 'camara' | 'senado';
type Result = (DeputyResult & { house: 'camara' }) | (SenatorResult & { house: 'senado' });

const MIN_CHARS = 2;

function toPolitician(r: Result): Politician {
  return r.house === 'camara'
    ? { id: `camara-${r.camaraId}`, source: 'camara', camaraId: r.camaraId, name: r.name, party: r.party, uf: r.uf, photo: r.photo, roleKey: 'dep-federal', mandate: defaultMandate('dep-federal') }
    : { id: `senado-${r.senadoId}`, source: 'senado', senadoId: r.senadoId, name: r.name, party: r.party, uf: r.uf, photo: r.photo, roleKey: 'senador', mandate: r.mandate };
}

export default function AdicionarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, add } = useStore();
  const [house, setHouse] = useState<House>('camara');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  // espera o usuário parar de digitar antes de consultar a API
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const enough = house === 'senado' || query.length >= MIN_CHARS;
  const results = useAsync<Result[]>(async () => {
    if (!enough) return [];
    return house === 'camara'
      ? (await searchDeputies(query)).map((d) => ({ ...d, house: 'camara' as const }))
      : (await searchSenators(query)).map((s) => ({ ...s, house: 'senado' as const }));
  }, [house, query, enough]);

  const followed = new Set(state.politicians.map((p) => p.id));

  const follow = (r: Result) => {
    const p = toPolitician(r);
    if (add(p)) snackbar.show(`${p.name} agora está no seu acompanhamento.`);
    router.back();
  };

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: 'Seguir político', presentation: 'modal' }} />
      <SafeAreaView style={styles.fill} edges={['bottom']}>
        <View style={styles.top}>
          <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {(['camara', 'senado'] as const).map((h) => (
              <Pressable
                key={h}
                accessibilityRole="tab"
                accessibilityState={{ selected: house === h }}
                onPress={() => setHouse(h)}
                style={[styles.segmentItem, house === h && { backgroundColor: theme.primaryContainer }]}>
                <ThemedText type="smallBold" style={house === h ? { color: theme.primary } : undefined}>
                  {h === 'camara' ? 'Câmara dos Deputados' : 'Senado Federal'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={house === 'camara' ? 'Nome do deputado federal' : 'Nome, UF ou partido do senador'}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={house === 'camara' ? 'Buscar deputado federal pelo nome' : 'Buscar senador por nome, UF ou partido'}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          />
        </View>

        <FlatList
          data={results.data ?? []}
          keyExtractor={(r) => (r.house === 'camara' ? `c${r.camaraId}` : `s${r.senadoId}`)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            results.loading && enough ? (
              <View style={styles.status} accessibilityRole="progressbar" accessibilityLabel="Consultando">
                <ActivityIndicator color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Consultando {house === 'camara' ? 'a Câmara' : 'o Senado'}…
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            results.loading && enough ? null : results.error ? (
              <View style={styles.status}>
                <ThemedText type="small" themeColor="textSecondary">
                  Falha na consulta. Verifique sua conexão.
                </ThemedText>
                <Button label="Tentar de novo" variant="secondary" onPress={results.reload} />
              </View>
            ) : !enough ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
                Digite ao menos {MIN_CHARS} letras do nome.
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
                {house === 'camara' ? 'Nenhum deputado federal encontrado.' : 'Nenhum senador encontrado.'}
              </ThemedText>
            )
          }
          renderItem={({ item }) => {
            const already = followed.has(toPolitician(item).id);
            return (
              <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Avatar name={item.name} uri={item.photo} size={48} />
                <View style={styles.info}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.party} / {item.uf}
                  </ThemedText>
                </View>
                <Button label={already ? 'Seguindo' : 'Seguir'} variant={already ? 'secondary' : 'primary'} disabled={already} onPress={() => follow(item)} />
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: Spacing.three, gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  segment: { flexDirection: 'row', borderRadius: 24, borderWidth: 1, padding: Spacing.one, gap: Spacing.one },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  list: { padding: Spacing.three, paddingTop: 0, gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  status: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 16, borderWidth: 1, padding: Spacing.three },
  info: { flex: 1, gap: Spacing.half },
});
