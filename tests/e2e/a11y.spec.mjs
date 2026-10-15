import AxeBuilder from '@axe-core/playwright';
import { test, expect, seed, go, ROUTES, ICONS } from './fixtures.mjs';

// WCAG 2.1 AA (e boas práticas do axe nas telas): contraste e regras básicas em todas as telas, nos dois temas.
for (const theme of ['light', 'dark']) {
  test(`acessibilidade WCAG AA (${theme})`, async ({ page, isMobile }) => {
    test.setTimeout(120_000); // telas, painéis e diálogos com axe: ~40 s sozinho no celular, folga para CI lento
    await seed(page, { theme });
    const report = [];
    for (const r of ROUTES) {
      await go(page, r);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`${r}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // Painel: a aba de contas (com uma conta aberta, mesmo sem rede) e a ficha de um governador
    await go(page, 'painel');
    await page.locator('#painel-tabs [data-section=orgaos]').click();
    await page.locator('[data-accounts]').first().click();
    await page.waitForTimeout(300);
    {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`painel contas: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // contratos da prefeitura (PNCP) abertos: a resposta é simulada, sem rede
    await page.route('https://pncp.gov.br/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [{ numeroControlePNCP: '1', dataPublicacaoPncp: '2026-10-01T09:00:00', objetoContrato: 'Reforma da escola', nomeRazaoSocialFornecedor: 'CONSTRUTORA X', valorGlobal: 5000, tipoContrato: { nome: 'Contrato' }, orgaoEntidade: { cnpj: '1' }, anoContrato: 2026, sequencialContrato: 1 }], totalRegistros: 1, totalPaginas: 1 }) })
    );
    await go(page, 'painel');
    await page.locator('#painel-tabs [data-section=orgaos]').click();
    await page.locator('[data-contracts]').first().focus(); // pelo teclado: as barras fixas do celular cobrem o botão no clique
    await page.keyboard.press('Enter');
    await page.locator('[id^=ct-] li').first().waitFor();
    await page.waitForTimeout(300);
    {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`painel contratos: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // vereadores com o filtro de cidade (cidades-polo)
    await go(page, 'painel');
    await page.locator('#painel-tabs [data-section=vereadores]').click();
    await page.locator('#painel-uf').selectOption('SC');
    // trocar de estado refaz o painel: espera as cidades do estado novo, não as do anterior
    await page.locator('#painel-city option', { hasText: 'Joinville' }).waitFor({ state: 'attached' });
    await page.locator('#painel-city').selectOption('Joinville');
    await page.waitForTimeout(300);
    {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`painel vereadores/cidade: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // perfil de prefeito de cidade-polo, com o bloco "A cidade"
    await page.locator('#painel-tabs [data-section=prefeitos]').click();
    await page.locator('.painel-open').first().click();
    await page.waitForSelector('#city-facts section');
    await page.waitForTimeout(400);
    {
      const { violations } = await new AxeBuilder({ page }).include('.overlay').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of violations) report.push(`modal cidade: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    await page.keyboard.press('Escape');
    await page.waitForSelector('.overlay', { state: 'detached' });
    // gastos por Poder: o comparativo entre estados (a lista por estado já foi coberta pelo laço das telas)
    await go(page, 'poderes');
    await page.locator('#poderes-tabs [data-tab=comparar]').click();
    await page.locator('tbody tr').first().waitFor();
    await page.waitForTimeout(300);
    {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
      for (const v of violations) report.push(`poderes comparar: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    const dialogs = [
      ['meus-politicos', null, '[data-details]'],
      ['painel', 'governadores', '.painel-open'],
      ['painel', 'stf', '.painel-open'],
    ];
    for (const [route, section, sel] of dialogs) {
      await go(page, route);
      if (section) await page.locator(`#painel-tabs [data-section=${section}]`).click();
      await page.locator(sel).first().click();
      await page.waitForSelector('.overlay .modal');
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).include('.overlay').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of violations) report.push(`modal ${section || sel}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
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

  test('nenhuma tela pede cadastro: todas levam ao Painel Público', async ({ page }) => {
    await seed(page, { politicians: [] });
    for (const r of ROUTES) {
      await go(page, r);
      await expect(page.locator('.overlay'), r).toHaveCount(0);
      await expect(page.locator('#global-fab'), r).toHaveCount(0);
      await expect(page.locator('#view a[href="#/painel"], #painel-tabs').first(), r).toBeVisible();
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

  test('painel público: um só painel, setas trocam o cargo e o foco fica na aba', async ({ page }) => {
    await seed(page);
    await go(page, 'painel');
    const tabs = page.locator('#painel-tabs [role=tab]');
    await expect(page.locator('#painel-tabs [role=tab][tabindex="0"]')).toHaveCount(1);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator('#painel-panel');
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute('aria-labelledby', await tabs.nth(1).getAttribute('id'));
    await expect(page.locator('#painel-count')).toContainText('resultado');
    await page.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
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
