import { test, expect } from '@playwright/test';

test.describe('Filter Bar - Full Visual Audit', () => {

  test('desktop layout audit (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    // === SECTION: Overall filter bar dimensions ===
    const section = await page.locator('.filter-bar-section').boundingBox();
    const inner = await page.locator('.filter-bar-inner').boundingBox();
    const maxW = await page.locator('.max-w-6xl').first().boundingBox();
    console.log('\n=== FILTER BAR SECTION ===');
    console.log(`  Section: x=${section?.x} w=${section?.width} h=${section?.height}`);
    console.log(`  Inner: x=${inner?.x} w=${inner?.width} h=${inner?.height}`);
    console.log(`  Max-w container: x=${maxW?.x} w=${maxW?.width}`);
    console.log(`  Viewport: 1280px`);

    // === SECTION: Chip row vs controls gap ===
    const presets = await page.locator('.filter-presets').boundingBox();
    const controls = await page.locator('.filter-controls').boundingBox();
    const gapBetween = controls.x - (presets.x + presets.width);
    console.log('\n=== CHIP ROW vs CONTROLS ===');
    console.log(`  Presets: x=${presets.x} w=${presets.width} right=${(presets.x + presets.width).toFixed(0)}`);
    console.log(`  Controls: x=${controls.x} w=${controls.width} right=${(controls.x + controls.width).toFixed(0)}`);
    console.log(`  Gap between: ${gapBetween.toFixed(0)}px`);
    console.log(`  ISSUE: ${gapBetween > 40 ? `Excessive gap (${gapBetween.toFixed(0)}px) - chips and controls too far apart` : 'Gap OK'}`);

    // === SECTION: Individual chip sizing ===
    const chips = page.locator('.filter-preset-link');
    const chipCount = await chips.count();
    console.log(`\n=== CHIP DETAILS (${chipCount} chips) ===`);
    let totalChipWidth = 0;
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const box = await chip.boundingBox();
      const text = await chip.textContent();
      const style = await chip.evaluate(el => {
        const s = window.getComputedStyle(el);
        return { padding: s.padding, fontSize: s.fontSize, height: s.height, fontWeight: s.fontWeight, gap: s.gap };
      });
      totalChipWidth += box.width;
      console.log(`  [${i}] "${text.trim()}" — ${box.width.toFixed(0)}x${box.height.toFixed(0)}px, padding: ${style.padding}, font: ${style.fontSize}/${style.fontWeight}`);
    }
    const chipGaps = (chipCount - 1) * 8; // gap: 8px
    console.log(`  Total chip width (with gaps): ${(totalChipWidth + chipGaps).toFixed(0)}px`);
    console.log(`  Available width: ${presets.width.toFixed(0)}px`);
    console.log(`  Utilization: ${((totalChipWidth + chipGaps) / presets.width * 100).toFixed(0)}%`);

    // === SECTION: Control buttons ===
    console.log('\n=== CONTROL BUTTONS ===');
    const controlChildren = page.locator('.filter-controls > *');
    const controlCount = await controlChildren.count();
    for (let i = 0; i < controlCount; i++) {
      const el = controlChildren.nth(i);
      const box = await el.boundingBox();
      const tag = await el.evaluate(e => e.tagName);
      const text = await el.textContent();
      console.log(`  [${i}] <${tag}> "${text.trim()}" — ${box?.width.toFixed(0)}x${box?.height.toFixed(0)}px at x=${box?.x.toFixed(0)}`);
    }

    // === SECTION: Active filters bar (click a chip first) ===
    await chips.nth(2).click(); // Click "Sports"
    await page.waitForTimeout(500);

    const activeBar = await page.locator('.active-filters-bar');
    if (await activeBar.count() > 0) {
      const activeBox = await activeBar.boundingBox();
      const activeStyle = await activeBar.evaluate(el => {
        const s = window.getComputedStyle(el);
        return { display: s.display, padding: s.padding, gap: s.gap, flexWrap: s.flexWrap, width: s.width };
      });
      console.log('\n=== ACTIVE FILTERS BAR ===');
      console.log(`  Box: x=${activeBox?.x} w=${activeBox?.width} h=${activeBox?.height}`);
      console.log(`  Style: ${JSON.stringify(activeStyle)}`);

      // Check if active bar is within content bounds
      if (maxW && activeBox) {
        const leftOverhang = maxW.x - activeBox.x;
        const rightOverhang = (activeBox.x + activeBox.width) - (maxW.x + maxW.width);
        console.log(`  Left overhang: ${leftOverhang.toFixed(0)}px ${leftOverhang > 0 ? '⚠️ OVERFLOWS LEFT' : '✓'}`);
        console.log(`  Right overhang: ${rightOverhang.toFixed(0)}px ${rightOverhang > 0 ? '⚠️ OVERFLOWS RIGHT' : '✓'}`);
      }

      // Active chips
      const activePills = page.locator('.active-filter-chip');
      const pillCount = await activePills.count();
      for (let i = 0; i < pillCount; i++) {
        const pill = activePills.nth(i);
        const text = await pill.textContent();
        const box = await pill.boundingBox();
        console.log(`  Pill: "${text.trim()}" — ${box?.width.toFixed(0)}x${box?.height.toFixed(0)}px`);
      }
    }

    // Take screenshot with active filter
    await page.screenshot({ path: 'e2e/screenshots/audit-desktop-active.png', fullPage: false });

    // Deactivate
    await chips.nth(2).click();
    await page.waitForTimeout(300);

    // === SECTION: Vertical spacing ===
    const sectionBox = await page.locator('.filter-bar-section').boundingBox();
    console.log('\n=== VERTICAL SPACING ===');
    console.log(`  Total filter bar height: ${sectionBox?.height.toFixed(0)}px`);
    console.log(`  ISSUE: ${sectionBox?.height > 80 ? `Filter bar is ${sectionBox?.height.toFixed(0)}px tall - too much vertical space` : 'Height OK'}`);

    // Take clean screenshot
    await page.screenshot({ path: 'e2e/screenshots/audit-desktop-clean.png', fullPage: false });
  });

  test('tablet layout audit (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    const presets = await page.locator('.filter-presets').evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isOverflowing: el.scrollWidth > el.clientWidth,
    }));
    console.log('\n=== TABLET (768px) ===');
    console.log(`  Scroll: ${presets.scrollWidth}px, Client: ${presets.clientWidth}px, Overflowing: ${presets.isOverflowing}`);

    const inner = await page.locator('.filter-bar-inner').evaluate(el => {
      const s = window.getComputedStyle(el);
      return { flexDirection: s.flexDirection, gap: s.gap };
    });
    console.log(`  Inner layout: direction=${inner.flexDirection}, gap=${inner.gap}`);

    if (presets.isOverflowing) {
      console.log(`  ⚠️ Chips overflow but no scroll indicator visible at 768px`);
    }

    await page.screenshot({ path: 'e2e/screenshots/audit-tablet.png', fullPage: false });
  });

  test('mobile layout audit (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    const presets = await page.locator('.filter-presets').evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isOverflowing: el.scrollWidth > el.clientWidth,
    }));

    const inner = await page.locator('.filter-bar-inner').evaluate(el => {
      const s = window.getComputedStyle(el);
      return { flexDirection: s.flexDirection, gap: s.gap, alignItems: s.alignItems };
    });

    console.log('\n=== MOBILE (375px) ===');
    console.log(`  Scroll: ${presets.scrollWidth}px, Client: ${presets.clientWidth}px, Overflowing: ${presets.isOverflowing}`);
    console.log(`  Inner: direction=${inner.flexDirection}, gap=${inner.gap}`);

    // Check controls row
    const controls = await page.locator('.filter-controls').boundingBox();
    console.log(`  Controls: w=${controls?.width.toFixed(0)} h=${controls?.height.toFixed(0)}`);

    // Activate a filter and check active bar
    const chips = page.locator('.filter-preset-link');
    await chips.first().click();
    await page.waitForTimeout(500);

    const activeBar = await page.locator('.active-filters-bar');
    if (await activeBar.count() > 0) {
      const activeBox = await activeBar.boundingBox();
      console.log(`  Active bar: x=${activeBox?.x} w=${activeBox?.width.toFixed(0)}`);
      console.log(`  ⚠️ Active bar extends to x=0: ${activeBox?.x === 0 ? 'YES - not padded' : 'No'}`);
    }

    await page.screenshot({ path: 'e2e/screenshots/audit-mobile-active.png', fullPage: false });

    // Deactivate
    await chips.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/audit-mobile-clean.png', fullPage: false });
  });

  test('interaction audit - all chips', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    console.log('\n=== INTERACTION AUDIT ===');
    const chips = page.locator('.filter-preset-link');
    const chipCount = await chips.count();

    // Test: click each chip, check active visual state matches
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const text = await chip.textContent();

      await chip.click();
      await page.waitForTimeout(300);

      const isActive = await chip.evaluate(el => el.classList.contains('active'));
      const bg = await chip.evaluate(el => window.getComputedStyle(el).background);
      const color = await chip.evaluate(el => window.getComputedStyle(el).color);
      const hasActivePill = await page.locator('.active-filter-chip').count();

      console.log(`  "${text.trim()}" → active: ${isActive}, pill count: ${hasActivePill}, color: ${color.slice(0, 30)}`);

      // Deactivate
      await chip.click();
      await page.waitForTimeout(200);
    }

    // Test: clicking the advanced "Filters" button
    const filtersBtn = page.locator('.filter-control-btn').first();
    await filtersBtn.click();
    await page.waitForTimeout(500);

    const panelVisible = await page.locator('.filter-panel-animated').isVisible().catch(() => false);
    console.log(`\n  Advanced filters panel visible: ${panelVisible}`);
    await page.screenshot({ path: 'e2e/screenshots/audit-filters-panel.png', fullPage: false });

    if (panelVisible) {
      // Close it
      const closeBtn = page.locator('.filter-panel-animated button[aria-label="Close filters"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });
});
