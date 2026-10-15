// Gastos por Poder: leitura do RGF (scripts/build-poderes.mjs), regras de situação e o dado gerado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recentPeriods, readOrgao, sumPoder, summarizePoder, summarizeFuncoes, flagAtipicos } from '../../scripts/build-poderes.mjs';
import { status, rankStates, rankFunction, functionRows, entesOfState, POWERS } from '../../src/poderes.js';

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

const fn = (conta, valor, coluna = 'Despesas Liquidadas', rotulo = 'Total Geral da Despesa por Função') => ({ conta, valor, coluna, rotulo });

test('despesa por função (DCA): soma por grupo, só as liquidadas, e as subfunções não entram em dobro', () => {
  const s = summarizeFuncoes([
    fn('01 - Legislativa', 100),
    fn('01.031 - Ação Legislativa', 60), // subfunção: já está em 01
    fn('02 - Judiciária', 300),
    fn('03 - Essencial à Justiça', 50),
    fn('10 - Saúde', 400),
    fn('28 - Encargos Especiais', 150),
    fn('10 - Saúde', 999, 'Despesas Empenhadas'),
    fn('Despesas Exceto Intraorçamentárias', 1000),
  ]);
  assert.deepEqual(s, { total: 1000, legislativa: 100, judiciaria: 300, essencial: 50, encargos: 150, demais: 400 });
  assert.equal(summarizeFuncoes([fn('Despesas Exceto Intraorçamentárias', 1)]), null);
});

test('linhas por função só trazem o que teve gasto, com a fatia do total', () => {
  const rows = functionRows({ total: 1000, legislativa: 100, judiciaria: 0, essencial: 0, encargos: 150, demais: 750 });
  assert.deepEqual(rows.map((r) => r.key), ['legislativa', 'encargos', 'demais']);
  assert.equal(rows[0].pct, 0.1);
  assert.deepEqual(functionRows(null), []);
});

test('poderes.json gerado: todo ente traz a despesa por função, e as funções fecham o total', () => {
  const data = JSON.parse(readFileSync(new URL('../../src/data/poderes.json', import.meta.url), 'utf8'));
  for (const e of data.entes) {
    const f = e.funcoes;
    assert.ok(f && f.ano >= 2024 && f.total > 0, e.nome);
    const soma = f.legislativa + f.judiciaria + f.essencial + f.encargos + f.demais;
    assert.ok(Math.abs(soma - f.total) < 1, `${e.nome}: as funções somam ${soma}, o total é ${f.total}`);
    assert.ok(f.demais >= 0, e.nome);
  }
  const rank = rankFunction(data, 'legislativa');
  assert.equal(rank.length, 27);
  const pcts = rank.map((r) => r.pct);
  assert.deepEqual(pcts, [...pcts].sort((a, b) => b - a));
});

test('pessoal maior que a receita do próprio ente marca todos os Poderes dele como atípicos; o resto não', () => {
  const a = flagAtipicos({ E: { pctRcl: 324.8, uso: 6 }, L: { pctRcl: 12.1, uso: 2 }, J: null });
  assert.equal(a.E.atipico, true);
  assert.equal(a.L.atipico, true, 'o limite do Legislativo sai da mesma receita suspeita');
  const b = flagAtipicos({ E: { pctRcl: 55.2, uso: 1.12 }, L: { pctRcl: 2.1, uso: 0.9 } });
  assert.equal(b.E.atipico, undefined, 'acima do limite informado não é atípico: é o que o ente declarou');
  assert.equal(status(6, true).key, 'atipico');
  assert.equal(status(1.2).key, 'acima');
});

test('poderes.json gerado: só Santana (AP) é atípico hoje, e nenhum ente atípico traz pessoal abaixo da receita', () => {
  const data = JSON.parse(readFileSync(new URL('../../src/data/poderes.json', import.meta.url), 'utf8'));
  for (const e of data.entes) {
    const marcado = Object.values(e.poderes).some((p) => p?.atipico);
    const impossivel = Object.values(e.poderes).some((p) => p?.pctRcl > 100);
    assert.equal(marcado, impossivel, e.nome);
  }
  assert.ok(data.entes.find((e) => e.nome === 'Santana').poderes.E.atipico);
});
