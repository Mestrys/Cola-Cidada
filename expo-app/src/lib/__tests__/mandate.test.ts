import { defaultMandate, formatDate, mandateProgress, ROLES } from '../mandate';

describe('defaultMandate', () => {
  it('usa as datas oficiais de cada cargo', () => {
    expect(defaultMandate('dep-federal')).toEqual(['2023-02-01', '2027-01-31']);
    expect(defaultMandate('senador')).toEqual(['2023-02-01', '2031-01-31']);
    expect(defaultMandate('vereador')).toEqual(['2025-01-01', '2028-12-31']);
    expect(defaultMandate('governador')).toEqual(['2023-01-01', '2027-01-05']);
  });

  it('deputado estadual de SP começa em 15/03/2023 (posse da ALESP); os demais, em 01/02/2023', () => {
    expect(defaultMandate('dep-estadual', 'SP')).toEqual(['2023-03-15', '2027-01-31']);
    expect(defaultMandate('dep-estadual', 'sp')?.[0]).toBe('2023-03-15');
    expect(defaultMandate('dep-estadual', 'MG')).toEqual(['2023-02-01', '2027-01-31']);
  });

  it('todo cargo tem rótulo; todos, menos ministro do STF, têm mandato', () => {
    for (const k of Object.keys(ROLES) as (keyof typeof ROLES)[]) {
      expect(ROLES[k].label).toBeTruthy();
      if (k === 'ministro-stf') expect(defaultMandate(k)).toBeUndefined();
      else expect(defaultMandate(k)).toBeDefined();
    }
  });

  it('ministro do STF não tem barra de mandato: o cargo é vitalício', () => {
    const m = mandateProgress({ roleKey: 'ministro-stf', uf: 'BR', mandate: null });
    expect(m.open).toBe(true);
    expect(m.label).toMatch(/vitalício/);
  });
});

describe('formatDate', () => {
  it('formata AAAA-MM-DD como dd/mm/aaaa', () => {
    expect(formatDate('2027-01-31')).toBe('31/01/2027');
    expect(formatDate('2027-01-31T00:00:00')).toBe('31/01/2027');
  });
  it('devolve vazio para valores inválidos', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('amanhã')).toBe('');
  });
});

describe('mandateProgress', () => {
  const p = { roleKey: 'dep-federal' as const, uf: 'SP', mandate: ['2023-02-01', '2027-01-31'] as [string, string] };

  it('calcula a porcentagem e os dias restantes', () => {
    const r = mandateProgress(p, new Date('2025-02-01T12:00:00Z'));
    expect(r.pct).toBeGreaterThan(48);
    expect(r.pct).toBeLessThan(52);
    expect(r.label).toMatch(/^\d+ dias restantes$/);
    expect(r.end).toBe('31/01/2027');
    expect(r.ended).toBe(false);
  });

  it('antes do início fica em 0%; depois do fim, em 100% e encerrado', () => {
    expect(mandateProgress(p, new Date('2020-01-01')).pct).toBe(0);
    const done = mandateProgress(p, new Date('2030-01-01'));
    expect(done.pct).toBe(100);
    expect(done.ended).toBe(true);
    expect(done.label).toBe('Mandato encerrado');
  });

  it('sem mandato salvo usa o padrão do cargo', () => {
    const r = mandateProgress({ roleKey: 'senador', uf: 'SP' }, new Date('2027-01-31'));
    expect(r.end).toBe('31/01/2031');
    expect(r.pct).toBeGreaterThan(40);
  });
});
