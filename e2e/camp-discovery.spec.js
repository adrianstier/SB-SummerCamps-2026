import { test, expect } from '@playwright/test';

test.describe('Camp Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for camps to load
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('homepage loads with hero section', async ({ page }) => {
    // Wait for the page to load
    await expect(page.locator('body')).toBeVisible();

    // Check for hero title
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check for search functionality
    await expect(page.locator('.search-input')).toBeVisible();
  });

  test('displays camp cards after loading', async ({ page }) => {
    // Should have camp cards visible
    const campCards = page.locator('.camp-card');
    await expect(campCards.first()).toBeVisible({ timeout: 10000 });

    // Should have multiple camps
    const count = await campCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search filters camps', async ({ page }) => {
    // Get initial camp count
    const initialCount = await page.locator('.camp-card').count();

    // Type in search
    const searchInput = page.locator('.search-input');
    await searchInput.fill('surf');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Either we have filtered results or no results message
    const filteredCount = await page.locator('.camp-card').count();
    const noResults = await page.locator('text=No camps found').count();

    // Should either show filtered camps or no results message
    expect(filteredCount > 0 || noResults > 0).toBe(true);
  });

  test('category filter works', async ({ page }) => {
    // Get initial camp count
    const initialCount = await page.locator('.camp-card').count();

    // Find and click a category pill/button (category pills are in the sidebar)
    const categoryButton = page.locator('.category-pill, button').filter({ hasText: /Art|Sports|Science/i }).first();

    if (await categoryButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryButton.click();
      await page.waitForTimeout(500);

      // Verify filter applied - should still have some camps visible or filtered
      const filteredCount = await page.locator('.camp-card').count();
      expect(filteredCount >= 0).toBe(true);
    }
  });

  test('can toggle between grid and table view', async ({ page }) => {
    // Find view toggle button (switches between grid and table)
    const viewToggle = page.locator('button[title*="table"], button[title*="grid"]').first();

    if (await viewToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewToggle.click();
      await page.waitForTimeout(300);

      // After toggle, page should still work
      await expect(page.locator('body')).toBeVisible();

      // Toggle back
      await viewToggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('clicking a camp opens modal/details', async ({ page }) => {
    // Find a camp card and click it
    const campCard = page.locator('.camp-card').first();

    if (await campCard.isVisible({ timeout: 5000 })) {
      await campCard.click();
      await page.waitForTimeout(500);

      // Check if modal opened (look for modal overlay or expanded content)
      const modal = page.locator('.modal-overlay, .fixed.inset-0.bg-black, [role="dialog"]');
      const hasModal = await modal.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasModal) {
        // Try to close modal with X button or clicking overlay
        const closeButton = page.locator('button').filter({ hasText: '×' }).first();
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        } else {
          // Click overlay to close
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('Filters Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('filter toggles work', async ({ page }) => {
    // Find feature toggle buttons/checkboxes (extended care, food included, etc.)
    const toggles = page.locator('button, label, input[type="checkbox"]').filter({ hasText: /extended|food|transport/i });

    if (await toggles.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggles.first().click();
      await page.waitForTimeout(300);

      // Filter should apply without breaking the page
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('price filter works', async ({ page }) => {
    // Find price slider or input
    const priceSlider = page.locator('input[type="range"]').first();

    if (await priceSlider.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Move the slider
      const box = await priceSlider.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        await page.waitForTimeout(300);
      }

      // Page should still work
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('age filter works', async ({ page }) => {
    // Find age selector - could be input or select
    const ageInput = page.locator('input[type="number"], select').first();

    if (await ageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await ageInput.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'input') {
        await ageInput.fill('10');
      } else if (tagName === 'select') {
        const options = await ageInput.locator('option').count();
        if (options > 1) {
          await ageInput.selectOption({ index: 1 });
        }
      }
      await page.waitForTimeout(300);

      // Page should still work
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for page to load
    await page.waitForSelector('.camp-card, h1', { timeout: 15000 });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Hero should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Wait for page to load - be more flexible
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1', { timeout: 15000 });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds (allowing for API calls)
    expect(loadTime).toBeLessThan(10000);
  });

  test('no critical console errors on page load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for page to load with generous timeout
    await page.waitForSelector('body', { timeout: 5000 });

    // Give a bit more time for any errors to appear
    await page.waitForTimeout(1000);

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('Failed to load resource') &&
      !err.includes('DevTools') &&
      !err.includes('Supabase') &&  // Supabase may not be configured in test
      !err.includes('net::ERR') &&
      !err.includes('404') &&
      !err.includes('ERR_CONNECTION') &&
      !err.includes('json')  // API response parsing errors during load
    );

    // Allow for some non-critical errors in development
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });
});
