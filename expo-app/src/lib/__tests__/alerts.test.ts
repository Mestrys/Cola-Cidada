import { collectAlerts, prefOn, type Sources } from '../alerts';
import type { CamaraVoting, Politician, SenateVoting } from '../types';

const DEP: Politician = { id: 'camara-1', source: 'camara', camaraId: 1, name: 'Dep. A', party: 'PT', uf: 'SP', roleKey: 'dep-federal' };
const SEN: Politician = { id: 'senado-2', source: 'senado', senadoId: 2, name: 'Sen. B', party: 'PL', uf: 'RJ', roleKey: 'senador' };

const camaraRow = (pols: Politician[]): CamaraVoting => ({
  id: 'v1', descricao: 'Aprovado o PL do saneamento.', data: '2026-09-02', siglaOrgao: 'PLEN', approved: true,
  tally: { Sim: 1, Não: 0, Outros: 0 }, votes: [], category: 'geral',
  byPol: Object.fromEntries(pols.filter((p) => p.camaraId).map((p) => [p.id, 'Sim'])),
});
const senadoRow = (pols: Politician[]): SenateVoting => ({
  key: '7', date: '2026-09-01', matter: 'PEC 1/2026', summary: 'Dispõe sobre a saúde.', result: 'Aprovado', secret: false, round: '2º turno', yes: 60, no: 10,
  votes: [], tally: { Sim: 60, Não: 10, Outros: 0 }, category: 'geral',
  bySenator: Object.fromEntries(pols.filter((p) => p.senadoId).map((p) => [p.id, 'Não'])),
});
const src: Sources = {
  camara: async (p) => [camaraRow(p)],
  senado: async (p) => [senadoRow(p)],
  expenses: async () => [
    { value: 7200.5, type: 'Divulgação', supplier: 'Gráfica X', date: '2026-08-20T10:00:00', docNumber: '99', receiptUrl: 'https://exemplo/nota.pdf' },
    { value: 120, type: 'Combustível', supplier: 'Posto', date: '2026-08-21', docNumber: '100' },
  ],
  bills: async () => [{ id: 55, type: 'PL', number: 10, year: 2026, summary: 'Cria o programa Y.', date: '2026-08-15', url: 'https://exemplo/pl' }],
};
const prefs = { plenario: true, rollcall: true, expenses: true, bills: true };

describe('collectAlerts', () => {
  it('sem acompanhar ninguém, só chegam as votações do Plenário (Câmara e Senado)', async () => {
    const { alerts, failures } = await collectAlerts({ politicians: [], prefs }, src);
    expect(failures).toEqual([]);
    expect(alerts.map((a) => a.kind)).toEqual(['plenario', 'plenario']);
    expect(alerts.find((a) => a.id === 'plen-senado:7')?.text).toMatch(/PEC 1\/2026 \(2º turno\): Aprovado \(Sim 60, Não 10\)/);
  });

  it('acompanhando, chegam votos, gastos acima do limite e projetos, mais recentes primeiro', async () => {
    const { alerts } = await collectAlerts({ politicians: [DEP, SEN], prefs }, src);
    const kinds = alerts.map((a) => a.kind);
    expect(kinds.filter((k) => k === 'votacao')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'gasto')).toHaveLength(1); // a nota de R$ 120 fica de fora
    expect(kinds.filter((k) => k === 'proposicao')).toHaveLength(1);
    const gasto = alerts.find((a) => a.kind === 'gasto')!;
    expect(gasto.url).toBe('https://exemplo/nota.pdf');
    expect(gasto.text).toMatch(/R\$ 7\.200,50 .* em 20\/08\/2026/);
    const ts = alerts.map((a) => String(a.ts));
    expect(ts).toEqual([...ts].sort().reverse());
  });

  it('preferências desligadas não geram alertas; ausente conta como ligada', async () => {
    const off = { plenario: false, rollcall: false, expenses: false, bills: false };
    expect((await collectAlerts({ politicians: [DEP, SEN], prefs: off }, src)).alerts).toEqual([]);
    expect(prefOn({}, 'plenario')).toBe(true);
  });

  it('uma fonte fora do ar vira aviso, e o resto continua', async () => {
    const { alerts, failures } = await collectAlerts({ politicians: [DEP], prefs }, { ...src, senado: async () => { throw new Error('fora'); } });
    expect(failures).toEqual(['Senado']);
    expect(alerts.some((a) => a.id === 'plen-camara:v1')).toBe(true);
  });
});
