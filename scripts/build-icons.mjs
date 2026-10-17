// Gera os ícones PNG do app instalado (icons/*.png) a partir de icon.svg, com o Chromium do Playwright.
// O Windows (Edge) e o Android preferem PNG; o "maskable" tem a arte menor, dentro da zona segura de 80%, para o
// sistema poder recortar em círculo ou quadrado sem cortar a balança.
//
// Uso: node scripts/build-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const any = readFileSync(join(root, 'icon.svg'), 'utf8');
const maskable = any.replace(' rx="128"', '').replace('translate(106, 106) scale(0.586)', 'translate(136, 136) scale(0.469)');
mkdirSync(join(root, 'icons'), { recursive: true });

const browser = await chromium.launch();
for (const [name, svg, sizes] of [['icon', any, [192, 512]], ['icon-maskable', maskable, [192, 512]]]) {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    writeFileSync(join(root, 'icons', `${name}-${size}.png`), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
    await page.close();
  }
}
await browser.close();
console.log('ícones gerados em icons/');
