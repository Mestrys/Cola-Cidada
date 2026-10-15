import { defaultMandate } from './mandate';
import type { Alert, AppState, Politician, Prefs } from './types';

export const defaultPrefs = (): Prefs => ({ plenario: true, rollcall: true, expenses: true, bills: true });

export const initialState = (): AppState => ({
  politicians: [],
  alerts: [],
  prefs: defaultPrefs(),
  domicile: { state: 'SP', city: 'São Paulo' },
});

export type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'add'; politician: Politician }
  | { type: 'remove'; id: string }
  | { type: 'restore'; politician: Politician; index: number }
  | { type: 'addAlerts'; alerts: Alert[] }
  | { type: 'setPref'; key: keyof Prefs; value: boolean }
  | { type: 'purge' };

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...initialState(),
        ...action.state,
        politicians: Array.isArray(action.state.politicians) ? action.state.politicians : [],
        alerts: Array.isArray(action.state.alerts) ? action.state.alerts : [],
        // preferências gravadas antes de existir uma delas: a ausente conta como ligada
        prefs: { ...defaultPrefs(), ...(action.state.prefs ?? {}) },
      };
    case 'add': {
      if (state.politicians.some((p) => p.id === action.politician.id)) return state;
      const p = action.politician;
      return { ...state, politicians: [...state.politicians, { ...p, mandate: p.mandate ?? defaultMandate(p.roleKey, p.uf) }] };
    }
    case 'remove':
      return { ...state, politicians: state.politicians.filter((p) => p.id !== action.id) };
    case 'restore': {
      if (state.politicians.some((p) => p.id === action.politician.id)) return state;
      const next = [...state.politicians];
      next.splice(Math.min(action.index, next.length), 0, action.politician);
      return { ...state, politicians: next };
    }
    case 'addAlerts': {
      const known = new Set(state.alerts.map((a) => a.id));
      const fresh = action.alerts.filter((a) => !known.has(a.id));
      return fresh.length ? { ...state, alerts: [...fresh, ...state.alerts].slice(0, 200) } : state;
    }
    case 'setPref':
      return { ...state, prefs: { ...state.prefs, [action.key]: action.value } };
    case 'purge':
      return initialState();
  }
}
