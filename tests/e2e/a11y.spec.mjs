import AxeBuilder from '@axe-core/playwright';
import { test, expect, seed, go, ROUTES } from './fixtures.mjs';

// WCAG 2.1 AA: contraste e regras básicas de acessibilidade em todas as telas, nos dois temas.
for (const theme of ['light', 'dark']) {
  test(`acessibilidade WCAG AA (${theme})`, async ({ page }) => {
    await seed(page, { theme });
    const report = [];
    for (const r of ROUTES) {
      await go(page, r);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of violations) report.push(`${r}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    // Diálogos: ficha do político, cadastro e cola eleitoral
    await go(page, 'meus-politicos');
    for (const sel of ['[data-details]', '#global-fab', '#sub-btn-cola']) {
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
