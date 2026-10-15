// Gastos por Poder (Executivo, Legislativo e Judiciário): despesa com pessoal de cada ente monitorado e quanto do
// limite da LRF ela consome. Instantâneo do RGF (Siconfi) gerado por scripts/build-poderes.mjs do PWA.
import data from '@/data/poderes.json';

export type PowerKey = 'E' | 'L' | 'J';
export interface Organ {
  nome: string;
  liquida: number | null;
  limite: number | null;
}
export interface PowerData {
  ano: number;
  periodo: number;
  liquida: number;
  bruta: number | null;
  limite: number | null;
  pctRcl: number | null;
  uso: number | null;
  orgaosTotal: number;
  orgaos: Organ[];
  nota?: string;
}
export interface Ente {
  chave: string;
  tipo: 'uniao' | 'estado' | 'capital' | 'polo';
  nome: string;
  uf: string | null;
  ibge: number;
  poderes: Partial<Record<PowerKey, PowerData | null>>;
  funcoes: Funcoes | null;
}
export interface Funcoes {
  ano: number;
  total: number;
  legislativa: number;
  judiciaria: number;
  essencial: number;
  encargos: number;
  demais: number;
}
export type FunctionKey = 'legislativa' | 'judiciaria' | 'essencial' | 'encargos' | 'demais';

export const POWERS: { key: PowerKey; name: string }[] = [
  { key: 'E', name: 'Executivo' },
  { key: 'L', name: 'Legislativo' },
  { key: 'J', name: 'Judiciário' },
];

// Teto da despesa com pessoal de cada Poder nos estados, em % da receita corrente líquida (LRF, art. 20, II).
export const STATE_LIMITS: Record<PowerKey, number> = { E: 49, L: 3, J: 6 };

const all = data as unknown as { geradoEm: string; entes: Ente[] };
export const PODERES_GERADO_EM = all.geradoEm;

export type StatusKey = 'dentro' | 'alerta' | 'prudencial' | 'acima' | 'sem';
// A LRF dá o alerta aos 90% do limite, veda novas despesas aos 95% (limite prudencial) e fixa o teto aos 100%.
export function status(uso: number | null): { key: StatusKey; label: string } {
  if (uso == null) return { key: 'sem', label: 'limite não informado' };
  if (uso > 1) return { key: 'acima', label: 'acima do limite informado' };
  if (uso >= 0.95) return { key: 'prudencial', label: 'acima do limite prudencial' };
  if (uso >= 0.9) return { key: 'alerta', label: 'em alerta' };
  return { key: 'dentro', label: 'dentro do limite' };
}

export const kindLabel = (e: Ente) => ({ uniao: 'União', estado: 'Estado', capital: 'Capital', polo: 'Cidade-polo' })[e.tipo];

/** A União e, do estado escolhido, o governo, a capital e as duas cidades-polo. */
export function entesFor(uf: string): Ente[] {
  const order = { estado: 0, capital: 1, polo: 2 } as Record<string, number>;
  return [
    ...all.entes.filter((e) => e.tipo === 'uniao'),
    ...all.entes.filter((e) => e.uf === uf).sort((a, b) => order[a.tipo] - order[b.tipo] || a.nome.localeCompare(b.nome, 'pt-BR')),
  ];
}

/** Estados do mais para o menos pesado de um Poder (% da receita corrente líquida); sem dados vão ao fim. */
export function rankStates(poder: PowerKey): { ente: Ente; p: PowerData | null }[] {
  return all.entes
    .filter((e) => e.tipo === 'estado')
    .map((ente) => ({ ente, p: ente.poderes[poder] ?? null }))
    .sort((a, b) => (b.p?.pctRcl ?? -1) - (a.p?.pctRcl ?? -1));
}

// Despesa liquidada por função de governo (DCA, Anexo I-E): o gasto total, não só pessoal. Função não é Poder:
// aposentadorias e outros gastos de um Poder podem estar em outras funções.
export const FUNCTIONS: { key: FunctionKey; name: string; hint: string }[] = [
  { key: 'legislativa', name: 'Legislativa', hint: 'casas legislativas e tribunais de contas' },
  { key: 'judiciaria', name: 'Judiciária', hint: 'tribunais e justiça' },
  { key: 'essencial', name: 'Essencial à Justiça', hint: 'Ministério Público e Defensoria' },
  { key: 'encargos', name: 'Encargos especiais', hint: 'dívida e transferências' },
  { key: 'demais', name: 'Demais funções', hint: 'saúde, educação, segurança, administração… (o Executivo)' },
];

/** Linhas de um ente: valor e fatia do total de cada função (só as que têm gasto). */
export function functionRows(f: Funcoes | null | undefined) {
  if (!f?.total) return [];
  return FUNCTIONS.map((fn) => ({ ...fn, valor: f[fn.key], pct: f[fn.key] / f.total })).filter((r) => r.valor > 0);
}

/** Estados pela fatia da despesa total que vai a uma função, da maior para a menor. */
export function rankFunction(key: FunctionKey) {
  return all.entes
    .filter((e) => e.tipo === 'estado')
    .map((ente) => ({ ente, f: ente.funcoes, valor: ente.funcoes?.[key] ?? null, pct: ente.funcoes?.total ? ente.funcoes[key] / ente.funcoes.total : null }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}
