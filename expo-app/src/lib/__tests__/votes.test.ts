import { clearApiCache } from '../api';
import { confront, loadCamaraComparison, loadSenateVotings, mapLimit, partyBreakdown, roundOf, thematicCategory } from '../votes';
import type { CamaraVoting, CastVote, Politician } from '../types';

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
  it('traz o voto de todos os deputados e, à parte, o de quem se acompanha; só votações nominais', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/votos')) {
        return ok({
          dados: [
            { tipoVoto: 'Sim', deputado_: { id: 1, nome: 'Ana', siglaPartido: 'PT', siglaUf: 'SP' } },
            { tipoVoto: 'Não', deputado_: { id: 2, nome: 'Bruno', siglaPartido: 'PL', siglaUf: 'RJ' } },
            { tipoVoto: 'Abstenção', deputado_: { id: 3, nome: 'Carla', siglaPartido: 'PT', siglaUf: 'BA' } },
          ],
        });
      }
      // a API é paginada: só a primeira página tem votações; a simbólica (sem "Sim: N") não entra
      return ok({
        dados: /pagina=1(&|$)/.test(url)
          ? [
              { id: 'v1', descricao: 'Projeto de saúde. Sim: 1; Não: 1; Total: 3.', aprovacao: 1, data: '2026-01-02' },
              { id: 'v2', descricao: 'Aprovado por votação simbólica.', aprovacao: 1 },
              { id: 'v3', descricao: 'Sem resultado. Sim: 0;', aprovacao: null },
            ]
          : [],
      });
    });
    const rows = await loadCamaraComparison([dep(1), dep(9)], 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].tally).toEqual({ Sim: 1, Não: 1, Outros: 1 });
    expect(rows[0].votes).toHaveLength(3);
    expect(rows[0].byPol).toEqual({ 'camara-1': 'Sim', 'camara-9': null });
    expect(rows[0].category).toBe('social-saude');
    // sem ninguém acompanhado, a lista continua completa
    expect((await loadCamaraComparison([], 5))[0].votes).toHaveLength(3);
  });
});

describe('loadSenateVotings', () => {
  it('mostra todas as votações, tira os ausentes e avisa de voto secreto', async () => {
    fetchMock.mockResolvedValue(
      ok([
        { codigoSessaoVotacao: 1, identificacao: 'PL 1/2026', ementa: 'Segurança', dataSessao: '2026-02-01', resultadoVotacao: 'A', votacaoSecreta: 'N', votos: [{ codigoParlamentar: 7, nomeParlamentar: 'Davi', siglaVotoParlamentar: 'Sim' }, { codigoParlamentar: 8, nomeParlamentar: 'Eva', siglaVotoParlamentar: 'Não' }, { codigoParlamentar: 9, siglaVotoParlamentar: 'NA' }] },
        { codigoSessaoVotacao: 2, identificacao: 'PDL 2/2026', dataSessao: '2026-03-01', votacaoSecreta: 'S', votos: [{ codigoParlamentar: 8, siglaVotoParlamentar: 'Votou' }] },
        { codigoSessaoVotacao: 3, identificacao: 'PL 3/2026', dataSessao: '2026-04-01', votos: [] },
      ])
    );
    const rows = await loadSenateVotings([sen(7)]);
    expect(rows.map((r) => r.matter)).toEqual(['PDL 2/2026', 'PL 1/2026']); // mais recente primeiro; a sem votos sai
    expect(rows[0]).toMatchObject({ secret: true });
    expect(rows[0].votes[0].vote).toBe('Voto secreto');
    expect(rows[1]).toMatchObject({ result: 'Aprovado', yes: 1, no: 1, category: 'seguranca' });
    expect(rows[1].votes).toHaveLength(2); // NA fora
    expect(rows[1].bySenator).toEqual({ 'senado-7': 'Sim' });
  });
});

describe('partyBreakdown', () => {
  it('separa Sim, Não e o resto, maiores bancadas primeiro', () => {
    const v = (party: string, vote: string): CastVote => ({ name: 'x', party, uf: 'SP', vote });
    const rows = partyBreakdown([v('PT', 'Sim'), v('PT', 'Sim'), v('PL', 'Não'), v('PT', 'Obstrução'), v('', 'Abstenção')]);
    expect(rows[0]).toEqual({ party: 'PT', Sim: 2, Não: 0, Outros: 1, total: 3 });
    expect(rows.map((r) => r.party)).toEqual(['PT', 'PL', 'Sem partido']);
  });
});

describe('mapLimit', () => {
  it('mantém a ordem e nunca passa do limite de consultas simultâneas', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 3, 2, 4], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 30, 20, 40]);
    expect(peak).toBe(2);
  });
});

describe('confront', () => {
  const vote = (id: number, v?: string): CastVote[] => (v ? [{ id, name: String(id), party: 'X', uf: 'SP', vote: v }] : []);
  const row = (id: string, a?: string, b?: string): CamaraVoting => ({
    id, descricao: id, data: '', siglaOrgao: '', approved: true, tally: { Sim: 0, Não: 0, Outros: 0 },
    votes: [...vote(1, a), ...vote(2, b)], byPol: {}, category: 'geral',
  });
  it('compara dois deputados quaisquer, só onde os dois votaram', () => {
    const r = confront([row('1', 'Sim', 'sim'), row('2', 'Sim', 'Não'), row('3', undefined, 'Sim'), row('4', 'Não', 'Não')], 1, 2);
    expect(r).toMatchObject({ matches: 2, diffs: 1, pct: 67 });
    expect(r.items).toHaveLength(3);
  });
  it('sem votos em comum, 0%', () => {
    expect(confront([row('1')], 1, 2)).toMatchObject({ pct: 0, items: [] });
  });
});

describe('roundOf', () => {
  it('diz o turno quando a descrição diz, para distinguir votações da mesma matéria', () => {
    expect(roundOf('Votação nominal da PEC nº 221, de 2019, em primeiro turno.')).toBe('1º turno');
    expect(roundOf('Votação nominal da PEC nº 221, de 2019, em segundo turno.')).toBe('2º turno');
    expect(roundOf('Votação nominal do PL 1/2026')).toBe('');
    expect(roundOf(undefined)).toBe('');
  });
});
