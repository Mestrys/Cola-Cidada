// Gera as capturas de tela do manifesto (screenshots/*.png), que o Edge e o Chrome mostram no diálogo de instalação.
// Sobe o servidor local, abre o app sem rede externa (só os dados do próprio app) e fotografa o Painel e Gastos por Poder.
//
// Uso: node scripts/build-screenshots.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4179;
const base = `http://localhost:${PORT}`;
const server = spawn('node', ['server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
mkdirSync(join(root, 'screenshots'), { recursive: true });

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch();
  const shots = [
    ['painel-desktop', 'painel', { width: 1280, height: 720 }],
    ['poderes-desktop', 'poderes', { width: 1280, height: 720 }],
    ['painel-celular', 'painel', { width: 540, height: 960 }],
    ['poderes-celular', 'poderes', { width: 540, height: 960 }],
  ];
  for (const [name, route, viewport] of shots) {
    const ctx = await browser.newContext({ viewport, locale: 'pt-BR', serviceWorkers: 'block' });
    await ctx.route((u) => u.hostname !== 'localhost', (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(`${base}/#/${route}`);
    await page.waitForSelector('#view h1, #view h2', { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    writeFileSync(join(root, 'screenshots', `${name}.png`), await page.screenshot());
    await ctx.close();
  }
  await browser.close();
  console.log('capturas geradas em screenshots/');
} finally {
  server.kill();
}
