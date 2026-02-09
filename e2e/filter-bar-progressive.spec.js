import { test, expect } from '@playwright/test';

/**
 * Filter Bar Progressive Disclosure Test
 * Tests the filter bar layout and advanced filters panel at different viewport widths
 */

test.describe('Filter Bar Progressive Disclosure', () => {
  test.setTimeout(30000);

  test('wide screen (1440px) shows all filters, no More button', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // All priority filters visible
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="under-300"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="sports"]')).toBeVisible();

    // Overflow filters also visible at wide width
    const artFilter = page.locator('.filter-preset-link[data-filter="art"]');
    await expect(artFilter).toBeVisible();
  });

  test('medium screen (1100px) shows all filter chips + Filters button', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // All filter chips visible (no more priority/overflow distinction)
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="under-300"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="sports"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="art"]')).toBeVisible();

    // Filters button visible (opens AdvancedFilters panel)
    const filtersBtn = page.locator('.filter-control-btn').first();
    await expect(filtersBtn).toBeVisible();

    // Click Filters button
    await filtersBtn.click();
    await page.waitForTimeout(200);

    // Advanced filters panel should appear
    const filtersPanel = page.locator('.filter-panel-animated');
    await expect(filtersPanel).toBeVisible();
  });

  test('tablet screen (800px) shows priority filters + condensed controls', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Priority filters visible
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();

    // Filters button visible
    const filtersBtn = page.locator('.filter-control-btn').first();
    await expect(filtersBtn).toBeVisible();
  });

  test('mobile screen (375px) stacks vertically with scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // On mobile, priority filters should be visible (scrollable)
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();

    // Controls should be visible
    const controls = page.locator('.filter-controls');
    await expect(controls).toBeVisible();
  });
});
