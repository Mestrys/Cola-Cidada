import { test, expect, seed, go, ROUTES, ICONS, CSP } from './fixtures.mjs';

test.describe('telas', () => {
  for (const theme of ['light', 'dark']) {
    test(`todas as telas renderizam sem estourar a largura (${theme})`, async ({ page }) => {
      await seed(page, { theme });
      for (const r of ROUTES) {
        await go(page, r);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(overflow, `${r} mais larga que a tela`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('fonte grande do sistema (24 px): texto cresce e nada estoura', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.enable');
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 24 } });
    await seed(page);
    for (const r of ROUTES) {
      await go(page, r);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${r} mais larga que a tela`).toBeLessThanOrEqual(0);
    }
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBe(21);
    const nav = page.locator('.mobile-nav a');
    if (await nav.first().isVisible()) {
      const boxes = await nav.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
      expect(Math.max(...boxes)).toBeLessThanOrEqual(page.viewportSize().width);
    }
  });

  test('ícones usados estão no subconjunto da fonte', async ({ page }) => {
    await seed(page);
    const used = new Set();
    const collect = async () => (await page.$$eval('.mi', (els) => els.map((e) => e.textContent.trim()))).forEach((t) => t && used.add(t));
    for (const r of ROUTES) { await go(page, r); await collect(); }
    await go(page, 'meus-politicos');
    for (const sel of ['[data-details]', '[data-dossier]', '[data-share]', '#global-fab']) {
      await page.locator(sel).first().click();
      await page.waitForSelector('.overlay .modal');
      await collect();
      await page.keyboard.press('Escape');
      await expect(page.locator('.overlay')).toHaveCount(0);
    }
    expect([...used].filter((i) => !ICONS.has(i))).toEqual([]);
  });

  test('CSP do vercel.json não bloqueia nada do app', async ({ page }) => {
    await page.route('http://localhost:4173/**', async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': CSP } });
    });
    const violations = [];
    await page.exposeFunction('__csp', (v) => violations.push(v));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.__csp(`${e.violatedDirective} ${e.blockedURI}`)));
    await seed(page);
    for (const r of ROUTES) await go(page, r);
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    await page.waitForSelector('#pol-tabs');
    expect(violations).toEqual([]);
  });
});

test.describe('diálogos', () => {
  test('abas da ficha ficam visíveis e acessíveis', async ({ page }) => {
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    const tabs = page.locator('#pol-tabs');
    await expect(tabs).toHaveAttribute('role', 'tablist');
    expect((await tabs.boundingBox()).height).toBeGreaterThanOrEqual(36);
    const second = tabs.locator('button').nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-selected', 'true');
  });

  test('Esc fecha, foco fica preso e volta ao botão de origem', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado só no desktop');
    await seed(page);
    await go(page, 'meus-politicos');
    const trigger = page.locator('[data-details]').first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.modal')).toHaveAttribute('aria-labelledby', /.+/);
    for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.modal'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.classList.contains('modal-open'))).toBe(false);
  });

  test('folha inferior: arrasto curto volta, lançamento fecha', async ({ page, isMobile, context }) => {
    test.skip(!isMobile, 'gesto só no celular');
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    await page.waitForTimeout(400);
    const cdp = await context.newCDPSession(page);
    const box = await page.locator('.modal').boundingBox();
    const drag = async (dy, steps, ms) => {
      const x = box.x + box.width / 2, y = box.y + 30;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / steps }] });
        await page.waitForTimeout(ms);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await drag(100, 12, 40);
    await page.waitForTimeout(800);
    await expect(page.locator('.overlay')).toHaveCount(1);
    await drag(150, 4, 8);
    await expect(page.locator('.overlay')).toHaveCount(0);
  });

  test('movimento reduzido troca deslizamento por esmaecimento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('[data-details]').first().click();
    expect(await page.locator('.modal').evaluate((m) => getComputedStyle(m).animationName)).toBe('fade');
  });
});

test.describe('fluxos', () => {
  test('remover político pode ser desfeito na mesma posição', async ({ page }) => {
    await seed(page);
    await go(page, 'meus-politicos');
    await page.locator('[data-remove]').first().click();
    await expect(page.locator('.pol-card')).toHaveCount(2);
    await page.locator('.toast-action').click();
    await expect(page.locator('.pol-card')).toHaveCount(3);
    const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('monitor-cidadao:v1')).politicians.map((p) => p.id));
    expect(ids[0]).toBe('camara-160561');
  });

  test('tema segue o sistema e o botão do cabeçalho alterna', async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await seed(page, { theme: 'system' });
    await go(page, 'inicio');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (isMobile) {
      await page.locator('#header-theme-btn').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    }
  });

  test('cadastro abre no estado do domicílio e grava o mandato da UF', async ({ page }) => {
    await seed(page, { politicians: [], domicile: { state: 'MG', city: 'Belo Horizonte' } });
    await go(page, 'meus-politicos');
    await page.locator('#global-fab').click();
    await expect(page.locator('#sel-state-uf')).toHaveValue('MG');
    await page.locator('#tabs button[data-tab=estadual]').click();
    await page.locator('.btn-select-est').first().click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('monitor-cidadao:v1')).politicians[0]);
    expect(saved.uf).toBe('MG');
    expect(saved.mandate).toEqual(['2023-02-01', '2027-01-31']);
    expect(saved.tse?.ballotNumber).toBeTruthy();
  });

  test('cadastro antigo com data da ALESP exibe o mandato correto', async ({ page }) => {
    await seed(page);
    await go(page, 'meus-politicos');
    await expect(page.locator('.pol-card').nth(2)).toContainText('31/01/2027');
  });

  test('onboarding abre no primeiro acesso sem atraso', async ({ page }) => {
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (!window.__shell && document.querySelector('.app-wrapper')) window.__shell = performance.now();
        if (!window.__modal && document.querySelector('.overlay')) window.__modal = performance.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/');
    await page.waitForSelector('.overlay .modal');
    expect(await page.evaluate(() => window.__modal - window.__shell)).toBeLessThan(100);
  });
});
