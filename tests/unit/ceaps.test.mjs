// Resumo da cota dos senadores (scripts/build-ceaps.mjs) e dados gerados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize, BIG_EXPENSE } from '../../scripts/build-ceaps.mjs';

const row = (o) => ({ id: 1, ano: 2026, codSenador: 10, nomeSenador: 'FULANO', tipoDespesa: 'Divulgação', fornecedor: 'F', documento: 'D', data: '2026-03-01', valorReembolsado: 100, ...o });

test('resumo: soma por ano e tipo, guarda só despesas grandes recentes e ignora estornos e datas futuras', () => {
  const rows = [
    row({ id: 1, valorReembolsado: 6000, data: '2026-03-01' }),
    row({ id: 2, valorReembolsado: 4999.99, data: '2026-03-02', tipoDespesa: 'Aluguel' }),
    row({ id: 3, valorReembolsado: -500, data: '2026-03-03' }), // estorno
    row({ id: 4, valorReembolsado: 9000, data: '2026-12-29' }), // lançamento com data futura
    row({ id: 5, valorReembolsado: 200, ano: 2025, data: '2025-05-01' }),
    ...Array.from({ length: 20 }, (_, i) => row({ id: 100 + i, valorReembolsado: BIG_EXPENSE + i, data: `2026-04-${String(i + 1).padStart(2, '0')}` })),
  ];
  const out = summarize(rows, [2025, 2026], '2026-10-15');
  const s = out.senadores['10'];
  assert.equal(s.anos[2025].total, 200);
  assert.equal(s.anos[2026].tipos[0].tipo, 'Divulgação');
  assert.equal(s.anos[2026].total, Math.round((6000 + 4999.99 + [...Array(20).keys()].reduce((n, i) => n + BIG_EXPENSE + i, 0)) * 100) / 100);
  assert.equal(s.grandes.length, 12, 'só as 12 mais recentes');
  assert.ok(s.grandes.every((e) => e.valor >= BIG_EXPENSE && e.data <= '2026-10-15'));
  assert.deepEqual(s.grandes.map((e) => e.data), [...s.grandes.map((e) => e.data)].sort().reverse());
  assert.equal(out.ultimaDespesa, '2026-04-20');
});

test('ceaps.json gerado: formato estável e tamanho que cabe no app', () => {
  const raw = readFileSync(new URL('../../src/data/ceaps.json', import.meta.url), 'utf8');
  assert.ok(raw.length < 600_000, `ceaps.json com ${raw.length} bytes`);
  const c = JSON.parse(raw);
  assert.match(c.geradoEm, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(c.ultimaDespesa <= c.geradoEm, 'despesa com data futura');
  const list = Object.entries(c.senadores);
  assert.ok(list.length >= 81);
  for (const [id, s] of list) {
    assert.match(id, /^\d+$/);
    assert.ok(s.nome && Object.keys(s.anos).length, id);
    for (const e of s.grandes) assert.ok(e.valor >= c.limiteDespesaGrande, id);
  }
});
