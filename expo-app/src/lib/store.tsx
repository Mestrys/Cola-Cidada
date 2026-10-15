import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { initialState, reduce } from './state';
import type { Alert, AppState, Politician, Prefs } from './types';

// Os dados ficam só no aparelho (LGPD), com a mesma chave e formato do PWA.
export const STORAGE_KEY = 'monitor-cidadao:v1';

interface Store {
  state: AppState;
  /** false até os dados salvos serem lidos; evita piscar a tela vazia */
  ready: boolean;
  add: (p: Politician) => boolean;
  /** remove e devolve uma função que desfaz, na mesma posição */
  remove: (id: string) => () => void;
  /** guarda os alertas ainda desconhecidos e devolve quantos eram novos */
  addAlerts: (alerts: Alert[]) => number;
  setPref: (key: keyof Prefs, value: boolean) => void;
  purge: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (alive && raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // grava a cada mudança, depois de lido o que já havia (senão apagaria os dados antes de carregá-los)
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const add = useCallback((p: Politician) => {
    if (stateRef.current.politicians.some((x) => x.id === p.id)) return false;
    dispatch({ type: 'add', politician: p });
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    const index = stateRef.current.politicians.findIndex((p) => p.id === id);
    const politician = stateRef.current.politicians[index];
    dispatch({ type: 'remove', id });
    return () => {
      if (politician) dispatch({ type: 'restore', politician, index });
    };
  }, []);

  const addAlerts = useCallback((alerts: Alert[]) => {
    const known = new Set(stateRef.current.alerts.map((a) => a.id));
    const count = alerts.filter((a) => !known.has(a.id)).length;
    if (count) dispatch({ type: 'addAlerts', alerts });
    return count;
  }, []);

  const setPref = useCallback((key: keyof Prefs, value: boolean) => dispatch({ type: 'setPref', key, value }), []);

  const purge = useCallback(() => dispatch({ type: 'purge' }), []);

  const value = useMemo(() => ({ state, ready, add, remove, addAlerts, setPref, purge }), [state, ready, add, remove, addAlerts, setPref, purge]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore precisa estar dentro de <StoreProvider>');
  return s;
}
