import { findSeen, loadSection, matches, placeOf, SECTIONS } from '../directory';
import type { Politician } from '../types';

const base = { source: 'x', party: 'PT', uf: 'MG', roleKey: 'prefeito', city: 'Belo Horizonte' } as const;

describe('Painel público', () => {
  it('cobre do Presidente aos vereadores das capitais', () => {
    expect(SECTIONS.map((s) => s.key)).toEqual(['presidencia', 'stf', 'senado', 'camara', 'governadores', 'assembleias', 'prefeitos', 'vereadores', 'orgaos']);
  });

  it('busca sem acento por nome, partido, cidade e estado', () => {
    const p: Politician = { ...base, id: 'a', name: 'Pref. Álvaro Damião', party: 'UNIÃO' };
    expect(matches(p, 'alvaro')).toBe(true);
    expect(matches(p, 'uniao')).toBe(true);
    expect(matches(p, 'belo')).toBe(true);
    expect(matches(p, 'minas')).toBe(true);
    expect(matches(p, 'recife')).toBe(false);
    expect(placeOf(p)).toBe('Belo Horizonte · MG');
  });

  it('governadores e prefeitos vêm dos dados locais, com quem ocupa o cargo hoje', async () => {
    const govs = await loadSection('governadores');
    expect(govs).toHaveLength(27);
    expect(new Set(govs.map((g) => g.uf)).size).toBe(27);
    const swapped = govs.filter((g) => g.eleitoPeloTse);
    expect(swapped.length).toBeGreaterThan(0);
    for (const g of swapped) expect(g.tse).toBeUndefined();
    expect(await loadSection('prefeitos')).toHaveLength(26);
  });

  it('assembleia e câmara são por estado, e quem apareceu no Painel pode abrir o perfil', async () => {
    const mg = await loadSection('assembleias', 'MG');
    expect(mg).toHaveLength(77);
    expect(mg.every((d) => d.roleKey === 'dep-estadual' && d.uf === 'MG')).toBe(true);
    expect(findSeen(mg[0].id)).toBe(mg[0]);
    expect(await loadSection('vereadores', 'DF')).toEqual([]);
    const stf = await loadSection('stf');
    expect(stf.every((m) => m.roleKey === 'ministro-stf' && m.mandate === null)).toBe(true);
  });
});
