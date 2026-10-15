// Emendas parlamentares desde 2023 (Portal da Transparência), geradas por scripts/build-emendas.mjs do PWA: por
// parlamentar (emendas individuais) e por cidade monitorada. O dado traz o nome parlamentar do autor, não o código da
// Câmara ou do Senado: a ligação é pelo nome.
import data from '@/data/emendas.json';

export interface YearTotals {
  empenhado: number;
  pago: number;
}
export interface Named {
  nome: string;
  valor: number;
  uf?: string;
}
export interface AuthorEmendas {
  nome: string;
  emendas: number;
  anos: Record<string, YearTotals>;
  especial: number;
  destinos: Named[];
  favorecidos: Named[];
  geradoEm: string;
  desde: number;
}
export interface CityEmendas {
  nome: string;
  emendas: number;
  anos: Record<string, YearTotals>;
  autores: Named[];
  geradoEm: string;
  desde: number;
}

const all = data as unknown as {
  geradoEm: string;
  desde: number;
  autores: Record<string, Omit<AuthorEmendas, 'geradoEm' | 'desde'>>;
  cidades: Record<string, Omit<CityEmendas, 'geradoEm' | 'desde'>>;
};

export const normName = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();

export function authorEmendas(name: string): AuthorEmendas | null {
  const a = all.autores[normName(name)];
  return a ? { ...a, geradoEm: all.geradoEm, desde: all.desde } : null;
}

/** `null` = a cidade não recebeu emendas no período (o resumo só traz as que receberam). */
export function cityEmendas(ibge: number): CityEmendas | null {
  const c = all.cidades[String(ibge)];
  return c ? { ...c, geradoEm: all.geradoEm, desde: all.desde } : null;
}

export const EMENDAS_DESDE = all.desde;
export const EMENDAS_GERADO_EM = all.geradoEm;
