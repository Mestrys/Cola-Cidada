import { allSenators, clearApiCache, deputyProfile, deputyPropositions, getJson, searchDeputies, searchSenators } from '../api';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) });

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
  clearApiCache();
});

describe('getJson', () => {
  it('repete 5xx e 429 e devolve a resposta quando volta a funcionar', async () => {
    fetchMock.mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(ok({ a: 1 }));
    await expect(getJson('https://x/1', 1)).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('repete falha de rede', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValueOnce(ok({ b: 2 }));
    await expect(getJson('https://x/2', 1)).resolves.toEqual({ b: 2 });
  });

  it('não repete 404 (erro definitivo)', async () => {
    fetchMock.mockResolvedValue(fail(404));
    await expect(getJson('https://x/3', 1)).rejects.toThrow('HTTP 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('desiste depois de 4 tentativas', async () => {
    fetchMock.mockResolvedValue(fail(500));
    await expect(getJson('https://x/4', 1)).rejects.toThrow('HTTP 500');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('reaproveita a resposta em cache', async () => {
    fetchMock.mockResolvedValue(ok({ c: 3 }));
    await getJson('https://x/5');
    await getJson('https://x/5');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Câmara', () => {
  it('searchDeputies codifica o nome e mapeia os campos', async () => {
    fetchMock.mockResolvedValue(ok({ dados: [{ id: 160561, nome: 'José da Silva', siglaPartido: 'PL', siglaUf: 'SP', urlFoto: 'http://f/1.jpg' }] }));
    const r = await searchDeputies(' José da ');
    expect(fetchMock.mock.calls[0][0]).toContain('nome=Jos%C3%A9%20da');
    expect(r).toEqual([{ camaraId: 160561, name: 'José da Silva', party: 'PL', uf: 'SP', photo: 'http://f/1.jpg' }]);
  });

  it('searchDeputies sem resultados devolve lista vazia', async () => {
    fetchMock.mockResolvedValue(ok({ dados: null }));
    await expect(searchDeputies('zzz')).resolves.toEqual([]);
  });

  it('deputyProfile mapeia gabinete e usa valores padrão', async () => {
    fetchMock.mockResolvedValue(
      ok({ dados: { nomeCivil: 'José', dataNascimento: '1970-01-01', municipioNascimento: 'Santos', ufNascimento: 'SP', ultimoStatus: { nomeEleitoral: 'Zé', gabinete: { sala: '10', predio: '4', andar: '2', telefone: '3215', email: 'dep@camara.leg.br' } } } })
    );
    const p = await deputyProfile(1);
    expect(p).toMatchObject({ electoralName: 'Zé', birthCity: 'Santos/SP', schooling: 'Não informada', electoralCondition: 'Titular', status: 'Exercício' });
    expect(p.cabinet?.email).toBe('dep@camara.leg.br');
  });

  it('deputyPropositions monta o link da ficha de tramitação', async () => {
    fetchMock.mockResolvedValue(ok({ dados: [{ id: 99, siglaTipo: 'PL', numero: 12, ano: 2025, ementa: 'Dispõe…', dataApresentacao: '2025-03-01' }] }));
    const [p] = await deputyPropositions(1, 3);
    expect(fetchMock.mock.calls[0][0]).toContain('itens=3');
    expect(p.url).toBe('https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=99');
  });
});

describe('Senado', () => {
  const lista = {
    ListaParlamentarEmExercicio: {
      Parlamentares: {
        Parlamentar: [
          { IdentificacaoParlamentar: { CodigoParlamentar: '5012', NomeParlamentar: 'Ana Souza', SiglaPartidoParlamentar: 'ABC', UfParlamentar: 'MG' }, Mandato: { PrimeiraLegislaturaDoMandato: { DataInicio: '2019-02-01', DataFim: '2027-01-31' } } },
          { IdentificacaoParlamentar: { CodigoParlamentar: '6001', NomeParlamentar: 'Bruno Lima', SiglaPartidoParlamentar: 'XYZ', UfParlamentar: 'SP' }, Mandato: {} },
        ],
      },
    },
  };

  it('mapeia os senadores e usa o mandato informado ou o padrão', async () => {
    fetchMock.mockResolvedValue(ok(lista));
    const all = await allSenators();
    expect(all[0]).toMatchObject({ senadoId: 5012, name: 'Ana Souza', mandate: ['2019-02-01', '2027-01-31'] });
    expect(all[1].mandate).toEqual(['2023-02-01', '2027-01-31']);
  });

  it('busca por nome, UF exata ou partido; sem texto devolve os primeiros', async () => {
    fetchMock.mockResolvedValue(ok(lista));
    expect((await searchSenators('ana')).map((s) => s.name)).toEqual(['Ana Souza']);
    expect((await searchSenators('sp')).map((s) => s.name)).toEqual(['Bruno Lima']);
    expect((await searchSenators('a')).map((s) => s.name)).toEqual(['Ana Souza', 'Bruno Lima']); // "a" está nos dois nomes
    expect((await searchSenators('xyz')).map((s) => s.name)).toEqual(['Bruno Lima']);
    expect(await searchSenators('')).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1); // lista dos 81 é baixada uma vez
  });
});
