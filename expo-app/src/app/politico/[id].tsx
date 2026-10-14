import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { deputyProfile, deputyPropositions } from '@/lib/api';
import { formatDate, mandateProgress, ROLES } from '@/lib/mandate';
import { useStore } from '@/lib/store';

const officialPage = (p: { camaraId?: number; senadoId?: number }) =>
  p.camaraId
    ? `https://www.camara.leg.br/deputados/${p.camaraId}`
    : p.senadoId
      ? `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${p.senadoId}`
      : undefined;

export default function PoliticoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, remove } = useStore();
  const p = state.politicians.find((x) => x.id === id);
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
          Este político não está mais na sua lista.
        </ThemedText>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const m = mandateProgress(p);
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];
  const url = officialPage(p);
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
            {ROLES[p.roleKey]?.label} • {p.party} / {p.uf}
          </ThemedText>
        </View>
      </View>

      <View style={card}>
        <View style={styles.between}>
          <ThemedText type="smallBold">Mandato{m.end ? ` até ${m.end}` : ''}</ThemedText>
          <ThemedText type="smallBold">{m.pct}%</ThemedText>
        </View>
        <ProgressBar pct={m.pct} label={`Mandato de ${p.name}`} />
        <ThemedText type="small" themeColor="textSecondary">
          {m.label}
        </ThemedText>
      </View>

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

      {url ? <Button label="Ver página oficial" variant="secondary" onPress={() => Linking.openURL(url)} /> : null}
      <Button
        label="Parar de acompanhar"
        variant="danger"
        onPress={() => {
          const undo = remove(p.id);
          snackbar.show(`${p.name} removido do monitoramento.`, { label: 'Desfazer', onPress: undo });
          router.back();
        }}
      />
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
