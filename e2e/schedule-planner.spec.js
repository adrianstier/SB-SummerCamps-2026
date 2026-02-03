import { test, expect } from '@playwright/test';

/**
 * Schedule Planner - Add Camp Flow
 * Tests the core functionality of adding a camp to a week.
 * This exercises the same handleAddCamp code path as drag-and-drop.
 *
 * To run with auth:
 *   1. npx playwright test --project=setup --headed  (sign in manually)
 *   2. npx playwright test --project=authenticated
 *
 * Or run directly (will skip if no children are available):
 *   npx playwright test e2e/schedule-planner.spec.js
 */

test.describe('Schedule Planner', () => {
  test.setTimeout(60000);

  test('planner opens and shows schedule UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click "Plan My Summer"
    const planBtn = page.locator('button:has-text("Plan My Summer")').first();
    await expect(planBtn).toBeVisible({ timeout: 5000 });
    await planBtn.click();

    // Verify planner opens with correct title
    await expect(page.locator('.planner-container').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.planner-title')).toHaveText('Summer 2026');

    // Verify tabs are present
    await expect(page.locator('.planner-tab').first()).toBeVisible();
  });

  test('add camp to week - validates persistence fix', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Open planner
    await page.locator('button:has-text("Plan My Summer")').first().click();
    await expect(page.locator('.planner-container').first()).toBeVisible({ timeout: 5000 });

    // Check for children (requires auth + at least one child configured)
    const childPill = page.locator('.planner-child-pill, .planner-child-pill-mobile').first();
    const hasChild = await childPill.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasChild) {
      console.log('No children available. Either not authenticated or no children configured.');
      console.log('To run this test: sign in and add a child, then save auth state.');
      test.skip(true, 'No children available');
      return;
    }

    // Select child
    await childPill.click();
    await page.waitForTimeout(500);
    console.log('Child selected');

    // Find an empty week
    const emptyWeek = page.locator('.week-card:not(.has-camps):not(.is-blocked)').first();
    if (!await emptyWeek.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(true, 'No empty weeks available');
      return;
    }

    // Click the empty week
    const weekNum = await emptyWeek.locator('.week-card-number').textContent();
    console.log(`Testing week ${weekNum}`);
    await emptyWeek.click();

    // Block menu appears - click "Add a Camp"
    await expect(page.locator('.week-block-menu')).toBeVisible({ timeout: 3000 });
    await page.locator('.block-menu-camp').click();

    // Camp drawer opens with camps
    await expect(page.locator('.planner-drawer')).toBeVisible({ timeout: 5000 });
    const campItem = page.locator('.planner-drawer-camp').first();
    await expect(campItem).toBeVisible({ timeout: 10000 });

    const campName = await campItem.locator('.planner-drawer-camp-name').textContent();
    console.log(`Adding: "${campName}"`);

    // Click camp to add it (this triggers handleAddCamp)
    await campItem.click();

    // Verify: drawer closes (means handleAddCamp didn't error)
    await expect(page.locator('.planner-drawer')).not.toBeVisible({ timeout: 10000 });

    // Verify: no error message shown
    const hasError = await page.locator('.planner-status-message').isVisible({ timeout: 1500 }).catch(() => false);
    if (hasError) {
      const errorText = await page.locator('.planner-status-message').textContent();
      if (errorText.toLowerCase().includes('failed')) {
        throw new Error(`Add camp FAILED: "${errorText}" - the validation/persistence fix may not be working`);
      }
    }

    // Verify: camp card appears in the schedule grid
    await page.waitForTimeout(1500);
    const campCard = page.locator('.camp-card-enhanced').first();
    await expect(campCard).toBeVisible({ timeout: 5000 });

    // Verify: camp name is correct (not "Unknown")
    const displayedName = await campCard.locator('.camp-card-name').textContent();
    expect(displayedName).not.toBe('Unknown');
    expect(displayedName.length).toBeGreaterThan(0);
    console.log(`SUCCESS: "${displayedName}" persisted in week ${weekNum}`);

    // Clean up: remove the test camp from the schedule
    const removeBtn = campCard.locator('.camp-card-remove');
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
      console.log('Cleanup: camp removed');
    }
  });
});
