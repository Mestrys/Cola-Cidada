import { budgetSummary, federalBodies, money, personnelSpending, recentContracts, recentPeriods, stateBodies, toContract, UNIAO } from '../contas';
import { UNITS } from '../directory';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
});

describe('contas', () => {
  it('Presidência, Câmara, Senado e STF; e por estado o governo, a assembleia, a prefeitura e a câmara da capital', () => {
    expect(federalBodies().map((b) => b.key)).toEqual(['presidencia', 'camara', 'senado', 'stf']);
    for (const u of UNITS) {
      const keys = stateBodies(u.uf).map((b) => b.key.split('-')[0]);
      // a capital vem primeiro; depois a prefeitura e a câmara de cada uma das duas cidades-polo
      expect(keys).toEqual(u.hasCouncil ? ['gov', 'al', 'pref', 'cm', 'pref', 'cm', 'pref', 'cm'] : ['gov', 'al']);
    }
    // o filtro separa a Casa do Tribunal de Contas que vem no mesmo relatório do Legislativo
    const al = stateBodies('SP')[1];
    expect(al.match!.test('Assembleia Legislativa do Estado de São Paulo')).toBe(true);
    expect(al.match!.test('Tribunal de Contas do Estado de São Paulo')).toBe(false);
  });

  it('procura do período mais recente para trás', () => {
    expect(recentPeriods(3, 4, new Date('2026-10-15'))).toEqual([[2026, 2], [2026, 1], [2025, 3], [2025, 2]]);
    expect(recentPeriods(6, 2, new Date('2026-10-15'))).toEqual([[2026, 4], [2026, 3], [2026, 2], [2026, 1], [2025, 6], [2025, 5]]);
  });

  it('balanço: pula período sem relatório e lê receita e despesa; a URL leva %20 e não "https://"', async () => {
    const urls: string[] = [];
    fetchMock.mockImplementation(async (url: string) => {
      urls.push(url);
      if (/nr_periodo=4/.test(url)) return ok({ items: [] });
      return ok({
        items: [
          { instituicao: 'Governo Federal', cod_conta: 'TotalReceitas', coluna: 'Até o Bimestre (c)', valor: 4e12 },
          { instituicao: 'Governo Federal', cod_conta: 'TotalDespesas', coluna: 'DESPESAS PAGAS ATÉ O BIMESTRE (j)', valor: 3.9e12 },
        ],
      });
    });
    const r = await budgetSummary(UNIAO);
    expect(r).toMatchObject({ institution: 'Governo Federal', revenue: 4e12, paid: 3.9e12 });
    expect(r?.periodLabel).toMatch(/º bimestre de \d{4}/);
    expect(urls.every((u) => u.includes('RREO-Anexo%2001') && !u.includes('+') && !/origem=https?:/.test(u))).toBe(true);
  });

  it('pessoal: acha o órgão certo e devolve o peso na receita', async () => {
    fetchMock.mockResolvedValue(
      ok({
        hasMore: false,
        items: [
          { instituicao: 'Tribunal de Contas da União', cod_conta: 'DespesaComPessoalBruta', coluna: 'TOTAL (ÚLTIMOS 12 MESES) (a)', valor: 1 },
          { instituicao: 'Senado Federal', cod_conta: 'DespesaComPessoalBruta', coluna: 'TOTAL (ÚLTIMOS 12 MESES) (a)', valor: 5.1e9 },
          { instituicao: 'Senado Federal', cod_conta: 'DespesaComPessoalTotal', coluna: '% sobre a RCL', valor: 0.29 },
        ],
      })
    );
    expect(await personnelSpending(UNIAO, 'L', /^Senado Federal/i)).toMatchObject({ institution: 'Senado Federal', gross: 5.1e9, rclPct: 0.29 });
  });

  it('formata valores em reais compactos', () => {
    expect(money(null)).toBe('não informado');
    expect(money(1.4e9)).toBe('R$ 1,4 bi');
    expect(money(6.3e12)).toBe('R$ 6,3 tri');
    expect(money(624230405)).toBe('R$ 624,2 mi');
    expect(money(900)).toBe('R$ 900');
  });

  it('prefeituras levam o CNPJ (para o PNCP); governos, assembleias e câmaras não', () => {
    const sp = stateBodies('SP');
    expect(sp.filter((b) => b.cnpj).map((b) => b.key)).toEqual(['pref-SP', 'pref-3534401', 'pref-3518800']);
    expect(sp.filter((b) => b.cnpj).every((b) => /^\d{14}$/.test(b.cnpj!))).toBe(true);
    expect(stateBodies('DF').some((b) => b.cnpj)).toBe(false);
  });

  it('contratos do PNCP: lê da última página para trás, soma e separa os maiores dos mais recentes', async () => {
    const raw = (n: number, date: string) => ({ numeroControlePNCP: `c${n}`, dataPublicacaoPncp: `${date}T10:00:00`, objetoContrato: ` Obra ${n} `, nomeRazaoSocialFornecedor: `E${n}`, valorGlobal: n * 1000, tipoContrato: { nome: 'Contrato' }, orgaoEntidade: { cnpj: '1' }, anoContrato: 2026, sequencialContrato: n, emendaParlamentar: n === 9 ? {} : null });
    const pages = [[raw(1, '2026-09-20'), raw(9, '2026-09-21')], [raw(3, '2026-09-30'), raw(4, '2026-10-02'), raw(5, '2026-10-01')]];
    const urls: string[] = [];
    fetchMock.mockImplementation(async (url: string) => {
      urls.push(url);
      const page = Number(new URL(url).searchParams.get('pagina'));
      return ok({ data: pages[page - 1], totalRegistros: 5, totalPaginas: 2 });
    });
    const r = await recentContracts('46523171000104', { keep: 2, now: new Date('2026-10-15T12:00:00Z') });
    expect(r).toMatchObject({ total: 5, partial: false, sum: 22000 });
    expect(r.biggest.map((c) => c.value)).toEqual([9000, 5000]);
    expect(r.biggest[0].emenda).toBe(true);
    expect(r.items.map((c) => c.date)).toEqual(['2026-10-02', '2026-10-01']);
    expect(new URL(urls[0]).searchParams.get('cnpjOrgao')).toBe('46523171000104');
    expect(toContract(raw(3, '2026-01-01')).url).toBe('https://pncp.gov.br/app/contratos/1/2026/3');
  });
});
