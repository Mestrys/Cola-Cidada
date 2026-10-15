// Painel público: todos os cargos abertos para consulta, sem a pessoa escolher nada antes. Cada item já vem no
// formato guardado ao acompanhar (Politician), então abrir o perfil e acompanhar usam o mesmo objeto.
import executivo from '@/data/executivo.json';
import federation from '@/data/federation.json';
import cidades from '@/data/cidades.json';
import { CAPITALS, POLOS, STATES } from '@/data';
import poloMayors from '@/data/prefeitos-cidades.json';
import stf from '@/data/stf.json';

import { allDeputies, allSenators } from './api';
import { defaultMandate } from './mandate';
import type { Politician } from './types';

export type SectionKey = 'presidencia' | 'stf' | 'senado' | 'camara' | 'governadores' | 'assembleias' | 'prefeitos' | 'vereadores' | 'orgaos';

export interface Section {
  key: SectionKey;
  label: string;
  hint: string;
  /** a lista é por estado: sem UF escolhida não há o que mostrar */
  requiresUf?: boolean;
  /** dá para filtrar por estado */
  byUf?: boolean;
}

export const SECTIONS: Section[] = [
  { key: 'presidencia', label: 'Presidência', hint: 'Presidente da República' },
  { key: 'stf', label: 'STF', hint: 'Ministros do Supremo Tribunal Federal' },
  { key: 'senado', label: 'Senado', hint: 'Senadores em exercício', byUf: true },
  { key: 'camara', label: 'Câmara', hint: 'Deputados federais em exercício', byUf: true },
  { key: 'governadores', label: 'Governadores', hint: 'Governadores dos 26 estados e do DF', byUf: true },
  { key: 'assembleias', label: 'Assembleias', hint: 'Deputados estaduais e distritais', byUf: true, requiresUf: true },
  { key: 'prefeitos', label: 'Prefeitos', hint: 'Prefeitos das 26 capitais e das duas maiores cidades de cada estado (por PIB)', byUf: true },
  { key: 'vereadores', label: 'Vereadores', hint: 'Vereadores das capitais e das duas maiores cidades de cada estado (por PIB)', byUf: true, requiresUf: true },
  { key: 'orgaos', label: 'Contas', hint: 'Receitas, despesas e gasto com pessoal de cada órgão, direto do Tesouro Nacional', byUf: true, requiresUf: true },
];

export interface FederationUnit {
  uf: string;
  name: string;
  capital: string;
  hasCouncil: boolean;
}
export const UNITS = federation as unknown as FederationUnit[];
export const ufName = (uf: string) => UNITS.find((u) => u.uf === uf)?.name ?? uf;

export interface City {
  ibge: number;
  nome: string;
  uf: string;
  kind: 'capital' | 'polo';
  rankPib: number;
  pib: number;
  populacao: number | null;
  pibPerCapita: number | null;
}
const CITY_DATA = cidades as unknown as { pibAno: number; populacaoAno: number; cidades: City[] };
export const CITIES = CITY_DATA.cidades;
export const CITY_YEARS = { pib: CITY_DATA.pibAno, populacao: CITY_DATA.populacaoAno };
/** Contexto da cidade (IBGE): vale para capitais e cidades-polo. */
export const cityFacts = (uf: string, name?: string) => CITIES.find((c) => c.uf === uf && c.nome === name);

export const CHECKED_AT = (executivo as { consultadoEm?: string }).consultadoEm ?? '';
export const STF_VACANCY = (stf as { vaga?: string }).vaga ?? '';

/**
 * Quem já apareceu no Painel nesta sessão, por id: o perfil abre por id (rota /politico/[id]) e encontra aqui
 * quem a pessoa ainda não acompanha.
 */
const seen = new Map<string, Politician>();
export const findSeen = (id: string) => seen.get(id);
function remember(list: Politician[]) {
  for (const p of list) seen.set(p.id, p);
  return list;
}

const fromExecutive = (e: any): Politician => ({ ...e, uf: e.state, mandate: e.mandate ?? null });

export async function loadSection(key: SectionKey, uf = ''): Promise<Politician[]> {
  const exe = executivo as any;
  switch (key) {
    case 'presidencia':
      return remember(exe.presidente.map(fromExecutive));
    case 'governadores':
      return remember(exe.governadores.map(fromExecutive));
    case 'prefeitos':
      return remember([...exe.prefeitos, ...(poloMayors as any[])].map(fromExecutive));
    case 'stf':
      return remember((stf as any).ministros.map((m: any) => ({ ...m, uf: 'BR', mandate: null })));
    case 'senado':
      return remember(
        (await allSenators()).map((s) => ({
          id: `senado-${s.senadoId}`,
          source: 'senado',
          senadoId: s.senadoId,
          name: s.name,
          fullName: s.fullName,
          party: s.party,
          uf: s.uf,
          photo: s.photo,
          roleKey: 'senador',
          mandate: s.mandate ?? defaultMandate('senador'),
        }))
      );
    case 'camara':
      return remember(
        (await allDeputies()).map((d) => ({
          id: `camara-${d.camaraId}`,
          source: 'camara',
          camaraId: d.camaraId,
          name: d.name,
          party: d.party,
          uf: d.uf,
          photo: d.photo,
          roleKey: 'dep-federal',
          mandate: defaultMandate('dep-federal'),
        }))
      );
    case 'assembleias': {
      const load = STATES[uf.toLowerCase()];
      if (!load) return [];
      return remember(
        load().map((d: any) => ({ ...d, uf: d.state || uf, roleKey: 'dep-estadual', mandate: defaultMandate('dep-estadual', d.state || uf) }))
      );
    }
    case 'orgaos':
      return []; // a aba Contas lista órgãos, não pessoas (src/lib/contas.ts)
    case 'vereadores': {
      const capital = CAPITALS[uf.toLowerCase()];
      if (!capital) return [];
      const polos = POLOS[uf.toLowerCase()];
      return remember([...capital(), ...(polos ? polos() : [])].map((c: any) => ({ ...c, uf: c.state || uf, roleKey: 'vereador', mandate: defaultMandate('vereador') })));
    }
  }
}

/** Onde a pessoa atua, para a linha de apoio do cartão. */
export function placeOf(p: Politician): string {
  if (p.roleKey === 'presidente') return 'Brasil';
  if (p.roleKey === 'ministro-stf') return p.cargo || 'Supremo Tribunal Federal';
  if (p.roleKey === 'prefeito' || p.roleKey === 'vereador') return [p.city, p.uf].filter(Boolean).join(' · ');
  return ufName(p.uf);
}

const fold = (s?: string) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Busca sem acento por nome, nome completo, partido, cidade, UF ou nome do estado. */
export function matches(p: Politician, query: string): boolean {
  const q = fold(query).trim();
  if (!q) return true;
  return [p.name, p.fullName, p.party, p.uf, p.city, ufName(p.uf)].some((v) => fold(v).includes(q));
}
