import { test, expect } from '@playwright/test';

/**
 * Filter Bar Visual Test
 * Verifies the filter bar layout doesn't have overlapping elements
 */

test.describe('Filter Bar Layout', () => {
  test.setTimeout(30000);

  test('filter bar elements do not overlap', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 10000 });
    await page.waitForTimeout(500); // Let layout settle

    // Get bounding boxes of key elements
    const presets = page.locator('.filter-presets');
    const controls = page.locator('.filter-controls');

    const presetsBox = await presets.boundingBox();
    const controlsBox = await controls.boundingBox();

    // Verify they don't overlap (presets right edge should be left of controls left edge)
    expect(presetsBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();

    if (presetsBox && controlsBox) {
      const presetsRight = presetsBox.x + presetsBox.width;
      const controlsLeft = controlsBox.x;

      console.log(`Presets right edge: ${presetsRight}px`);
      console.log(`Controls left edge: ${controlsLeft}px`);
      console.log(`Gap: ${controlsLeft - presetsRight}px`);

      // There should be at least 8px gap (our gap setting)
      expect(controlsLeft - presetsRight).toBeGreaterThanOrEqual(8);
    }
  });

  test('clicking Sports filter shows active state without overlap', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Click Sports filter
    const sportsBtn = page.locator('.filter-preset-link[data-filter="sports"]');
    await sportsBtn.click();
    await page.waitForTimeout(500);

    // Verify Sports button has active class
    await expect(sportsBtn).toHaveClass(/active/);

    // Verify no overlap
    const presets = page.locator('.filter-presets');
    const controls = page.locator('.filter-controls');

    const presetsBox = await presets.boundingBox();
    const controlsBox = await controls.boundingBox();

    if (presetsBox && controlsBox) {
      const presetsRight = presetsBox.x + presetsBox.width;
      const controlsLeft = controlsBox.x;

      console.log(`After Sports click - Gap: ${controlsLeft - presetsRight}px`);
      expect(controlsLeft - presetsRight).toBeGreaterThanOrEqual(8);
    }
  });
});
