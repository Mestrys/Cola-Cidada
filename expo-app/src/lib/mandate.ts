import type { Politician, RoleKey } from './types';

export const ROLES: Record<RoleKey, { label: string; term: number }> = {
  presidente: { label: 'Presidente', term: 4 },
  governador: { label: 'Governador(a)', term: 4 },
  senador: { label: 'Senador(a)', term: 8 },
  'dep-federal': { label: 'Deputado(a) Federal', term: 4 },
  'dep-estadual': { label: 'Deputado(a) Estadual', term: 4 },
  vereador: { label: 'Vereador(a)', term: 4 },
};

/**
 * Mandatos eleitos em 2022 começam em 1/jan/2023 (Presidente e Governadores) ou 1/fev/2023
 * (Legislativo federal e estadual) e terminam 4 anos depois. Senadores eleitos em 2018 terminam em
 * 31/jan/2027 e os de 2022, em 31/jan/2031. Vereadores eleitos em 2024: 1/jan/2025 a 31/dez/2028.
 */
export function defaultMandate(role: RoleKey, uf?: string): [string, string] | undefined {
  const dates: Record<RoleKey, [string, string]> = {
    presidente: ['2023-01-01', '2026-12-31'],
    governador: ['2023-01-01', '2026-12-31'],
    'dep-federal': ['2023-02-01', '2027-01-31'],
    // a ALESP tomou posse em 15/mar/2023 e antecipou a posse seguinte para 1/fev/2027
    'dep-estadual': String(uf || '').toUpperCase() === 'SP' ? ['2023-03-15', '2027-01-31'] : ['2023-02-01', '2027-01-31'],
    senador: ['2023-02-01', '2031-01-31'],
    vereador: ['2025-01-01', '2028-12-31'],
  };
  return dates[role];
}

const DAY_MS = 86_400_000;

/** AAAA-MM-DD → dd/mm/aaaa, sem depender de Intl (que varia entre os motores JS). */
export function formatDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export interface MandateProgress {
  /** 0 a 100 */
  pct: number;
  label: string;
  end?: string;
  ended?: boolean;
}

export function mandateProgress(p: Pick<Politician, 'mandate' | 'roleKey' | 'uf'>, now: Date = new Date()): MandateProgress {
  const [start, end] = p.mandate ?? defaultMandate(p.roleKey, p.uf) ?? [];
  if (!start || !end) return { pct: 0, label: '—' };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const pct = Math.max(0, Math.min(100, ((now.getTime() - s) / (e - s)) * 100));
  const left = Math.ceil((e - now.getTime()) / DAY_MS);
  return {
    pct: Math.round(pct),
    label: left > 0 ? `${left} dias restantes` : 'Mandato encerrado',
    end: formatDate(end),
    ended: left <= 0,
  };
}
