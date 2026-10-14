import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function PerfilScreen() {
  const theme = useTheme();
  const snackbar = useSnackbar();
  const { state, purge } = useStore();
  const [confirming, setConfirming] = useState(false);
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  return (
    <Screen title="Perfil" subtitle="Privacidade e dados.">
      <View style={card}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Seus dados ficam só neste aparelho
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          O Monitor Cidadão não tem servidor nem conta: a lista de políticos que você acompanha é guardada neste aparelho, e as consultas
          vão direto às APIs de Dados Abertos da Câmara dos Deputados e do Senado Federal.
        </ThemedText>
        <ThemedText type="small">
          Acompanhando agora: {state.politicians.length} {state.politicians.length === 1 ? 'político' : 'políticos'}.
        </ThemedText>
      </View>

      <View style={card}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Apagar meus dados
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Remove a lista de políticos e as preferências deste aparelho. Não dá para desfazer.
        </ThemedText>
        {confirming ? (
          <View style={styles.row}>
            <Button label="Cancelar" variant="secondary" onPress={() => setConfirming(false)} />
            <Button
              label="Apagar tudo"
              variant="danger"
              onPress={() => {
                purge();
                setConfirming(false);
                snackbar.show('Dados apagados deste aparelho.');
              }}
            />
          </View>
        ) : (
          <Button label="Apagar meus dados" variant="danger" disabled={state.politicians.length === 0} onPress={() => setConfirming(true)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
