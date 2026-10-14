// Integridade dos dados regionais gerados do TSE (scripts/build-regional-data.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { FEDERATION_UNITS } from '../../src/data/federation.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../../src/data/${p}`, import.meta.url)));
const REQUIRED = ['id', 'name', 'fullName', 'party', 'role', 'house', 'source', 'state', 'situacao', 'tse', 'pageUrl'];

for (const u of FEDERATION_UNITS) {
  test(`${u.uf}: assembleia com ${u.totalDep} eleitos e campos completos`, () => {
    const list = load(`states/${u.uf.toLowerCase()}.json`);
    assert.equal(list.length, u.totalDep);
    assert.equal(new Set(list.map((d) => d.id)).size, list.length, 'ids repetidos');
    for (const d of list) {
      for (const k of REQUIRED) assert.ok(d[k] != null && d[k] !== '', `${d.id} sem ${k}`);
      assert.equal(d.state, u.uf);
      assert.match(d.pageUrl, /^https:\/\/divulgacandcontas\.tse\.jus\.br\//);
      if (d.tse.declaredAssets != null) assert.equal(Math.round(d.tse.declaredAssets * 100) / 100, d.tse.declaredAssets);
    }
  });

  if (u.hasCouncil) {
    test(`${u.uf}: câmara da capital com até ${u.councilDep} eleitos`, () => {
      const list = load(`capitais/${u.uf.toLowerCase()}.json`);
      // Porto Alegre tem 35 de 36: um registro do TSE está sem situação final (#NULO).
      assert.ok(list.length >= u.councilDep - 1 && list.length <= u.councilDep, `${list.length}/${u.councilDep}`);
      for (const d of list) assert.equal(d.city, u.capital);
    });
  } else {
    test(`${u.uf}: sem câmara de capital no catálogo`, () => {
      assert.equal(existsSync(new URL(`../../src/data/capitais/${u.uf.toLowerCase()}.json`, import.meta.url)), false);
    });
  }
}
