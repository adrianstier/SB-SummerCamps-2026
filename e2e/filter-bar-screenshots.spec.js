import { test } from '@playwright/test';

/**
 * Filter Bar Screenshot Capture
 * Visual verification at 4 breakpoints x 3 states
 */

const BREAKPOINTS = [
  { name: '1400-desktop', width: 1400, height: 800 },
  { name: '1024-laptop',  width: 1024, height: 768 },
  { name: '768-tablet',   width: 768,  height: 1024 },
  { name: '375-mobile',   width: 375,  height: 812 },
];

test.describe('Filter Bar Screenshots', () => {
  test.setTimeout(30000);

  for (const bp of BREAKPOINTS) {
    test(`${bp.name}: default state`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Scroll to make filter bar sticky
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(300);

      await page.locator('.filter-bar-section').screenshot({
        path: `data/screenshots/verification/filter-bar-${bp.name}-default.png`,
      });
    });

    test(`${bp.name}: with active filters`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForSelector('.camp-card', { timeout: 15000 });

      // Activate Sports + Under $300
      await page.locator('.filter-preset-link[data-filter="sports"]').click();
      await page.locator('.filter-preset-link[data-filter="under-300"]').click();
      await page.waitForTimeout(500);

      // Scroll to sticky position
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(300);

      // Screenshot the full filter section including active pills
      const filterSection = page.locator('.filter-bar-section');
      await filterSection.screenshot({
        path: `data/screenshots/verification/filter-bar-${bp.name}-active.png`,
      });
    });

    test(`${bp.name}: with filters panel open`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
      await page.waitForTimeout(300);

      // Open advanced filters
      await page.locator('.filter-control-btn').first().click();
      await page.waitForTimeout(500);

      // Full page screenshot to see panel below bar
      await page.screenshot({
        path: `data/screenshots/verification/filter-bar-${bp.name}-panel.png`,
        fullPage: false,
      });
    });
  }
});
