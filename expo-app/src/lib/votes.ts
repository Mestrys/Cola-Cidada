// Votações nominais cruzadas com os políticos acompanhados. Lógica do PWA (src/votes.js).
import { recentRollCalls, senateNominalVotings, senateWindow, votesOf } from './api';
import type { CamaraVoting, Category, Politician, SenateVoting } from './types';

const RULES: [Category, string[]][] = [
  ['economia', ['tribut', 'impost', 'financ', 'orçament', 'fiscal', 'receita', 'ldo', 'loa']],
  ['tecnologia', ['inteligência', 'ia', 'tecnolog', 'digital', 'internet', 'dado', 'software']],
  ['meio-ambiente', ['indígen', 'terra', 'ambient', 'florest', 'clima', 'carbon', 'solar']],
  ['social-saude', ['saúde', 'medicament', 'hospital', 'sus', 'educa', 'escola', 'criança', 'idoso']],
  ['seguranca', ['seguran', 'penal', 'crime', 'polícia', 'arm']],
];

export const CATEGORY_LABELS: Record<Category, string> = {
  geral: 'Todas as matérias',
  economia: 'Economia e tributos',
  tecnologia: 'Tecnologia e dados',
  'social-saude': 'Social e saúde',
  'meio-ambiente': 'Meio ambiente e terras',
  seguranca: 'Segurança',
};

export function thematicCategory(text = ''): Category {
  const t = text.toLowerCase();
  return RULES.find(([, words]) => words.some((w) => t.includes(w)))?.[0] ?? 'geral';
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

export async function loadCamaraComparison(politicians: Politician[], limit = 8): Promise<CamaraVoting[]> {
  const deputies = politicians.filter((p) => p.camaraId);
  const votings = await recentRollCalls(limit * 2);
  // Poucas consultas por vez: a API da Câmara derruba conexões sob rajadas, e uma a uma demora demais.
  const results = await mapLimit(votings, 3, async (v): Promise<CamaraVoting | null> => {
    try {
      const votos = await votesOf(v.id);
      if (!votos.length) return null;
      const tally = { Sim: 0, Não: 0, Outros: 0 };
      for (const x of votos) tally[x.tipoVoto === 'Sim' || x.tipoVoto === 'Não' ? (x.tipoVoto as 'Sim' | 'Não') : 'Outros']++;
      const byPol: Record<string, string | null> = {};
      for (const d of deputies) byPol[d.id] = votos.find((x) => x.deputado_?.id === d.camaraId)?.tipoVoto ?? null;
      return {
        id: String(v.id),
        descricao: v.descricao || 'Votação nominal no Plenário',
        data: v.data,
        siglaOrgao: v.siglaOrgao || 'Câmara',
        approved: v.aprovacao === 1,
        tally,
        byPol,
        category: thematicCategory(v.descricao || ''),
      };
    } catch {
      return null; // uma votação com falha não derruba a lista
    }
  });
  const rows = results.filter((r): r is CamaraVoting => r !== null).slice(0, limit);
  return rows;
}

const SENATE_RESULT: Record<string, string> = { A: 'Aprovado', R: 'Rejeitado' };

export async function loadSenateComparison(politicians: Politician[], limit = 10): Promise<SenateVoting[]> {
  const senators = politicians.filter((p) => p.senadoId);
  if (!senators.length) return [];
  const { since, until } = senateWindow();
  const votings = await senateNominalVotings(since, until);
  const rows: SenateVoting[] = [];
  for (const v of votings) {
    const bySenator: Record<string, string> = {};
    for (const s of senators) {
      const mine = (v.votos || []).find((x: any) => x.codigoParlamentar === s.senadoId);
      if (!mine || mine.siglaVotoParlamentar === 'NA') continue;
      bySenator[s.id] =
        v.votacaoSecreta === 'S' && mine.siglaVotoParlamentar === 'Votou'
          ? 'Voto secreto'
          : mine.descricaoVotoParlamentar || mine.siglaVotoParlamentar;
    }
    if (!Object.keys(bySenator).length) continue;
    const count = (label: string) => (v.votos || []).filter((x: any) => x.siglaVotoParlamentar === label).length;
    const matter = v.identificacao || 'Matéria';
    const summary = v.ementa || v.descricaoVotacao || '';
    rows.push({
      key: String(v.codigoSessaoVotacao ?? `${matter}-${v.dataSessao}`),
      matter,
      summary,
      date: v.dataSessao || '',
      result: SENATE_RESULT[v.resultadoVotacao] || v.resultadoVotacao || '',
      yes: v.totalVotosSim ?? count('Sim'),
      no: v.totalVotosNao ?? count('Não'),
      bySenator,
      category: thematicCategory(`${matter} ${summary}`),
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export interface Confrontation {
  matches: number;
  diffs: number;
  pct: number;
  items: { id: string; matter: string; date: string; voteA: string; voteB: string; same: boolean }[];
}

/** Compara dois deputados nas votações em que ambos votaram. */
export function confront(rows: CamaraVoting[], aId: string, bId: string): Confrontation {
  const items: Confrontation['items'] = [];
  for (const r of rows) {
    const voteA = r.byPol[aId];
    const voteB = r.byPol[bId];
    if (!voteA || !voteB) continue;
    items.push({ id: r.id, matter: r.descricao, date: r.data, voteA, voteB, same: voteA.toLowerCase() === voteB.toLowerCase() });
  }
  const matches = items.filter((i) => i.same).length;
  const diffs = items.length - matches;
  return { matches, diffs, pct: items.length ? Math.round((matches / items.length) * 100) : 0, items };
}
