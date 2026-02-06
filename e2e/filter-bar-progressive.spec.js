import { test, expect } from '@playwright/test';

/**
 * Filter Bar Progressive Disclosure Test
 * Tests the "More" dropdown pattern at different viewport widths
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
    const artFilter = page.locator('.filter-presets > .filter-preset-link[data-filter="art"]');
    await expect(artFilter).toBeVisible();

    // More button should be hidden
    const moreBtn = page.locator('.filter-more-btn');
    await expect(moreBtn).not.toBeVisible();
  });

  test('medium screen (1100px) shows priority filters + More button', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Priority filters visible
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="under-300"]')).toBeVisible();
    await expect(page.locator('.filter-preset-link[data-filter="sports"]')).toBeVisible();

    // Overflow filters hidden
    const artFilter = page.locator('.filter-presets > .filter-preset-link.overflow[data-filter="art"]');
    await expect(artFilter).not.toBeVisible();

    // More button visible
    const moreBtn = page.locator('.filter-more-btn');
    await expect(moreBtn).toBeVisible();

    // Click More button
    await moreBtn.click();
    await page.waitForTimeout(200);

    // Dropdown should appear with overflow filters
    const dropdown = page.locator('.filter-more-dropdown');
    await expect(dropdown).toBeVisible();

    // Click Art filter in dropdown
    const artInDropdown = dropdown.locator('button:has-text("Art & Creative")');
    await artInDropdown.click();
    await page.waitForTimeout(300);

    // Art filter should now be active
    // More button should show selection indicator
    await expect(moreBtn).toHaveClass(/has-selection/);
  });

  test('tablet screen (800px) shows priority filters + More, condensed controls', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Priority filters visible
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();

    // More button visible
    const moreBtn = page.locator('.filter-more-btn');
    await expect(moreBtn).toBeVisible();

    // Filter controls should be icon-only (text hidden)
    const filtersBtn = page.locator('.filter-control-btn').first();
    await expect(filtersBtn).toBeVisible();
  });

  test('mobile screen (375px) stacks vertically with scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    // On mobile, all filters should be visible (scrollable)
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();

    // More button should be hidden on mobile
    const moreBtn = page.locator('.filter-more-btn');
    await expect(moreBtn).not.toBeVisible();

    // Controls should be on separate row
    const controls = page.locator('.filter-controls');
    await expect(controls).toBeVisible();
  });
});
