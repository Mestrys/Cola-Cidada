import { CITIES, cityFacts, findSeen, loadSection, matches, placeOf, SECTIONS, UNITS } from '../directory';
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
    const prefeitos = await loadSection('prefeitos');
    // 26 capitais + 2 cidades-polo em cada um dos 26 estados com capital municipal
    expect(prefeitos).toHaveLength(78);
    expect(prefeitos.filter((p) => p.uf === 'SC').map((p) => p.city).sort()).toEqual(['Florianópolis', 'Itajaí', 'Joinville']);
  });

  it('assembleia e câmara são por estado, e quem apareceu no Painel pode abrir o perfil', async () => {
    const mg = await loadSection('assembleias', 'MG');
    expect(mg).toHaveLength(77);
    expect(mg.every((d) => d.roleKey === 'dep-estadual' && d.uf === 'MG')).toBe(true);
    expect(findSeen(mg[0].id)).toBe(mg[0]);
    expect(await loadSection('vereadores', 'DF')).toEqual([]);
    const sc = await loadSection('vereadores', 'SC');
    expect([...new Set(sc.map((v) => v.city))].sort()).toEqual(['Florianópolis', 'Itajaí', 'Joinville']);
    expect(sc.every((v) => v.roleKey === 'vereador' && v.uf === 'SC')).toBe(true);
    const stf = await loadSection('stf');
    expect(stf.every((m) => m.roleKey === 'ministro-stf' && m.mandate === null)).toBe(true);
  });
});

describe('cidades', () => {
  it('cada estado com capital tem a capital e duas cidades-polo ordenadas por PIB; o contexto vem do IBGE', () => {
    expect(CITIES).toHaveLength(78);
    for (const u of UNITS.filter((x) => x.hasCouncil)) {
      const list = CITIES.filter((c) => c.uf === u.uf);
      expect(list.map((c) => c.kind)).toEqual(['capital', 'polo', 'polo']);
      expect(list[1].pib).toBeGreaterThanOrEqual(list[2].pib);
    }
    const itajai = cityFacts('SC', 'Itajaí')!;
    expect(itajai.rankPib).toBe(2);
    expect(cityFacts('DF', 'Brasília')).toBeUndefined();
  });
});
