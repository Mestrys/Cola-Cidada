import { defaultMandate } from './mandate';
import type { AppState, Politician } from './types';

export const initialState = (): AppState => ({
  politicians: [],
  alerts: [],
  domicile: { state: 'SP', city: 'São Paulo' },
});

export type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'add'; politician: Politician }
  | { type: 'remove'; id: string }
  | { type: 'restore'; politician: Politician; index: number }
  | { type: 'purge' };

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...initialState(),
        ...action.state,
        politicians: Array.isArray(action.state.politicians) ? action.state.politicians : [],
        alerts: Array.isArray(action.state.alerts) ? action.state.alerts : [],
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
    case 'purge':
      return initialState();
  }
}
