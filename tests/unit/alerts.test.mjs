// Alertas sem rede: as consultas são trocadas por funções falsas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAlerts, prefOn } from '../../src/alerts.js';

const camara = async (pols) => [
  { id: 'v1', data: '2026-09-02', descricao: 'Aprovado o PL do saneamento.', byPol: Object.fromEntries(pols.filter((p) => p.camaraId).map((p) => [p.id, 'Sim'])) },
];
const senado = async (pols) => [
  { key: 7, date: '2026-09-01', matter: 'PEC 1/2026', summary: 'Dispõe sobre a saúde.', result: 'Aprovado', yes: 60, no: 10, secret: false, bySenator: Object.fromEntries(pols.filter((p) => p.senadoId).map((p) => [p.id, 'Não'])) },
];
const expenses = async () => [
  { value: 7200.5, type: 'Divulgação', supplier: 'Gráfica X', date: '2026-08-20', docNumber: '99', receiptUrl: 'https://exemplo/nota.pdf' },
  { value: 120, type: 'Combustível', supplier: 'Posto', date: '2026-08-21', docNumber: '100' },
];
const bills = async () => [{ id: 55, type: 'PL', number: 10, year: 2026, summary: 'Cria o programa Y.', date: '2026-08-15', url: 'https://exemplo/pl' }];
const deps = { camara, senado, expenses, bills };
const DEP = { id: 'camara-1', camaraId: 1, name: 'Dep. A', party: 'PT', uf: 'SP' };
const SEN = { id: 'senado-2', senadoId: '2', name: 'Sen. B', party: 'PL', uf: 'RJ' };

test('sem acompanhar ninguém, só chegam as votações do Plenário (Câmara e Senado)', async () => {
  const { alerts, failures } = await collectAlerts({ politicians: [], prefs: {} }, deps);
  assert.deepEqual(failures, []);
  assert.deepEqual(alerts.map((a) => a.kind), ['plenario', 'plenario']);
  assert.match(alerts.find((a) => a.id === 'plen-senado:7').text, /Sim 60, Não 10/);
});

test('acompanhando, chegam votos, gastos acima do limite e projetos, mais recentes primeiro', async () => {
  const { alerts } = await collectAlerts({ politicians: [DEP, SEN], prefs: {} }, deps);
  const kinds = alerts.map((a) => a.kind);
  assert.equal(kinds.filter((k) => k === 'votacao').length, 2);
  assert.equal(kinds.filter((k) => k === 'gasto').length, 1, 'a nota de R$ 120 fica de fora');
  assert.equal(kinds.filter((k) => k === 'proposicao').length, 1);
  assert.equal(alerts.find((a) => a.kind === 'gasto').url, 'https://exemplo/nota.pdf');
  assert.deepEqual([...alerts.map((a) => a.ts)], [...alerts.map((a) => a.ts)].sort().reverse());
});

test('preferências desligadas não geram alertas; ausente conta como ligada', async () => {
  const prefs = { plenario: false, rollcall: false, expenses: false, bills: false };
  const { alerts } = await collectAlerts({ politicians: [DEP, SEN], prefs }, deps);
  assert.deepEqual(alerts, []);
  assert.equal(prefOn({}, 'plenario'), true);
});

test('uma fonte fora do ar vira aviso, e o resto continua', async () => {
  const { alerts, failures } = await collectAlerts({ politicians: [DEP], prefs: {} }, { ...deps, senado: async () => { throw new Error('fora'); } });
  assert.deepEqual(failures, ['Senado']);
  assert.ok(alerts.some((a) => a.id === 'plen-camara:v1'));
});
