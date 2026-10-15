import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { birthplace, isMagistrate, partyImage, partyName, stateImage } from '@/lib/simbolos';
import type { Politician } from '@/lib/types';

/**
 * A bandeira e a sigla do partido; para magistrado, que não tem vínculo partidário, o estado onde nasceu (com a bandeira
 * dele). Sem partido e sem naturalidade conhecida, nada. A bandeira é decorativa: o nome está escrito ao lado.
 */
export function PartyChip({ politician: p }: { politician: Politician }) {
  const theme = useTheme();
  let label = '';
  let image: number | undefined;
  let a11y = '';
  if (isMagistrate(p)) {
    const b = birthplace(p);
    if (!b) return null;
    label = `Natural de ${b.uf}`;
    image = stateImage(b.uf);
    a11y = `Natural de ${b.cidade ? `${b.cidade}, ${b.estado}` : b.estado}`;
  } else {
    label = partyName(p);
    if (!label) return null;
    image = partyImage(label);
    a11y = `Partido ${label}`;
  }
  return (
    <View accessible accessibilityLabel={a11y} style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {image ? <Image source={image} style={[styles.flag, { borderColor: theme.border }]} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no" /> : null}
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  flag: { width: 22, height: 16, borderRadius: 2, borderWidth: StyleSheet.hairlineWidth, backgroundColor: '#fff' },
});
