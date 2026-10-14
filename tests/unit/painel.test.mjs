// Painel público: busca sem acento e órgãos com contas (sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matches, placeOf, SECTIONS } from '../../src/directory.js';
import { federalBodies, stateBodies } from '../../src/contas.js';
import { FEDERATION_UNITS } from '../../src/data/federation.js';

const entes = JSON.parse(readFileSync(new URL('../../src/data/entes.json', import.meta.url)));

test('busca ignora acentos e maiúsculas e procura em nome, partido, cidade e estado', () => {
  const p = { name: 'Pref. Álvaro Damião', party: 'UNIÃO', uf: 'MG', city: 'Belo Horizonte' };
  assert.ok(matches(p, 'alvaro'));
  assert.ok(matches(p, 'uniao'));
  assert.ok(matches(p, 'belo'));
  assert.ok(matches(p, 'minas'));
  assert.ok(matches(p, ''));
  assert.ok(!matches(p, 'recife'));
  assert.equal(placeOf({ roleKey: 'prefeito', city: 'Recife', uf: 'PE' }), 'Recife · PE');
});

test('painel cobre Presidência, STF, Congresso, governos, assembleias, prefeituras, câmaras e contas', () => {
  assert.deepEqual(SECTIONS.map((s) => s.key), ['presidencia', 'stf', 'senado', 'camara', 'governadores', 'assembleias', 'prefeitos', 'vereadores', 'orgaos']);
});

test('contas: Presidência, Câmara, Senado e STF, e em cada estado o governo, a assembleia, a prefeitura e a câmara da capital', () => {
  assert.deepEqual(federalBodies().map((b) => b.key), ['presidencia', 'camara', 'senado', 'stf']);
  for (const u of FEDERATION_UNITS) {
    const keys = stateBodies(u.uf, entes).map((b) => b.key.split('-')[0]);
    assert.deepEqual(keys, u.hasCouncil ? ['gov', 'al', 'pref', 'cm'] : ['gov', 'al'], u.uf);
  }
  // o filtro do órgão separa a Casa do Tribunal de Contas que vem no mesmo relatório do Legislativo
  const al = stateBodies('SP', entes).find((b) => b.key === 'al-SP');
  assert.ok(al.match.test('Assembleia Legislativa do Estado de São Paulo'));
  assert.ok(!al.match.test('Tribunal de Contas do Estado de São Paulo'));
  const cm = stateBodies('SP', entes).find((b) => b.key === 'cm-SP');
  assert.ok(cm.match.test('Câmara de Vereadores de São Paulo - SP'));
  assert.ok(!cm.match.test('Tribunal de Contas do Município de São Paulo'));
});
