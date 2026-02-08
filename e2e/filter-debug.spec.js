import { test, expect } from '@playwright/test';

test.describe('Quick Filter Buttons - Debug Inspection', () => {
  test('inspect filter chip layout and overlap', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for filter presets to render (the ACTUAL chips in App.jsx)
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    // Get the container bounding box
    const container = await page.locator('.filter-presets').boundingBox();
    console.log('=== FILTER PRESETS CONTAINER ===');
    console.log(JSON.stringify(container, null, 2));

    // Get all preset link elements and their bounding boxes
    const chips = page.locator('.filter-preset-link');
    const chipCount = await chips.count();
    console.log(`\nTotal filter preset chips: ${chipCount}`);

    const boxes = [];
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const box = await chip.boundingBox();
      const text = await chip.textContent();
      const classes = await chip.getAttribute('class');
      const computedStyle = await chip.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          position: style.position,
          overflow: style.overflow,
          zIndex: style.zIndex,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          flexShrink: style.flexShrink,
          whiteSpace: style.whiteSpace,
          width: style.width,
          height: style.height,
          minHeight: style.minHeight,
          fontWeight: style.fontWeight,
          fontSize: style.fontSize,
        };
      });

      boxes.push({ index: i, text: text.trim(), box, classes });
      console.log(`\n--- Chip ${i}: "${text.trim()}" ---`);
      console.log(`  Box: ${JSON.stringify(box)}`);
      console.log(`  Classes: ${classes}`);
      console.log(`  Computed: ${JSON.stringify(computedStyle)}`);
    }

    // Check for overlaps between chips
    console.log('\n=== OVERLAP CHECK ===');
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].box;
        const b = boxes[j].box;
        if (!a || !b) continue;

        const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

        if (overlapX > 0 && overlapY > 0) {
          console.log(`OVERLAP: "${boxes[i].text}" and "${boxes[j].text}" overlap by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`);
        }
      }
    }

    // Check if chips extend beyond container
    console.log('\n=== OVERFLOW CHECK ===');
    for (const b of boxes) {
      if (!b.box || !container) continue;
      if (b.box.x + b.box.width > container.x + container.width) {
        console.log(`OVERFLOW: "${b.text}" extends ${(b.box.x + b.box.width - container.x - container.width).toFixed(1)}px beyond container right edge`);
      }
    }

    // Check container computed styles
    const containerStyle = await page.locator('.filter-presets').evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        flexWrap: style.flexWrap,
        gap: style.gap,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        width: style.width,
        height: style.height,
        padding: style.padding,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        isOverflowing: el.scrollWidth > el.clientWidth,
        position: style.position,
        maskImage: style.maskImage || style.webkitMaskImage || 'none',
      };
    });
    console.log('\n=== CONTAINER COMPUTED STYLE ===');
    console.log(JSON.stringify(containerStyle, null, 2));

    // Check the filter-bar-inner parent
    const innerStyle = await page.locator('.filter-bar-inner').evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        flexDirection: style.flexDirection,
        alignItems: style.alignItems,
        gap: style.gap,
        width: style.width,
        height: style.height,
      };
    });
    console.log('\n=== FILTER BAR INNER STYLE ===');
    console.log(JSON.stringify(innerStyle, null, 2));

    // Check the filter-controls
    const controlsStyle = await page.locator('.filter-controls').evaluate(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        display: style.display,
        flexShrink: style.flexShrink,
        gap: style.gap,
        width: style.width,
        rect: rect.toJSON(),
      };
    });
    console.log('\n=== FILTER CONTROLS STYLE ===');
    console.log(JSON.stringify(controlsStyle, null, 2));

    // Screenshot at different viewports
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/filter-chips-mobile.png', fullPage: false });

    const mobileContainer = await page.locator('.filter-presets').evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isOverflowing: el.scrollWidth > el.clientWidth,
      flexWrap: window.getComputedStyle(el).flexWrap,
      overflowX: window.getComputedStyle(el).overflowX,
    }));
    console.log('\n=== MOBILE (375px) ===');
    console.log(JSON.stringify(mobileContainer, null, 2));

    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/filter-chips-desktop.png', fullPage: false });

    const desktopContainer = await page.locator('.filter-presets').evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      isOverflowing: el.scrollWidth > el.clientWidth,
      flexWrap: window.getComputedStyle(el).flexWrap,
      overflowX: window.getComputedStyle(el).overflowX,
    }));
    console.log('\n=== DESKTOP (1280px) ===');
    console.log(JSON.stringify(desktopContainer, null, 2));
  });

  test('test filter chip click interaction', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.filter-presets', { timeout: 10000 });

    // Test each filter preset button click
    const chips = page.locator('.filter-preset-link');
    const chipCount = await chips.count();

    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const text = await chip.textContent();
      const classesBefore = await chip.getAttribute('class');
      const isActiveBefore = classesBefore.includes('active');

      console.log(`\nClicking: "${text.trim()}" (was active: ${isActiveBefore})`);

      // Click and check response
      await chip.click();
      await page.waitForTimeout(300);

      const classesAfter = await chip.getAttribute('class');
      const isActiveAfter = classesAfter.includes('active');

      console.log(`  Active after click: ${isActiveAfter}`);
      console.log(`  Toggled correctly: ${isActiveBefore !== isActiveAfter}`);

      // Check if URL changed (filter should update search params)
      const url = page.url();
      console.log(`  URL: ${url}`);

      // Check if camp grid updated
      const campCards = page.locator('.camp-card, [class*="camp-card"]');
      const cardCount = await campCards.count();
      console.log(`  Visible camps: ${cardCount}`);

      // Click again to deactivate
      await chip.click();
      await page.waitForTimeout(300);

      const classesReset = await chip.getAttribute('class');
      const isActiveReset = classesReset.includes('active');
      console.log(`  After toggle off: active=${isActiveReset}`);
    }
  });
});
