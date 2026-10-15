import { entesFor, FUNCTIONS, functionRows, kindLabel, POWERS, rankFunction, rankStates, status } from '../poderes';
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

  it('despesa por função: as funções fecham o total de cada ente e o comparativo ordena pela fatia', () => {
    for (const e of (data as any).entes) {
      const f = e.funcoes;
      expect(f.total).toBeGreaterThan(0);
      expect(Math.abs(f.legislativa + f.judiciaria + f.essencial + f.encargos + f.demais - f.total)).toBeLessThan(1);
    }
    const rows = functionRows(entesFor('SP')[1].funcoes);
    expect(rows.map((r) => r.key)).toEqual(FUNCTIONS.map((f) => f.key));
    const rank = rankFunction('legislativa');
    expect(rank).toHaveLength(27);
    const pcts = rank.map((r) => r.pct ?? -1);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
    expect(functionRows(null)).toEqual([]);
  });

  it('pessoal maior que a receita do ente é atípico (Santana, AP); acima do limite informado não é', () => {
    expect(status(6, true).key).toBe('atipico');
    expect(status(1.2).key).toBe('acima');
    const santana = entesFor('AP').find((e) => e.nome === 'Santana')!;
    expect(santana.poderes.E?.atipico).toBe(true);
    expect(entesFor('SP')[1].poderes.E?.atipico).toBeUndefined();
  });
});
