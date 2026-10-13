// Testes de lógica pura (sem navegador): física de interface, mandatos e orientação de bancada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, rubberband, velocityFrom } from '../../src/motion.js';
import { defaultMandate, mandateProgress, esc } from '../../src/ui.js';
import { parseBloc, orientationFor } from '../../src/plenary.js';

test('projeção de inércia: parado não anda, lançamento rápido vai longe', () => {
  assert.equal(project(0), 0);
  assert.ok(project(1000) > 400 && project(1000) < 600);
  assert.ok(project(-1000) < 0);
});

test('rubber-band resiste cada vez mais e nunca passa da dimensão', () => {
  const a = rubberband(100, 800), b = rubberband(400, 800);
  assert.ok(a < 100 && b < 400 && b > a);
  assert.ok(rubberband(1e6, 800) < 800);
});

test('velocidade usa só as amostras dos últimos 100 ms', () => {
  const v = velocityFrom([{ v: 0, t: 0 }, { v: 0, t: 500 }, { v: 50, t: 550 }, { v: 100, t: 600 }]);
  assert.equal(Math.round(v), 1000);
  assert.equal(velocityFrom([{ v: 10, t: 0 }]), 0);
});

test('mandato estadual: SP começa em 15/03, demais em 01/02; todos terminam em 31/01/2027', () => {
  assert.deepEqual(defaultMandate('dep-estadual', 'SP'), ['2023-03-15', '2027-01-31']);
  assert.deepEqual(defaultMandate('dep-estadual', 'mg'), ['2023-02-01', '2027-01-31']);
  assert.deepEqual(defaultMandate('vereador'), ['2025-01-01', '2028-12-31']);
});

test('cadastro antigo com a data da ALESP é recalculado pela UF', () => {
  const legacy = { roleKey: 'dep-estadual', uf: 'BA', mandate: ['2023-03-15', '2027-03-14'] };
  assert.equal(mandateProgress(legacy).end, new Date('2027-01-31').toLocaleDateString('pt-BR'));
  const custom = { roleKey: 'governador', mandate: ['2023-01-01', '2026-12-31'] };
  assert.equal(mandateProgress(custom).end, new Date('2026-12-31').toLocaleDateString('pt-BR'));
});

test('esc neutraliza HTML', () => {
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});

test('blocos: abreviação da Câmara e partidos de federações', () => {
  const bloc = parseBloc({ name: 'UNIÃO, PP, PSD, REPUBLICANOS, MDB, Federação PSDB CIDADANIA, PODE', federation: false });
  assert.ok(bloc.abbr.startsWith('unipppsd'));
  assert.ok(bloc.parties.includes('psdb') && bloc.parties.includes('cidadania'));
});

test('orientação: partido próprio > federação > bloco; liberado e vazio', () => {
  const blocs = [parseBloc({ name: 'UNIÃO, PP, PSD, REPUBLICANOS', federation: false })];
  const orient = [
    { codTipoLideranca: 'P', siglaPartidoBloco: 'PL', orientacaoVoto: 'Liberado' },
    { codTipoLideranca: 'P', siglaPartidoBloco: 'PSD', orientacaoVoto: '' },
    { codTipoLideranca: 'B', siglaPartidoBloco: 'Fdr PT-PCdoB-PV', orientacaoVoto: 'Sim' },
    { codTipoLideranca: 'B', siglaPartidoBloco: 'Bl UniPpPsd...', orientacaoVoto: 'Não' },
  ];
  assert.equal(orientationFor('PL', orient, blocs), 'Liberado');
  assert.equal(orientationFor('PCdoB', orient, blocs), 'Sim');
  assert.equal(orientationFor('PSD', orient, blocs), 'Não');
  assert.equal(orientationFor('NOVO', orient, blocs), null);
});

test('summarizeProposition só devolve dados oficiais e aceita apenas links da Câmara/Senado', async () => {
  const { summarizeProposition } = await import('../../src/analysis.js');
  const ok = summarizeProposition({ type: 'PL', number: 1, year: 2024, summary: 'Dispõe sobre saneamento.', date: '2024-03-01', url: 'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=1' });
  assert.ok(ok.url.startsWith('https://www.camara.leg.br/'));
  assert.equal(ok.date, '2024-03-01');
  for (const k of ['practicalEffect', 'financialEffect', 'winnersAndLosers']) assert.equal(k in ok, false, `${k} voltou`);
  assert.equal(summarizeProposition({ summary: 'x', url: 'javascript:alert(1)' }).url, '');
  assert.equal(summarizeProposition({ summary: 'x', url: 'https://evil.example/camara.leg.br/' }).url, '');
});
