import AxeBuilder from '@axe-core/playwright';
import { test, expect, seed, go, ROUTES, ICONS } from './fixtures.mjs';

// WCAG 2.1 AA (e boas práticas do axe nas telas): contraste e regras básicas em todas as telas, nos dois temas.
for (const theme of ['light', 'dark']) {
  test(`acessibilidade WCAG AA (${theme})`, async ({ page, isMobile }) => {
    test.setTimeout(60_000); // cinco telas e três diálogos com axe: ~17 s sozinho, folga para CI lento
    await seed(page, { theme });
    const report = [];
    for (const r of ROUTES) {
      await go(page, r);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`${r}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // Diálogos: ficha do político, cadastro e cola eleitoral
    await go(page, 'meus-politicos');
    // No celular a barra de atalhos some; "Minha Cola" abre pelo botão da própria tela.
    for (const sel of ['[data-details]', '#add', isMobile ? '#btn-open-cola-pol' : '#sub-btn-cola']) {
      await page.locator(sel).first().click();
      await page.waitForSelector('.overlay .modal');
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).include('.overlay').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of violations) report.push(`modal ${sel}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.overlay', { state: 'detached' });
    }
    expect(report).toEqual([]);
  });
}

test.describe('leitor de tela e teclado', () => {
  test('nomes acessíveis não incluem o nome da ligadura do ícone', async ({ page }) => {
    await seed(page);
    for (const r of ROUTES) {
      await go(page, r);
      const tree = await page.locator('#app').ariaSnapshot();
      const leaked = [...ICONS].filter((name) => new RegExp(`\\b${name}\\b`).test(tree));
      expect(leaked, `${r}: ícones lidos em voz alta`).toEqual([]);
    }
  });

  test('trocar de tela leva o foco ao título da nova tela', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado só no desktop');
    await seed(page);
    await go(page, 'inicio');
    await page.locator('.nav a[data-route=alertas]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#view h1')).toBeFocused();
    await expect(page.locator('#view h1')).toHaveText(/Alertas/);
  });

  test('primeiro Tab mostra o link de pulo, que leva ao conteúdo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado só no desktop');
    await seed(page);
    await go(page, 'meus-politicos');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#view h1')).toBeFocused();
    expect(page.url()).toMatch(/#\/meus-politicos$/);
  });

  test('busca do comparador tem rótulo', async ({ page }) => {
    await seed(page);
    await go(page, 'comparador');
    await expect(page.getByRole('textbox', { name: /Buscar votações/ })).toBeVisible();
  });

  test('no toque, chips e botões do topo têm 44px de área clicável', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'área ampliada só em ponteiro grosso');
    await seed(page);
    await go(page, 'inicio');
    const misses = await page.evaluate(() =>
      [...document.querySelectorAll('.civic-chips .chip, .header-icon-btn')]
        .filter((el) => { const b = el.getBoundingClientRect(); return b.width && b.left >= 0 && b.right <= innerWidth; })
        .flatMap((el) => {
          const b = el.getBoundingClientRect();
          const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          return [cy - 21.5, cy + 21.5].filter((y) => !el.contains(document.elementFromPoint(cx, y))).map((y) => `${el.textContent.trim()} @${Math.round(y - cy)}`);
        })
    );
    expect(misses).toEqual([]);
  });

  test('botão flutuante só aparece onde a tela não tem botão próprio de cadastro', async ({ page }) => {
    await seed(page);
    for (const r of ROUTES) {
      await go(page, r);
      await expect(page.locator('#global-fab'), r).toBeVisible({ visible: r === 'alertas' });
      // Toda tela tem uma forma de cadastrar um político.
      await expect(page.locator(r === 'alertas' ? '#global-fab' : '#add, #btn-retificar').first(), r).toBeVisible();
    }
  });

  test('nenhum texto abaixo de 12px (telas e ficha do político)', async ({ page }) => {
    await seed(page);
    const small = () => page.evaluate(() => {
      const out = [];
      document.querySelectorAll('body *').forEach((e) => {
        if (e.closest('.mi, .avatar, script, style') || e.closest('[aria-hidden=true]')) return; // ícones e iniciais decorativas
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(getComputedStyle(e).fontSize) < 12) out.push(`${e.tagName.toLowerCase()}.${e.className} "${e.textContent.trim().slice(0, 24)}"`);
      });
      return out;
    });
    for (const r of ROUTES) {
      await go(page, r);
      expect(await small(), `${r} tem texto abaixo de 12px`).toEqual([]);
    }
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    await page.waitForSelector('.modal');
    expect(await small(), 'ficha do político tem texto abaixo de 12px').toEqual([]);
  });

  test('teclado virtual: a folha acompanha a área visível e o viewport pede redimensionar', async ({ page, isMobile, context }) => {
    test.skip(!isMobile, 'teclado virtual só no celular');
    await seed(page);
    expect(await page.locator('meta[name=viewport]').getAttribute('content')).toContain('interactive-widget=resizes-content');
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    await page.waitForTimeout(700);
    // simula o teclado ocupando a parte de baixo: a área visível cai para 400px
    const cdp = await context.newCDPSession(page);
    const { w, dpr } = await page.evaluate(() => ({ w: innerWidth, dpr: devicePixelRatio }));
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 400, deviceScaleFactor: dpr, mobile: true });
    await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('.overlay').getBoundingClientRect().height)), 'overlay acompanha a área visível').toBe(400);
    const m = await page.locator('.modal').evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
    expect(m.bottom, 'folha encostada no fim da área visível').toBeLessThanOrEqual(400);
    expect(m.top, 'folha não passa do topo da área visível').toBeGreaterThanOrEqual(0);
  });

  test('barra de fontes e atalhos aparece só no desktop (no celular repete a navegação inferior)', async ({ page, isMobile }) => {
    await seed(page);
    await go(page, 'inicio');
    await expect(page.locator('.sub-civic-bar')).toBeVisible({ visible: !isMobile });
  });
});

