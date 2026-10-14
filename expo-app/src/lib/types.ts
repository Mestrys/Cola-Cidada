export type RoleKey = 'presidente' | 'governador' | 'senador' | 'dep-federal' | 'dep-estadual' | 'vereador';

/** Político acompanhado. Mesmo formato do PWA, para um dia poder importar e exportar os mesmos dados. */
export interface Politician {
  id: string; // 'camara-160561' | 'senado-5012' | 'manual-…'
  source: 'camara' | 'senado' | 'manual' | string;
  camaraId?: number;
  senadoId?: number;
  name: string;
  party: string;
  uf: string;
  photo?: string;
  roleKey: RoleKey;
  /** [início, fim] do mandato em AAAA-MM-DD */
  mandate?: [string, string];
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
