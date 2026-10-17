// O manifesto precisa bastar para o Edge e o Chrome oferecerem a instalação: ícones PNG de 192 e 512 (comuns e maskable),
// arquivos que existem com o tamanho declarado, capturas de tela dos dois formatos e atalhos que apontam para rotas reais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
const png = (path) => {
  const b = readFileSync(new URL(path.replace(/^\//, ''), root));
  assert.equal(b.subarray(1, 4).toString(), 'PNG', `${path} não é PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};

test('manifesto tem os campos de instalação', () => {
  for (const k of ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'lang']) assert.ok(manifest[k], k);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, undefined, 'orientation fixa trava a janela do desktop em formato vertical');
});

test('ícones PNG de 192 e 512, comuns e maskable, existem com o tamanho declarado', () => {
  for (const purpose of ['any', 'maskable']) {
    for (const size of ['192x192', '512x512']) {
      const icon = manifest.icons.find((i) => i.type === 'image/png' && i.sizes === size && i.purpose === purpose);
      assert.ok(icon, `falta ícone ${purpose} ${size}`);
      assert.equal(png(icon.src), size, icon.src);
    }
  }
  for (const i of manifest.icons) assert.ok(existsSync(new URL(i.src.slice(1), root)), i.src);
});

test('capturas de tela: pelo menos uma wide e uma narrow, com o tamanho real', () => {
  for (const form of ['wide', 'narrow']) assert.ok(manifest.screenshots.some((s) => s.form_factor === form && s.label), form);
  for (const s of manifest.screenshots) assert.equal(png(s.src), s.sizes, s.src);
});

test('atalhos apontam para rotas que existem', () => {
  const main = readFileSync(new URL('src/main.js', root), 'utf8');
  assert.ok(manifest.shortcuts.length >= 2);
  for (const s of manifest.shortcuts) {
    const route = s.url.match(/^\/#\/([\w-]+)$/)?.[1];
    assert.ok(route && new RegExp(`(^|\\s|')${route}'?:\\s*\\{`).test(main), `${s.url}: rota inexistente`);
    assert.ok(existsSync(new URL(s.icons[0].src.slice(1), root)));
  }
});

test('o service worker guarda os ícones do manifesto para abrir sem rede', () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  for (const i of manifest.icons.filter((i) => i.purpose === 'any')) assert.ok(sw.includes(`'${i.src}'`), i.src);
});
