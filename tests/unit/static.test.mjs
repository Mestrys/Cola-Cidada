// Verificações estáticas: sintaxe, ícones da fonte subconjunto e textos fictícios removidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const sources = [
  ...readdirSync(new URL('src/', root)).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`),
  ...readdirSync(new URL('src/views/', root)).filter((f) => f.endsWith('.js')).map((f) => `src/views/${f}`),
  'sw.js',
  'server.js',
];

test('todos os scripts têm sintaxe válida', () => {
  for (const f of sources) execFileSync(process.execPath, ['--check', new URL(f, root).pathname]);
});

test('ícones escritos literalmente estão no subconjunto da fonte', () => {
  const list = read('index.html').match(/icon_names=([a-z0-9_,]+)/)[1].split(',');
  assert.deepEqual([...list].sort(), list, 'icon_names precisa estar em ordem alfabética');
  const known = new Set(list);
  const missing = new Set();
  for (const f of sources) {
    for (const m of read(f).matchAll(/class="mi[^"]*"[^>]*>\s*([a-z0-9_]+)\s*</g)) if (!known.has(m[1])) missing.add(`${m[1]} (${f})`);
  }
  assert.deepEqual([...missing], []);
});

test('service worker guarda todos os módulos do app', () => {
  const sw = read('sw.js');
  for (const f of sources.filter((f) => f.startsWith('src/'))) assert.ok(sw.includes(`'/${f}'`), `${f} fora do APP_SHELL`);
});

test('textos fictícios não voltaram', () => {
  const banned = /Eleitor\(a\) Biométrico|Identificador Cívico|Framework Cívico|Atualizado a cada|ao vivo|Sincronia Oficial|Painel Ativo|Quórum Nominal|Eleitor Regular|Cidadão Conectado|Protocolo Cívico|Chave Criptográfica|Encerramento Automático|Total Auditado|Selo Digital|Aderência LAI/i;
  for (const f of sources) {
    const hit = read(f).match(banned);
    assert.equal(hit, null, `${f}: "${hit?.[0]}"`);
  }
});
