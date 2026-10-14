export type RoleKey = 'presidente' | 'ministro-stf' | 'governador' | 'prefeito' | 'senador' | 'dep-federal' | 'dep-estadual' | 'vereador';

/** Ficha eleitoral do TSE (só de quem foi eleito; sucessores e ministros do STF não têm). */
export interface TseRecord {
  year: number;
  sq: string;
  ballotNumber: string;
  coalition: string | null;
  declaredAssets: number | null;
  status: string;
}

/**
 * Agente público no formato do PWA: o mesmo objeto aparece no Painel e, se a pessoa quiser, é guardado ao
 * acompanhar. Os campos opcionais existem só para alguns cargos (Executivo, STF, assembleias, câmaras).
 */
export interface Politician {
  id: string; // 'camara-160561' | 'senado-5012' | 'exe-gov-sp' | 'stf-…' | 'sp-…' | 'cm-sp-…'
  source: 'camara' | 'senado' | 'executivo' | 'stf' | string;
  camaraId?: number;
  senadoId?: number;
  name: string;
  fullName?: string;
  party: string;
  uf: string;
  city?: string;
  photo?: string;
  roleKey: RoleKey;
  /** [início, fim] do mandato em AAAA-MM-DD */
  mandate?: [string, string] | null;
  house?: string;
  situacao?: string;
  pageUrl?: string;
  tse?: TseRecord;
  // Executivo: ocupante atual (titulares.json do PWA)
  vice?: { name: string; party?: string };
  condicao?: string;
  desde?: string;
  nota?: string;
  eleitoPeloTse?: { name: string; party: string; year: number };
  // STF
  cargo?: string | null;
  posse?: string;
  indicadoPor?: string;
  aposentadoriaCompulsoria?: number;
}

export interface Alert {
  id: string;
  ts: number;
  politicianId: string;
  text: string;
}

export interface AppState {
  politicians: Politician[];
  alerts: Alert[];
  domicile: { state: string; city: string };
}

export interface DeputyResult {
  camaraId: number;
  name: string;
  party: string;
  uf: string;
  photo?: string;
}

export interface SenatorResult {
  senadoId: number;
  name: string;
  fullName?: string;
  party: string;
  uf: string;
  photo?: string;
  email?: string;
  mandate: [string, string];
}

export interface DeputyProfile {
  civilName: string;
  electoralName: string;
  electoralCondition: string;
  status: string;
  birthDate?: string;
  birthCity: string;
  schooling: string;
  cabinet: { room?: string; building?: string; floor?: string; phone?: string; email?: string } | null;
}

export interface Proposition {
  id: number;
  type: string;
  number: number;
  year: number;
  summary: string;
  date?: string;
  url: string;
}

export interface CamaraVoting {
  id: string;
  descricao: string;
  data: string;
  siglaOrgao: string;
  approved: boolean;
  tally: { Sim: number; Não: number; Outros: number };
  /** voto de cada político acompanhado (id do app); null = ausente */
  byPol: Record<string, string | null>;
  category: Category;
}

export interface SenateVoting {
  key: string;
  matter: string;
  summary: string;
  date: string;
  result: string;
  yes: number;
  no: number;
  /** voto de cada senador acompanhado (id do app) */
  bySenator: Record<string, string>;
  category: Category;
}

export type Category = 'economia' | 'tecnologia' | 'meio-ambiente' | 'social-saude' | 'seguranca' | 'geral';
