import { entesFor, kindLabel, POWERS, rankStates, status } from '../poderes';
import data from '@/data/poderes.json';

describe('gastos por Poder', () => {
  it('situação pela LRF: alerta aos 90%, prudencial aos 95%, acima do teto', () => {
    expect(status(0.5).key).toBe('dentro');
    expect(status(0.9).key).toBe('alerta');
    expect(status(0.95).key).toBe('prudencial');
    expect(status(1.0001).key).toBe('acima');
    expect(status(null).key).toBe('sem');
  });

  it('o instantâneo traz a União, 27 estados, 26 capitais e 52 cidades-polo', () => {
    const by = (t: string) => (data as any).entes.filter((e: any) => e.tipo === t).length;
    expect([by('uniao'), by('estado'), by('capital'), by('polo')]).toEqual([1, 27, 26, 52]);
  });

  it('por estado: a União, depois o governo, a capital e as duas cidades-polo; município sem Judiciário', () => {
    const list = entesFor('SP');
    expect(list.map((e) => e.tipo)).toEqual(['uniao', 'estado', 'capital', 'polo', 'polo']);
    expect(list.map(kindLabel)).toEqual(['União', 'Estado', 'Capital', 'Cidade-polo', 'Cidade-polo']);
    expect(Object.keys(list[1].poderes)).toEqual(['E', 'L', 'J']);
    expect(Object.keys(list[2].poderes)).toEqual(['E', 'L']);
    expect(list[0].poderes.E?.nota).toMatch(/não é comparável/);
  });

  it('comparativo: 27 estados, do que mais pesa para o que menos pesa', () => {
    for (const w of POWERS) {
      const rank = rankStates(w.key);
      expect(rank).toHaveLength(27);
      const vals = rank.map((r) => r.p?.pctRcl ?? -1);
      expect(vals).toEqual([...vals].sort((a, b) => b - a));
    }
  });
});
