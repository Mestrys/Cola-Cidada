import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

// Cada Trigger liga uma rota de src/app/(tabs) a um rótulo e a um ícone (sf = SF Symbols no iOS, md = Material no Android).
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.primaryContainer}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Painel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.columns.fill" md="account_balance" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="politicos">
        <NativeTabs.Trigger.Label>Acompanho</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bookmark.fill" md="bookmark" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="comparador">
        <NativeTabs.Trigger.Label>Comparar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="compare_arrows" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alertas">
        <NativeTabs.Trigger.Label>Alertas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