test('títulos não pulam nível: card do político é h2 na lista e h3 dentro de seção no Início', async ({ page }) => {
  await seed(page);
  await go(page, 'meus-politicos');
  await expect(page.locator('.pol-card h2')).toHaveCount(3);
  await go(page, 'inicio');
  await expect(page.locator('.pol-card h3').first()).toBeVisible();
  await expect(page.locator('.pol-card h2')).toHaveCount(0);
});

test('reflow em 320px: nenhuma tela rola na horizontal (WCAG 1.4.10)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page);
  for (const r of ROUTES) {
    await go(page, r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, `${r} mais larga que 320px`).toBeLessThanOrEqual(0);
  }
});

test.describe('abas por teclado (padrão WAI-ARIA)', () => {
  // Um só ponto de Tab por grupo; setas, Home e End trocam de aba e de painel.
  async function checkTabs(page, tablist) {
    const tabs = page.locator(`${tablist} [role=tab]`);
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);
    await expect(page.locator(`${tablist} [role=tab][tabindex="0"]`)).toHaveCount(1);
    const panelOf = async (t) => page.locator(`#${await t.getAttribute('aria-controls')}`);
    // Diálogos movem o foco para dentro ao abrir; só depois de assentar o teste foca a primeira aba.
    await page.waitForFunction(() => !document.querySelector('.overlay') || document.activeElement?.closest('.modal'));
    // o cadastro move o foco para a busca 60 ms depois de abrir (addPolitician); espera passar para não competir com ele
    if (await page.locator('.overlay').count()) await page.waitForTimeout(200);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'false');
    await expect(await panelOf(tabs.nth(1))).toBeVisible();
    await expect(await panelOf(tabs.first())).toBeHidden();
    await page.keyboard.press('End');
    await expect(tabs.nth(count - 1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.first()).toBeFocused();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(await panelOf(tabs.first())).toBeVisible();
    await expect(await panelOf(tabs.first())).toHaveAttribute('role', 'tabpanel');
  }

  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'teclado só no desktop'));

  test('ficha do político', async ({ page }) => {
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    await checkTabs(page, '#pol-tabs');
  });

  test('cadastro de político', async ({ page }) => {
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('#add').click();
    await checkTabs(page, '#tabs');
  });

  test('comparador', async ({ page }) => {
    await seed(page);
    await go(page, 'comparador');
    await checkTabs(page, '#house-tabs');
  });

  test('análise de proposição', async ({ page }) => {
    await seed(page);
    await go(page, 'inicio');
    await page.evaluate(async () => {
      const m = await import('/src/analysis.js');
      m.openAnalysisModal({ type: 'PL', number: '1', year: '2024', summary: 'Dispõe sobre o saneamento básico.' });
    });
    await checkTabs(page, '#analysis-tabs');
  });
});
