// Gastos por Poder: leitura do RGF (scripts/build-poderes.mjs), regras de situação e o dado gerado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recentPeriods, readOrgao, sumPoder, summarizePoder } from '../../scripts/build-poderes.mjs';
import { status, rankStates, entesOfState, POWERS } from '../../src/poderes.js';

const linhas = (instituicao, { liquida, limite, rcl, coluna = 'Valor' }) => [
  { instituicao, cod_conta: 'DespesaComPessoalBruta', coluna: 'TOTAL (ÚLTIMOS 12 MESES) (a)', valor: liquida * 1.2 },
  { instituicao, cod_conta: 'DespesaComPessoalLiquida', coluna: 'TOTAL (ÚLTIMOS 12 MESES) (a)', valor: liquida },
  { instituicao, cod_conta: 'ReceitaCorrenteLiquidaAjustada', coluna, valor: rcl },
  { instituicao, cod_conta: 'LimiteMaximoDespesaComPessoalTotal', coluna, valor: limite },
  { instituicao, cod_conta: 'DespesaComPessoalLiquida', coluna: '<MR>', valor: 1 }, // mês a mês: não entra
];

test('períodos do RGF: do quadrimestre mais recente para trás', () => {
  assert.deepEqual(recentPeriods(new Date('2026-10-15')), [[2026, 2], [2026, 1], [2025, 3], [2025, 2]]);
  assert.deepEqual(recentPeriods(new Date('2026-02-10')), [[2025, 3], [2025, 2]]);
});

test('um órgão: pega o total de 12 meses, o limite e a receita, com "Valor" ou "VALOR"', () => {
  const o = readOrgao(linhas('Assembleia X', { liquida: 100, limite: 300, rcl: 10000, coluna: 'VALOR' }));
  assert.deepEqual(o, { nome: 'Assembleia X', bruta: 120, liquida: 100, limite: 300, rcl: 10000 });
});

test('um Poder soma os órgãos (Assembleia + Tribunal de Contas) e mede o uso do limite', () => {
  const s = summarizePoder([...linhas('Assembleia X', { liquida: 100, limite: 300, rcl: 10000 }), ...linhas('TCE X', { liquida: 200, limite: 300, rcl: 10000 })]);
  assert.equal(s.liquida, 300);
  assert.equal(s.limite, 600);
  assert.equal(s.uso, 0.5);
  assert.equal(s.pctRcl, 3);
  assert.equal(s.orgaosTotal, 2);
  assert.deepEqual(s.orgaos.map((o) => o.nome), ['TCE X', 'Assembleia X'], 'maior primeiro');
});

test('sem limite em algum órgão, o Poder não inventa o uso; sem linha de pessoal, não há Poder', () => {
  const a = linhas('A', { liquida: 100, limite: 300, rcl: 1000 });
  const b = linhas('B', { liquida: 50, limite: 0, rcl: 1000 }).filter((i) => i.cod_conta !== 'LimiteMaximoDespesaComPessoalTotal');
  assert.equal(summarizePoder([...a, ...b]).uso, null);
  assert.equal(summarizePoder([{ instituicao: 'C', cod_conta: 'Outra', coluna: 'Valor', valor: 1 }]), null);
  assert.equal(sumPoder([{ nome: 'x', liquida: 10, limite: 20, rcl: 100 }]).uso, 0.5);
});

test('situação pela LRF: alerta aos 90%, prudencial aos 95%, acima do teto', () => {
  assert.equal(status(0.5).key, 'dentro');
  assert.equal(status(0.9).key, 'alerta');
  assert.equal(status(0.95).key, 'prudencial');
  assert.equal(status(1.0001).key, 'acima');
  assert.equal(status(null).key, 'sem');
});

test('poderes.json gerado: União, 27 estados, 26 capitais e 52 cidades-polo; município só com Executivo e Legislativo', () => {
  const data = JSON.parse(readFileSync(new URL('../../src/data/poderes.json', import.meta.url), 'utf8'));
  const by = (t) => data.entes.filter((e) => e.tipo === t);
  assert.equal(by('uniao').length, 1);
  assert.equal(by('estado').length, 27);
  assert.equal(by('capital').length, 26);
  assert.equal(by('polo').length, 52);
  for (const e of data.entes) {
    const keys = Object.keys(e.poderes);
    assert.deepEqual(keys, e.esfera === 'M' || e.tipo === 'capital' || e.tipo === 'polo' ? ['E', 'L'] : ['E', 'L', 'J'], e.nome);
    for (const p of Object.values(e.poderes)) if (p) assert.ok(p.liquida > 0 && p.ano >= 2025 && [1, 2, 3].includes(p.periodo), e.nome);
  }
  assert.ok(by('uniao')[0].poderes.E.nota, 'o Executivo federal vem com a nota de que não é comparável');
  // quase todos os entes entregaram; os poucos sem relatório aparecem como nulos, sem derrubar a tela
  const vazios = data.entes.flatMap((e) => Object.values(e.poderes)).filter((p) => !p).length;
  assert.ok(vazios <= 5, `${vazios} poderes sem relatório`);
  assert.ok(JSON.stringify(data).length < 150_000, 'cabe no app');
  // ordenação e agrupamento da tela
  assert.equal(rankStates(data, 'E').length, 27);
  const sp = entesOfState(data, 'SP');
  assert.deepEqual(sp.map((e) => e.tipo), ['estado', 'capital', 'polo', 'polo']);
  assert.equal(POWERS.length, 3);
});
