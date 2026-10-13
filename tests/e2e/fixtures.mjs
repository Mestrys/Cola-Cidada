import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Os testes não dependem das APIs públicas: tudo fora do servidor local (e das fontes) é bloqueado,
// então as telas são exercitadas também nos estados de erro/vazio.
export const POLITICIANS = [
  { id: 'camara-160561', source: 'camara', camaraId: 160561, name: 'Deputado Teste', party: 'PL', uf: 'SP', roleKey: 'dep-federal', mandate: ['2023-02-01', '2027-01-31'] },
  { id: 'senado-5982', source: 'senado', senadoId: '5982', name: 'Senador Teste', party: 'MDB', uf: 'SE', roleKey: 'senador', mandate: ['2023-02-01', '2031-01-31'] },
  { id: 'mg-1', source: 'al-mg', name: 'Dep. Estadual Teste', party: 'PT', uf: 'MG', roleKey: 'dep-estadual', house: 'Assembleia Legislativa de Minas Gerais (ALMG)', mandate: ['2023-03-15', '2027-03-14'] },
];

export const ROUTES = ['inicio', 'meus-politicos', 'comparador', 'alertas', 'perfil'];

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url)));
export const CSP = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
export const ICONS = new Set(readFileSync(new URL('../../index.html', import.meta.url), 'utf8').match(/icon_names=([a-z0-9_,]+)/)[1].split(','));

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|fonts\.googleapis\.com|fonts\.gstatic\.com)/, (r) => r.abort());
    await use(page);
    expect(errors, 'erros de JavaScript na página').toEqual([]);
  },
});

export async function seed(page, state = {}) {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('monitor-cidadao:v1', JSON.stringify(s)), {
    theme: 'light', politicians: POLITICIANS, prefs: {}, alerts: [], domicile: { state: 'SP', city: 'São Paulo' }, onboardingDone: true, ...state,
  });
}

export async function go(page, route) {
  await page.goto(`/#/${route}`);
  await page.reload();
  await page.waitForSelector('#view > *');
}

export { expect };
