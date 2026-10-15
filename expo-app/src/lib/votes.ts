// Votações nominais abertas: o voto de todos os parlamentares (dado público) e, à parte, o de quem a pessoa acompanha.
// Lógica do PWA (src/votes.js).
import { recentNominalVotings, senateNominalVotings, senateWindow, votesOf } from './api';
import type { CamaraVoting, CastVote, Category, Politician, SenateVoting } from './types';

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

/** A API da Câmara derruba conexões em rajadas: no máximo `limit` consultas ao mesmo tempo, na ordem original. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

type Tally = { Sim: number; Não: number; Outros: number };
const bucket = (vote: string): keyof Tally => (vote === 'Sim' || vote === 'Não' ? vote : 'Outros');

const tallyOf = (votes: CastVote[]): Tally => {
  const t: Tally = { Sim: 0, Não: 0, Outros: 0 };
  for (const v of votes) t[bucket(v.vote)]++;
  return t;
};

export interface PartyRow extends Tally {
  party: string;
  total: number;
}

/** Quantos de cada partido votaram Sim, Não ou outra coisa, maiores bancadas primeiro. */
export function partyBreakdown(votes: CastVote[]): PartyRow[] {
  const map = new Map<string, PartyRow>();
  for (const v of votes) {
    const key = v.party || 'Sem partido';
    const row = map.get(key) ?? { party: key, Sim: 0, Não: 0, Outros: 0, total: 0 };
    row[bucket(v.vote)]++;
    row.total++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.party.localeCompare(b.party, 'pt-BR'));
}

export async function loadCamaraComparison(politicians: Politician[] = [], limit = 8): Promise<CamaraVoting[]> {
  const deputies = politicians.filter((p) => p.camaraId);
  // só votações nominais do Plenário: as simbólicas não têm lista de votos
  const votings = await recentNominalVotings(limit + 4);
  const results = await mapLimit(votings, 3, async (v): Promise<CamaraVoting | null> => {
    try {
      const raw = await votesOf(v.id);
      if (!raw.length) return null;
      const votes: CastVote[] = raw.map((x: any) => ({
        id: x.deputado_?.id,
        name: x.deputado_?.nome || 'Deputado(a)',
        party: x.deputado_?.siglaPartido || '',
        uf: x.deputado_?.siglaUf || '',
        vote: x.tipoVoto,
      }));
      const byPol: Record<string, string | null> = {};
      for (const d of deputies) byPol[d.id] = votes.find((x) => x.id === d.camaraId)?.vote ?? null;
      return {
        id: String(v.id),
        descricao: v.descricao || 'Votação nominal no Plenário',
        data: v.data,
        siglaOrgao: v.siglaOrgao || 'Câmara',
        approved: v.aprovacao === 1,
        tally: tallyOf(votes),
        votes,
        byPol,
        category: thematicCategory(v.descricao || ''),
      };
    } catch {
      return null; // uma votação com falha não derruba a lista
    }
  });
  return results.filter((r): r is CamaraVoting => r !== null).slice(0, limit);
}

/** "…, em primeiro turno." → "1º turno": a mesma matéria tem votações diferentes por turno. */
export function roundOf(description = ''): string {
  const m = description.match(/em (primeiro|segundo|terceiro|único) turno/i)?.[1]?.toLowerCase();
  return m ? { primeiro: '1º turno', segundo: '2º turno', terceiro: '3º turno', único: 'turno único' }[m]! : '';
}

const SENATE_RESULT: Record<string, string> = { A: 'Aprovado', R: 'Rejeitado' };

/** Votações do Plenário do Senado com o voto de cada senador presente; voto secreto aparece como tal. */
export async function loadSenateVotings(politicians: Politician[] = [], limit = 10): Promise<SenateVoting[]> {
  const senators = politicians.filter((p) => p.senadoId);
  const { since, until } = senateWindow();
  const votings = await senateNominalVotings(since, until);
  return votings
    .filter((v) => (v.votos || []).length)
    .sort((a, b) => String(b.dataSessao).localeCompare(String(a.dataSessao)))
    .slice(0, limit)
    .map((v) => {
      const secret = v.votacaoSecreta === 'S';
      const votes: CastVote[] = (v.votos || [])
        .filter((x: any) => x.siglaVotoParlamentar && x.siglaVotoParlamentar !== 'NA')
        .map((x: any) => ({
          id: x.codigoParlamentar,
          name: x.nomeParlamentar || 'Senador(a)',
          party: x.siglaPartidoParlamentar || '',
          uf: x.siglaUFParlamentar || '',
          vote: secret && x.siglaVotoParlamentar === 'Votou' ? 'Voto secreto' : x.siglaVotoParlamentar,
        }));
      const tally = tallyOf(votes);
      const bySenator: Record<string, string | null> = {};
      for (const s of senators) bySenator[s.id] = votes.find((x) => x.id === s.senadoId)?.vote ?? null;
      const matter = v.identificacao || 'Matéria';
      const summary = v.ementa || v.descricaoVotacao || '';
      return {
        key: String(v.codigoSessaoVotacao ?? `${matter}-${v.dataSessao}`),
        matter,
        summary,
        date: v.dataSessao || '',
        result: SENATE_RESULT[v.resultadoVotacao] || v.resultadoVotacao || '',
        secret,
        round: roundOf(v.descricaoVotacao),
        yes: Number(v.totalVotosSim ?? tally.Sim) || tally.Sim,
        no: Number(v.totalVotosNao ?? tally.Não) || tally.Não,
        votes,
        tally,
        bySenator,
        category: thematicCategory(`${matter} ${summary}`),
      };
    });
}

export interface Confrontation {
  matches: number;
  diffs: number;
  pct: number;
  items: { id: string; matter: string; date: string; voteA: string; voteB: string; same: boolean }[];
}

/** Compara dois deputados (por id da Câmara) nas votações em que ambos votaram. */
export function confront(rows: CamaraVoting[], aId: number, bId: number): Confrontation {
  const items: Confrontation['items'] = [];
  for (const r of rows) {
    const voteA = r.votes.find((x) => x.id === aId)?.vote;
    const voteB = r.votes.find((x) => x.id === bId)?.vote;
    if (!voteA || !voteB) continue;
    items.push({ id: r.id, matter: r.descricao, date: r.data, voteA, voteB, same: voteA.toLowerCase() === voteB.toLowerCase() });
  }
  const matches = items.filter((i) => i.same).length;
  const diffs = items.length - matches;
  return { matches, diffs, pct: items.length ? Math.round((matches / items.length) * 100) : 0, items };
}
