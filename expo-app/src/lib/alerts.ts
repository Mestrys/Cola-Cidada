// Alertas: o que mudou no Congresso desde a última verificação, calculado no aparelho a partir das APIs públicas.
// Mesma lógica do PWA (src/alerts.js).
import { deputyExpenses, deputyPropositions, type Expense } from './api';
import { formatDate } from './mandate';
import { loadCamaraComparison, loadSenateVotings, mapLimit } from './votes';
import type { Alert, CamaraVoting, Politician, Prefs, Proposition, SenateVoting } from './types';

export const EXPENSE_THRESHOLD = 5000;

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const short = (s: string | undefined, n = 140) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));
const day = (iso: string) => formatDate(String(iso).slice(0, 10));

/** Preferências antigas não têm `plenario`: ausente conta como ligado. */
export const prefOn = (prefs: Partial<Prefs> | undefined, k: keyof Prefs) => prefs?.[k] !== false;

export interface Sources {
  camara: (p: Politician[], limit: number) => Promise<CamaraVoting[]>;
  senado: (p: Politician[], limit: number) => Promise<SenateVoting[]>;
  expenses: (camaraId: number, limit: number) => Promise<Expense[]>;
  bills: (camaraId: number, limit: number) => Promise<Proposition[]>;
}

const REAL: Sources = { camara: loadCamaraComparison, senado: loadSenateVotings, expenses: deputyExpenses, bills: deputyPropositions };

export async function collectAlerts(
  { politicians, prefs }: { politicians: Politician[]; prefs: Partial<Prefs> },
  src: Sources = REAL
): Promise<{ alerts: Alert[]; failures: string[] }> {
  const deputies = politicians.filter((p) => p.camaraId);
  const senators = politicians.filter((p) => p.senadoId);
  const wantPlenary = prefOn(prefs, 'plenario');
  const wantVotes = prefOn(prefs, 'rollcall') && deputies.length + senators.length > 0;
  const out: Alert[] = [];
  const failures: string[] = [];

  if (wantPlenary || wantVotes) {
    const [cam, sen] = await Promise.allSettled([src.camara(politicians, 10), src.senado(politicians, 10)]);
    if (cam.status === 'fulfilled') {
      cam.value.forEach((v, i) => {
        const ts = v.data || new Date().toISOString();
        if (wantPlenary && i < 6) out.push({ id: `plen-camara:${v.id}`, ts, kind: 'plenario', text: `Câmara — ${short(v.descricao)}` });
        if (wantVotes)
          for (const d of deputies) {
            const vote = v.byPol[d.id];
            if (vote)
              out.push({
                id: `camara:${v.id}:${d.id}`, ts, kind: 'votacao', politicianId: d.id,
                text: `${d.name} (${d.party}/${d.uf}) votou ${vote.toUpperCase()} na Câmara — ${short(v.descricao)}`,
              });
          }
      });
    } else failures.push('Câmara');
    if (sen.status === 'fulfilled') {
      sen.value.forEach((v, i) => {
        const ts = v.date || new Date().toISOString();
        if (wantPlenary && i < 6) {
          const placar = v.secret ? 'votação secreta' : `Sim ${v.yes}, Não ${v.no}`;
          out.push({ id: `plen-senado:${v.key}`, ts, kind: 'plenario', text: `Senado — ${v.matter}${v.round ? ` (${v.round})` : ''}: ${v.result || 'votado'} (${placar}). ${short(v.summary, 110)}` });
        }
        if (wantVotes)
          for (const s of senators) {
            const vote = v.bySenator[s.id];
            if (vote)
              out.push({
                id: `senado:${v.key}:${s.id}`, ts, kind: 'votacao', politicianId: s.id,
                text: `${s.name} (${s.party}/${s.uf}) votou ${vote.toUpperCase()} no Senado — ${v.matter}${v.round ? ` (${v.round})` : ''}: ${short(v.summary, 90)}`,
              });
          }
      });
    } else failures.push('Senado');
  }

  // Gastos e projetos só existem na API da Câmara (deputados federais).
  if (deputies.length && (prefOn(prefs, 'expenses') || prefOn(prefs, 'bills'))) {
    await mapLimit(deputies, 3, async (d) => {
      const camaraId = d.camaraId!;
      if (prefOn(prefs, 'expenses')) {
        try {
          for (const e of await src.expenses(camaraId, 30)) {
            if (!(e.value >= EXPENSE_THRESHOLD)) continue;
            out.push({
              id: `ceap:${camaraId}:${e.docNumber ?? ''}:${e.date}:${e.value}`, ts: e.date || new Date().toISOString(), kind: 'gasto',
              politicianId: d.id, url: e.receiptUrl || undefined,
              text: `${d.name} (${d.party}/${d.uf}) usou ${brl(e.value)} da cota parlamentar${e.date ? ` em ${day(e.date)}` : ''} — ${e.type}${e.supplier ? `, ${e.supplier}` : ''}`,
            });
          }
        } catch {
          failures.push(`gastos de ${d.name}`);
        }
      }
      if (prefOn(prefs, 'bills')) {
        try {
          for (const p of await src.bills(camaraId, 5)) {
            out.push({
              id: `prop:${p.id}:${camaraId}`, ts: p.date || new Date().toISOString(), kind: 'proposicao', politicianId: d.id, url: p.url,
              text: `${d.name} (${d.party}/${d.uf}) é autor(a) do ${p.type} ${p.number}/${p.year} — ${short(p.summary, 120)}`,
            });
          }
        } catch {
          failures.push(`projetos de ${d.name}`);
        }
      }
    });
  }

  out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return { alerts: out, failures };
}
