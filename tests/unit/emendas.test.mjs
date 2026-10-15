// Emendas parlamentares (scripts/build-emendas.mjs): resumo por parlamentar e por cidade, e o dado gerado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize, norm, FROM_YEAR } from '../../scripts/build-emendas.mjs';

const TIPO_IND = 'Emenda Individual - Transferências com Finalidade Definida';
const TIPO_PIX = 'Emenda Individual - Transferências Especiais';
// colunas usadas: 0 código, 1 ano, 2 tipo, 4 autor, 6 localidade, 7 ibge, 8 município, 10 UF, 22 empenhado, 24 pago, 27 restos pagos
const em = ({ cod, ano = 2025, tipo = TIPO_IND, autor, ibge = '3534401', mun = 'OSASCO', emp = '1000,00', pago = '0,00', rp = '0,00' }) => {
  const c = Array(28).fill('');
  Object.assign(c, { 0: cod, 1: String(ano), 2: tipo, 4: autor, 6: `${mun} - SP`, 7: ibge, 8: mun, 10: 'SÃO PAULO', 22: emp, 24: pago, 27: rp });
  return c;
};
const fav = (cod, cnpj, nome, valor) => Object.assign(Array(13).fill(''), { 0: cod, 6: cnpj, 7: nome, 12: valor });
const CIDADES = new Map([['3534401', 'Osasco']]);

test('nomes são ligados sem acento nem caixa', () => {
  assert.equal(norm('  Jandira   Feghali '), 'JANDIRA FEGHALI');
  assert.equal(norm('Célio Studart'), 'CELIO STUDART');
});

test('resumo: soma empenhado e pago (com restos a pagar) por ano, ignora anos antes de 2023 e separa Pix', () => {
  const out = summarize(
    [
      em({ cod: 'A1', autor: 'Fulana de Tal', emp: '1.000,50', pago: '400,00', rp: '100,00' }),
      em({ cod: 'A2', autor: 'FULANA DE TAL', ano: 2026, tipo: TIPO_PIX, emp: '500,00', ibge: '3548708', mun: 'SANTOS' }),
      em({ cod: 'OLD', autor: 'Fulana de Tal', ano: 2020, emp: '9999,00' }),
    ],
    [],
    CIDADES,
    '2026-10-15'
  );
  const a = out.autores['FULANA DE TAL'];
  assert.deepEqual(a.anos, { 2025: { empenhado: 1001, pago: 500 }, 2026: { empenhado: 500, pago: 0 } });
  assert.equal(a.especial, 500);
  assert.equal(a.emendas, 2);
  assert.deepEqual(a.destinos.map((d) => d.nome), ['OSASCO', 'SANTOS']);
  assert.equal(out.desde, FROM_YEAR);
  assert.equal(out.anos[2020], undefined);
});

test('resumo: favorecidos somam por emenda do autor; bancadas não viram autor e aparecem só na cidade', () => {
  const out = summarize(
    [
      em({ cod: 'A1', autor: 'Fulana de Tal' }),
      em({ cod: 'B1', autor: 'BANCADA DE SAO PAULO', tipo: 'Emenda de Bancada', emp: '7000,00' }),
    ],
    [fav('A1', '1', 'ASSOCIACAO X', '300,00'), fav('A1', '1', 'ASSOCIACAO X', '200,00'), fav('A1', '2', 'HOSPITAL Y', '900,00'), fav('ZZ', '3', 'DE OUTRA', '5,00')],
    CIDADES,
    '2026-10-15'
  );
  assert.deepEqual(Object.keys(out.autores), ['FULANA DE TAL']);
  assert.deepEqual(out.autores['FULANA DE TAL'].favorecidos, [{ nome: 'HOSPITAL Y', valor: 900 }, { nome: 'ASSOCIACAO X', valor: 500 }]);
  const osasco = out.cidades['3534401'];
  assert.equal(osasco.emendas, 2);
  assert.deepEqual(osasco.autores.map((a) => a.nome), ['BANCADA DE SAO PAULO (bancada)', 'Fulana de Tal']);
});

test('emendas.json gerado: autores, cidades monitoradas e tamanho que cabe no app', () => {
  const raw = readFileSync(new URL('../../src/data/emendas.json', import.meta.url), 'utf8');
  const d = JSON.parse(raw);
  assert.equal(d.desde, FROM_YEAR);
  assert.ok(Object.keys(d.autores).length > 500, 'parlamentares com emendas individuais');
  assert.ok(Object.keys(d.cidades).length >= 60, 'cidades monitoradas com emendas');
  for (const [k, a] of Object.entries(d.autores)) {
    assert.equal(k, norm(a.nome));
    for (const y of Object.values(a.anos)) assert.ok(y.empenhado >= 0 && y.pago >= 0, a.nome);
  }
  assert.ok(raw.length < 800_000, `emendas.json com ${raw.length} bytes`);
});
