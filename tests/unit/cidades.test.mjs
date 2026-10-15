// Cidades-polo: as duas maiores economias de cada estado fora a capital (scripts/build-cidades.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { FEDERATION_UNITS } from '../../src/data/federation.js';
import { stateBodies } from '../../src/contas.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../../src/data/${p}`, import.meta.url)));
const catalogo = load('cidades.json');
const entes = load('entes.json');
const prefeitos = load('prefeitos-cidades.json');
const withCity = FEDERATION_UNITS.filter((u) => u.hasCouncil);

test('catálogo: cada estado com capital tem a capital e duas cidades-polo, ordenadas por PIB', () => {
  assert.equal(catalogo.cidades.length, withCity.length * 3);
  for (const u of withCity) {
    const list = catalogo.cidades.filter((c) => c.uf === u.uf);
    const cap = list.filter((c) => c.kind === 'capital');
    const polos = list.filter((c) => c.kind === 'polo');
    assert.equal(cap.length, 1, u.uf);
    assert.equal(cap[0].ibge, entes.ufs[u.uf].capital, `${u.uf}: capital diferente do Siconfi`);
    assert.equal(polos.length, 2, u.uf);
    assert.ok(polos[0].pib >= polos[1].pib, `${u.uf}: polos fora de ordem`);
    for (const c of polos) {
      assert.notEqual(c.ibge, cap[0].ibge);
      // nenhuma cidade fora do catálogo pode ter PIB maior que a menor cidade-polo e não ser capital: confere o ranking
      assert.ok(c.rankPib >= 1 && c.rankPib <= 3 + 1, `${u.uf}: ${c.nome} fora do topo`);
      assert.ok(c.pib > 0 && c.populacao > 0 && c.pibPerCapita > 0, `${c.nome} sem PIB ou população`);
    }
  }
  assert.ok(!catalogo.cidades.some((c) => c.uf === 'DF'));
});

test('prefeitos dos polos: um por cidade, com ficha do TSE e mandato 2025–2028', () => {
  const polos = catalogo.cidades.filter((c) => c.kind === 'polo');
  assert.equal(prefeitos.length, polos.length);
  assert.equal(new Set(prefeitos.map((p) => p.id)).size, prefeitos.length);
  for (const c of polos) {
    const p = prefeitos.find((x) => x.ibge === c.ibge);
    assert.ok(p, `${c.nome} sem prefeito`);
    assert.equal(p.city, c.nome);
    assert.equal(p.state, c.uf);
    assert.equal(p.roleKey, 'prefeito');
    assert.deepEqual(p.mandate, ['2025-01-01', '2028-12-31']);
    assert.match(p.pageUrl, /^https:\/\/divulgacandcontas\.tse\.jus\.br\//);
  }
});

test('vereadores dos polos: ids únicos, cidade certa e câmara não vazia', () => {
  const ids = new Set();
  for (const u of FEDERATION_UNITS) {
    const path = new URL(`../../src/data/cidades/${u.uf.toLowerCase()}.json`, import.meta.url);
    if (!u.hasCouncil) {
      assert.equal(existsSync(path), false, `${u.uf} não deveria ter cidades-polo`);
      continue;
    }
    const list = load(`cidades/${u.uf.toLowerCase()}.json`);
    const polos = catalogo.cidades.filter((c) => c.uf === u.uf && c.kind === 'polo');
    for (const c of polos) {
      const council = list.filter((v) => v.ibge === c.ibge);
      assert.ok(council.length >= 9, `${c.nome}: só ${council.length} vereadores`);
      for (const v of council) {
        assert.equal(v.city, c.nome);
        assert.equal(v.state, u.uf);
        assert.equal(v.roleKey ?? 'vereador', 'vereador');
        assert.ok(!ids.has(v.id), `id repetido ${v.id}`);
        ids.add(v.id);
      }
    }
    assert.equal(list.length, polos.reduce((n, c) => n + list.filter((v) => v.ibge === c.ibge).length, 0));
  }
});

test('capitais continuam como estavam: arquivos da capital não ganham cidades-polo', () => {
  for (const u of withCity) {
    for (const v of load(`capitais/${u.uf.toLowerCase()}.json`)) assert.equal(v.city, u.capital);
  }
  assert.equal(load('executivo.json').prefeitos.length, 26);
});

test('contas: órgãos da capital vêm primeiro e as duas cidades-polo entram em seguida', () => {
  const sp = stateBodies('SP', entes, catalogo.cidades);
  assert.deepEqual(sp.map((b) => b.key).slice(0, 4), ['gov-SP', 'al-SP', 'pref-SP', 'cm-SP']);
  const polos = catalogo.cidades.filter((c) => c.uf === 'SP' && c.kind === 'polo');
  assert.equal(sp.length, 4 + polos.length * 2);
  for (const c of polos) {
    const pref = sp.find((b) => b.key === `pref-${c.ibge}`);
    assert.ok(pref.budget && pref.ente.ibge === c.ibge && pref.note);
    assert.equal(sp.find((b) => b.key === `cm-${c.ibge}`).poder, 'L');
  }
  // sem o catálogo, o resultado é o de antes
  assert.equal(stateBodies('SP', entes).length, 4);
  assert.equal(stateBodies('DF', entes, catalogo.cidades).length, 2);
});
