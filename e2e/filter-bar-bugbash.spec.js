import { test, expect } from '@playwright/test';

/**
 * Filter Bar Bug Bash — Feb 2026
 * Comprehensive test suite for the rebuilt filter bar.
 * Tests functional behavior, responsive layout, accessibility, and visual integrity.
 */

const BREAKPOINTS = [
  { name: '1400px desktop', width: 1400, height: 800 },
  { name: '1024px laptop',  width: 1024, height: 768 },
  { name: '768px tablet',   width: 768,  height: 1024 },
  { name: '375px mobile',   width: 375,  height: 812 },
];

const ALL_CHIPS = [
  { filter: 'extended-care', label: 'Extended Care' },
  { filter: 'under-300',     label: 'Under $300' },
  { filter: 'sports',        label: 'Sports' },
  { filter: 'art',           label: 'Art & Creative' },
  { filter: 'stem',          label: 'STEM' },
  { filter: 'outdoors',      label: 'Outdoors' },
];

test.describe('Filter Bar Bug Bash', () => {
  test.setTimeout(30000);

  // ─── 1. ALL 6 CHIPS RENDER WITH ICONS ──────────────────────────────────

  test('all 6 filter chips render with inline SVG icons', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    for (const chip of ALL_CHIPS) {
      const btn = page.locator(`.filter-preset-link[data-filter="${chip.filter}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toContainText(chip.label);

      // Each chip should have an inline SVG icon
      const icon = btn.locator('svg.chip-icon');
      await expect(icon).toBeVisible();
    }
  });

  // ─── 2. "QUICK FILTERS" LABEL REMOVED ─────────────────────────────────

  test('no "Quick filters" label or divider exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    // The old label and divider should be gone
    await expect(page.locator('.filter-presets-label')).toHaveCount(0);
    await expect(page.locator('.filter-presets-divider')).toHaveCount(0);
    await expect(page.locator('text=Quick filters')).toHaveCount(0);
  });

  // ─── 3. INSIGHTS BUTTON REMOVED FROM FILTER BAR ───────────────────────

  test('Insights button is not in the filter controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    // The Insights button should not be within the filter-controls area
    const insightsInBar = page.locator('.filter-controls >> text=Insights');
    await expect(insightsInBar).toHaveCount(0);
  });

  // ─── 4. CHIP TOGGLE ON/OFF ────────────────────────────────────────────

  test('each chip toggles active state on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    for (const chip of ALL_CHIPS) {
      const btn = page.locator(`.filter-preset-link[data-filter="${chip.filter}"]`);

      // Click to activate
      await btn.click();
      await expect(btn).toHaveClass(/active/);

      // Click again to deactivate
      await btn.click();
      await expect(btn).not.toHaveClass(/active/);
    }
  });

  // ─── 5. ACTIVE FILTER CHIPS APPEAR ON TOGGLE ─────────────────────────

  test('activating a filter chip shows an active-filter-chip pill', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    // Click Sports
    await page.locator('.filter-preset-link[data-filter="sports"]').click();
    await page.waitForTimeout(300);

    // Active filters bar should appear with "Sports" chip
    const activeChip = page.locator('.active-filter-chip', { hasText: 'Sports' });
    await expect(activeChip).toBeVisible();

    // Click the active chip to remove it
    await activeChip.click();
    await page.waitForTimeout(300);

    // Sports filter should no longer be active
    await expect(page.locator('.filter-preset-link[data-filter="sports"]')).not.toHaveClass(/active/);
  });

  // ─── 6. CLEAR BUTTON RESETS ALL FILTERS ───────────────────────────────

  test('Clear button resets all active filters', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    // Activate two filters
    await page.locator('.filter-preset-link[data-filter="sports"]').click();
    await page.locator('.filter-preset-link[data-filter="under-300"]').click();
    await page.waitForTimeout(300);

    // Clear button should appear
    const clearBtn = page.locator('.filter-clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(300);

    // Both filters should be deactivated
    await expect(page.locator('.filter-preset-link[data-filter="sports"]')).not.toHaveClass(/active/);
    await expect(page.locator('.filter-preset-link[data-filter="under-300"]')).not.toHaveClass(/active/);

    // Active filters bar should disappear
    await expect(page.locator('.active-filters-bar')).toHaveCount(0);
  });

  // ─── 7. SORT DROPDOWN WORKS ───────────────────────────────────────────

  test('sort dropdown changes sort order', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    const sortSelect = page.locator('.filter-sort-select');
    await expect(sortSelect).toBeVisible();

    // Default is A-Z
    await expect(sortSelect).toHaveValue('camp_name-asc');

    // Change to Price: Low
    await sortSelect.selectOption('min_price-asc');
    await page.waitForTimeout(300);
    await expect(sortSelect).toHaveValue('min_price-asc');

    // Change to Z-A
    await sortSelect.selectOption('camp_name-desc');
    await page.waitForTimeout(300);
    await expect(sortSelect).toHaveValue('camp_name-desc');
  });

  // ─── 8. FILTERS PANEL OPENS AND CLOSES ────────────────────────────────

  test('Filters button toggles advanced filters panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    const filtersBtn = page.locator('.filter-control-btn').first();

    // Panel should not be visible initially
    await expect(page.locator('.filter-panel-animated')).toHaveCount(0);

    // Open panel
    await filtersBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.filter-panel-animated')).toBeVisible();
    await expect(filtersBtn).toHaveClass(/active/);

    // Close panel
    await filtersBtn.click();
    await page.waitForTimeout(300);
    await expect(filtersBtn).not.toHaveClass(/active/);
  });

  // ─── 9. FILTER COUNT BADGE ────────────────────────────────────────────

  test('filter count badge shows when filters are active', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    // No badge initially
    await expect(page.locator('.filter-count')).toHaveCount(0);

    // Activate a filter
    await page.locator('.filter-preset-link[data-filter="sports"]').click();
    await page.waitForTimeout(300);

    // Badge should appear with count
    const badge = page.locator('.filter-count');
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    expect(parseInt(text)).toBeGreaterThanOrEqual(1);
  });

  // ─── 10. SCROLL SHADOW ────────────────────────────────────────────────

  test('sticky bar gets shadow class when page scrolls', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    // Not scrolled — no .scrolled class
    const filterBar = page.locator('.filter-bar-section');
    await expect(filterBar).not.toHaveClass(/scrolled/);

    // Scroll down past hero
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    await expect(filterBar).toHaveClass(/scrolled/);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    await expect(filterBar).not.toHaveClass(/scrolled/);
  });

  // ─── 11. NO OVERLAP AT ALL BREAKPOINTS ────────────────────────────────

  for (const bp of BREAKPOINTS) {
    test(`no overlap between presets and controls at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
      await page.waitForTimeout(500);

      const presets = page.locator('.filter-presets');
      const controls = page.locator('.filter-controls');

      const presetsBox = await presets.boundingBox();
      const controlsBox = await controls.boundingBox();

      expect(presetsBox).not.toBeNull();
      expect(controlsBox).not.toBeNull();

      if (bp.width > 767) {
        // Desktop/tablet: side-by-side, no horizontal overlap
        const presetsRight = presetsBox.x + presetsBox.width;
        const gap = controlsBox.x - presetsRight;
        expect(gap).toBeGreaterThanOrEqual(0);
      } else {
        // Mobile: stacked vertically, controls below presets
        const presetsBottom = presetsBox.y + presetsBox.height;
        expect(controlsBox.y).toBeGreaterThanOrEqual(presetsBottom - 2); // 2px tolerance
      }
    });
  }

  // ─── 12. MOBILE HORIZONTAL SCROLL ─────────────────────────────────────

  test('mobile: filter chips scroll horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });
    await page.waitForTimeout(500);

    const presets = page.locator('.filter-presets');
    const scrollWidth = await presets.evaluate(el => el.scrollWidth);
    const clientWidth = await presets.evaluate(el => el.clientWidth);

    // Scroll width should exceed client width (meaning scrollable)
    expect(scrollWidth).toBeGreaterThan(clientWidth);

    // First chip visible
    await expect(page.locator('.filter-preset-link[data-filter="extended-care"]')).toBeVisible();
  });

  // ─── 13. KEYBOARD ACCESSIBILITY ───────────────────────────────────────

  test('filter chips are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    // Tab into the filter bar area and find a chip
    const firstChip = page.locator('.filter-preset-link[data-filter="extended-care"]');
    await firstChip.focus();

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await expect(firstChip).toHaveClass(/active/);

    // Press Enter again to deactivate
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await expect(firstChip).not.toHaveClass(/active/);
  });

  // ─── 14. SHARE URL BUTTON ─────────────────────────────────────────────

  test('share URL button appears when filters are active', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    // No share button initially
    await expect(page.locator('.share-url-btn')).toHaveCount(0);

    // Activate a filter
    await page.locator('.filter-preset-link[data-filter="sports"]').click();
    await page.waitForTimeout(300);

    // Share button should appear
    await expect(page.locator('.share-url-btn')).toBeVisible();
  });

  // ─── 15. COMBINED FILTERS REDUCE CAMP COUNT ──────────────────────────

  test('stacking filters progressively reduces camp count', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    const initialCount = await page.locator('.camp-card').count();
    expect(initialCount).toBeGreaterThan(0);

    // Activate Under $300
    await page.locator('.filter-preset-link[data-filter="under-300"]').click();
    await page.waitForTimeout(500);
    const afterPrice = await page.locator('.camp-card').count();
    expect(afterPrice).toBeLessThanOrEqual(initialCount);

    // Activate Extended Care on top
    await page.locator('.filter-preset-link[data-filter="extended-care"]').click();
    await page.waitForTimeout(500);
    const afterBoth = await page.locator('.camp-card').count();
    expect(afterBoth).toBeLessThanOrEqual(afterPrice);
  });

  // ─── 16. NO .priority OR .overflow CLASSES IN DOM ─────────────────────

  test('no legacy .priority or .overflow classes in filter chips', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.filter-bar-section', { timeout: 15000 });

    const priorityCount = await page.locator('.filter-preset-link.priority').count();
    const overflowCount = await page.locator('.filter-preset-link.overflow').count();

    expect(priorityCount).toBe(0);
    expect(overflowCount).toBe(0);
  });

  // ─── 17. MULTIPLE CATEGORY FILTERS SIMULTANEOUSLY ────────────────────

  test('multiple category chips can be active simultaneously', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });

    const sports = page.locator('.filter-preset-link[data-filter="sports"]');
    const art = page.locator('.filter-preset-link[data-filter="art"]');
    const stem = page.locator('.filter-preset-link[data-filter="stem"]');

    await sports.click();
    await art.click();
    await stem.click();
    await page.waitForTimeout(300);

    await expect(sports).toHaveClass(/active/);
    await expect(art).toHaveClass(/active/);
    await expect(stem).toHaveClass(/active/);

    // Active filters bar should show all three
    await expect(page.locator('.active-filter-chip', { hasText: 'Sports' })).toBeVisible();
    await expect(page.locator('.active-filter-chip', { hasText: 'Art' })).toBeVisible();
    await expect(page.locator('.active-filter-chip', { hasText: 'Science/STEM' })).toBeVisible();
  });
});
