import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * Para a renderização estática na web, o tema só vale depois da hidratação: no servidor (e na hidratação)
 * o valor é 'light'; no cliente, o do sistema. useSyncExternalStore faz essa troca sem setState em efeito.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
