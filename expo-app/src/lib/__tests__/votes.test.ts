import { clearApiCache } from '../api';
import { confront, loadCamaraComparison, loadSenateComparison, thematicCategory } from '../votes';
import type { CamaraVoting, Politician } from '../types';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
  clearApiCache();
});

const dep = (id: number): Politician => ({ id: `camara-${id}`, source: 'camara', camaraId: id, name: `Dep ${id}`, party: 'X', uf: 'SP', roleKey: 'dep-federal' });
const sen = (id: number): Politician => ({ id: `senado-${id}`, source: 'senado', senadoId: id, name: `Sen ${id}`, party: 'X', uf: 'SP', roleKey: 'senador' });

describe('thematicCategory', () => {
  it('classifica por tema e cai em geral', () => {
    expect(thematicCategory('Reforma tributária')).toBe('economia');
    expect(thematicCategory('Marco das terras indígenas')).toBe('meio-ambiente');
    expect(thematicCategory('Texto qualquer')).toBe('geral');
  });
});

describe('loadCamaraComparison', () => {
  it('cruza o voto do deputado e conta o placar', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/votos')) {
        return ok({ dados: [{ tipoVoto: 'Sim', deputado_: { id: 1 } }, { tipoVoto: 'Não', deputado_: { id: 2 } }, { tipoVoto: 'Abstenção', deputado_: { id: 3 } }] });
      }
      return ok({ dados: [{ id: 'v1', descricao: 'Projeto de saúde', aprovacao: 1, data: '2026-01-02' }, { id: 'v2', aprovacao: null }] });
    });
    const rows = await loadCamaraComparison([dep(1), dep(9)], 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].tally).toEqual({ Sim: 1, Não: 1, Outros: 1 });
    expect(rows[0].byPol).toEqual({ 'camara-1': 'Sim', 'camara-9': null });
    expect(rows[0].category).toBe('social-saude');
    expect(rows[0].approved).toBe(true);
  });
});

describe('loadSenateComparison', () => {
  it('lista só votações em que algum senador acompanhado votou', async () => {
    fetchMock.mockResolvedValue(
      ok([
        { codigoSessaoVotacao: 1, identificacao: 'PL 1/2026', ementa: 'Segurança', dataSessao: '2026-02-01', resultadoVotacao: 'A', votos: [{ codigoParlamentar: 7, siglaVotoParlamentar: 'Sim', descricaoVotoParlamentar: 'Sim' }, { codigoParlamentar: 8, siglaVotoParlamentar: 'Não' }] },
        { codigoSessaoVotacao: 2, identificacao: 'PL 2/2026', dataSessao: '2026-03-01', votos: [{ codigoParlamentar: 8, siglaVotoParlamentar: 'Sim' }] },
        { codigoSessaoVotacao: 3, identificacao: 'PL 3/2026', dataSessao: '2026-04-01', votos: [{ codigoParlamentar: 7, siglaVotoParlamentar: 'NA' }] },
      ])
    );
    const rows = await loadSenateComparison([sen(7)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ matter: 'PL 1/2026', result: 'Aprovado', yes: 1, no: 1, category: 'seguranca' });
    expect(rows[0].bySenator).toEqual({ 'senado-7': 'Sim' });
  });
});

describe('confront', () => {
  const row = (id: string, a: string | null, b: string | null): CamaraVoting => ({ id, descricao: id, data: '', siglaOrgao: '', approved: true, tally: { Sim: 0, Não: 0, Outros: 0 }, byPol: { A: a, B: b }, category: 'geral' });
  it('calcula a convergência só onde os dois votaram', () => {
    const r = confront([row('1', 'Sim', 'sim'), row('2', 'Sim', 'Não'), row('3', null, 'Sim'), row('4', 'Não', 'Não')], 'A', 'B');
    expect(r).toMatchObject({ matches: 2, diffs: 1, pct: 67 });
    expect(r.items).toHaveLength(3);
  });
  it('sem votos em comum, 0%', () => {
    expect(confront([row('1', null, null)], 'A', 'B')).toMatchObject({ pct: 0, items: [] });
  });
});
