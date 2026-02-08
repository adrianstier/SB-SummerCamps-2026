import { test, expect } from '@playwright/test';

/**
 * Filter Bar Rebuild Test
 * Tests the rebuilt filter bar at multiple viewport widths
 */

test.describe('Filter Bar Rebuild', () => {
  test.setTimeout(30000);

  const viewports = [
    { name: 'Desktop Wide', width: 1400, height: 800 },
    { name: 'Desktop', width: 1200, height: 800 },
    { name: 'Laptop', width: 1024, height: 768 },
    { name: 'Tablet', width: 768, height: 1024 },
  ];

  for (const vp of viewports) {
    test(`filter bar works at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Check Sports button is visible and has full text
      const sportsBtn = page.locator('.filter-preset-link[data-filter="sports"]');
      await expect(sportsBtn).toBeVisible();

      const sportsText = await sportsBtn.textContent();
      expect(sportsText.trim()).toContain('Sports');

      // Check that filter controls are visible
      const filtersBtn = page.locator('.filter-control-btn').first();
      await expect(filtersBtn).toBeVisible();

      // Get bounding boxes
      const presets = page.locator('.filter-presets');
      const controls = page.locator('.filter-controls');

      const presetsBox = await presets.boundingBox();
      const controlsBox = await controls.boundingBox();

      console.log(`${vp.name}: Presets width=${presetsBox?.width}, Controls x=${controlsBox?.x}`);

      // On desktop (> 768px), verify no overlap
      if (vp.width > 768 && presetsBox && controlsBox) {
        const presetsRight = presetsBox.x + presetsBox.width;
        const gap = controlsBox.x - presetsRight;
        console.log(`${vp.name}: Gap = ${gap}px`);
        expect(gap).toBeGreaterThanOrEqual(0);
      } else if (vp.width <= 768) {
        // On mobile, layout is stacked vertically
        console.log(`${vp.name}: Mobile stacked layout`);
      }

      // Click Sports filter
      await sportsBtn.click();
      await page.waitForTimeout(300);
      await expect(sportsBtn).toHaveClass(/active/);
    });
  }

  test('filter icons display correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    // Take screenshot
    const filterBar = page.locator('.filter-bar-section');
    await filterBar.screenshot({ path: 'filter-bar-rebuilt.png' });

    // Check priority quick filter buttons are visible
    const priorityFilters = ['extended-care', 'under-300', 'sports'];
    for (const filter of priorityFilters) {
      const btn = page.locator(`.filter-preset-link[data-filter="${filter}"]`);
      await expect(btn).toBeVisible();
    }

    // At wide viewport, overflow filters should also be visible
    const overflowFilters = ['art', 'stem', 'outdoors'];
    for (const filter of overflowFilters) {
      const btn = page.locator(`.filter-preset-link[data-filter="${filter}"]`);
      await expect(btn).toBeVisible();
    }
  });
});
