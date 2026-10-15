// Avisos no aparelho: a parte que decide o que avisar, sem módulos nativos (testável em Node).
// O envio e a tarefa em segundo plano ficam em notifications.ts.
import { collectAlerts, type Sources } from './alerts';
import { reduce, initialState } from './state';
import type { Alert, AppState } from './types';

export interface Notice {
  title: string;
  body: string;
}

const KIND_TITLE: Record<NonNullable<Alert['kind']>, string> = {
  plenario: 'Votação no Plenário',
  votacao: 'Voto de quem você acompanha',
  gasto: 'Gasto da cota parlamentar',
  proposicao: 'Projeto de quem você acompanha',
};

/** Avisar é opt-in: só liga quando a pessoa ligou. */
export const notifyOn = (state: Pick<AppState, 'prefs'>) => state.prefs.notify === true;

/**
 * Um aviso por alerta novo (até 3); acima disso, um só resumindo, para o aparelho não virar uma enxurrada.
 * Quem a pessoa acompanha vem primeiro: são os alertas que ela pediu.
 */
export function noticesFor(fresh: Alert[]): Notice[] {
  if (!fresh.length) return [];
  const sorted = [...fresh].sort((a, b) => Number(!!b.politicianId) - Number(!!a.politicianId) || String(b.ts).localeCompare(String(a.ts)));
  if (sorted.length <= 3) return sorted.map((a) => ({ title: (a.kind && KIND_TITLE[a.kind]) || 'Alerta novo', body: a.text }));
  return [{ title: `${sorted.length} alertas novos`, body: sorted[0].text }];
}

export interface CheckDeps {
  load: () => Promise<AppState | null>;
  save: (s: AppState) => Promise<void>;
  send: (n: Notice) => Promise<void>;
  sources?: Sources;
}

/**
 * Verificação em segundo plano: consulta as APIs públicas, guarda o que é novo no aparelho e avisa.
 * `silent` guarda sem avisar (primeira verificação depois de ligar, para não avisar de tudo que já existia).
 * Devolve quantos alertas eram novos.
 */
export async function runCheck({ load, save, send, sources }: CheckDeps, { silent = false } = {}): Promise<number> {
  const saved = await load();
  if (!saved) return 0;
  const state = reduce(initialState(), { type: 'hydrate', state: saved });
  if (!silent && !notifyOn(state)) return 0;
  const { alerts } = await collectAlerts({ politicians: state.politicians, prefs: state.prefs }, sources);
  const known = new Set(state.alerts.map((a) => a.id));
  const fresh = alerts.filter((a) => !known.has(a.id));
  if (!fresh.length) return 0;
  await save(reduce(state, { type: 'addAlerts', alerts: fresh }));
  if (!silent) for (const n of noticesFor(fresh)) await send(n);
  return fresh.length;
}
