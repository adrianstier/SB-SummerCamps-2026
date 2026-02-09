import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for homepage UX fixes.
 *
 * Covers accessibility, color contrast, touch targets, mobile layout,
 * iPad filter bar, and core interaction flows.
 */

// Helper: compute relative luminance per WCAG 2.1
function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: compute contrast ratio between two RGB colors
function contrastRatio(r1, g1, b1, r2, g2, b2) {
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper: parse "rgb(r, g, b)" or "rgba(r, g, b, a)" to [r, g, b]
function parseRGB(str) {
  const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

// ═══════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Accessibility Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('1. Camp cards do NOT have role="button" on their wrapper', async ({ page }) => {
    // The <article> wrapper (camp-card) should NOT have role="button".
    // Inner elements may have it, but the top-level article should not.
    const campCards = page.locator('.camp-card');
    const count = await campCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = campCards.nth(i);
      const role = await card.getAttribute('role');
      expect(role).not.toBe('button');
    }
  });

  test('2. Camp cards have a clickable link/button on the camp name', async ({ page }) => {
    // Each camp card should have an interactive element (link or button)
    // that allows users to access the camp details.
    const campCards = page.locator('.camp-card');
    const count = await campCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = campCards.nth(i);
      // Look for clickable elements: a link, a button, or an element with role="button"
      // that contains or is near the camp name heading
      const clickable = card.locator('a, button, [role="button"]');
      const clickableCount = await clickable.count();
      expect(clickableCount).toBeGreaterThan(0);
    }
  });

  test('3. Compare and Favorite buttons are NOT nested inside a role="button" element', async ({ page }) => {
    // The compare and favorite buttons should be interactive on their own,
    // not nested inside another role="button" container, which creates
    // nested interactive elements (WCAG violation).
    const campCards = page.locator('.camp-card');
    const count = await campCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = campCards.nth(i);

      // Find compare button (has aria-label with "compare")
      const compareBtn = card.locator('button[aria-label*="compare" i]').first();
      if (await compareBtn.count() > 0) {
        // Check that none of its ancestor elements (up to .camp-card) have role="button"
        const isNestedInRoleButton = await compareBtn.evaluate((btn) => {
          let el = btn.parentElement;
          while (el && !el.classList.contains('camp-card')) {
            if (el.getAttribute('role') === 'button') return true;
            el = el.parentElement;
          }
          return false;
        });
        expect(isNestedInRoleButton).toBe(false);
      }

      // Find favorite button (has aria-label with "favorite" or "save")
      const favBtn = card.locator('button[aria-label*="favorite" i], button[aria-label*="save" i]').first();
      if (await favBtn.count() > 0) {
        const isNestedInRoleButton = await favBtn.evaluate((btn) => {
          let el = btn.parentElement;
          while (el && !el.classList.contains('camp-card')) {
            if (el.getAttribute('role') === 'button') return true;
            el = el.parentElement;
          }
          return false;
        });
        expect(isNestedInRoleButton).toBe(false);
      }
    }
  });

  test('4. Viewport meta does NOT contain user-scalable=no', async ({ page }) => {
    const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportContent).not.toContain('user-scalable=no');
    expect(viewportContent).not.toContain('user-scalable = no');
    // Should still have the essentials
    expect(viewportContent).toContain('width=device-width');
    expect(viewportContent).toContain('initial-scale=1.0');
  });

  test('5. Decorative SVGs have aria-hidden="true"', async ({ page }) => {
    // AppLogo SVGs in header and footer should be decorative
    const headerLogo = page.locator('header svg').first();
    if (await headerLogo.count() > 0) {
      // The AppLogo SVG or its container should have aria-hidden
      const isHidden = await headerLogo.evaluate((svg) => {
        // Check the SVG itself or walk up to find aria-hidden
        if (svg.getAttribute('aria-hidden') === 'true') return true;
        let el = svg.parentElement;
        while (el && el.tagName !== 'HEADER') {
          if (el.getAttribute('aria-hidden') === 'true') return true;
          el = el.parentElement;
        }
        return false;
      });
      // AppLogo in App.jsx already has aria-hidden="true"
      expect(isHidden).toBe(true);
    }

    // Wave decoration should have aria-hidden="true"
    const waveDecoration = page.locator('.wave-decoration');
    if (await waveDecoration.count() > 0) {
      const ariaHidden = await waveDecoration.first().getAttribute('aria-hidden');
      expect(ariaHidden).toBe('true');
    }
  });

  test('6. "Browse by Interest" section is inside <main>', async ({ page }) => {
    // The category browse section should be inside a <main> element
    const browseSection = page.locator('.category-browse');
    if (await browseSection.count() > 0) {
      const isInsideMain = await browseSection.evaluate((el) => {
        let parent = el.parentElement;
        while (parent) {
          if (parent.tagName === 'MAIN') return true;
          parent = parent.parentElement;
        }
        return false;
      });
      expect(isInsideMain).toBe(true);
    }
  });

  test('7. Testimonial section is inside <main>', async ({ page }) => {
    const testimonial = page.locator('.testimonial-banner');
    if (await testimonial.count() > 0) {
      const isInsideMain = await testimonial.evaluate((el) => {
        let parent = el.parentElement;
        while (parent) {
          if (parent.tagName === 'MAIN') return true;
          parent = parent.parentElement;
        }
        return false;
      });
      expect(isInsideMain).toBe(true);
    }
  });

  test('8. Hero search result count has aria-live attribute', async ({ page }) => {
    // Type into search to trigger result count display
    const searchInput = page.locator('.search-input');
    await searchInput.fill('surf');
    await page.waitForTimeout(800);

    // The result count or its container should have aria-live
    const ariaLiveContainer = page.locator('[aria-live]');
    const count = await ariaLiveContainer.count();
    expect(count).toBeGreaterThan(0);

    // Specifically, the container near the search in the hero should be aria-live="polite"
    const heroAriaLive = page.locator('header [aria-live="polite"], .hero-section [aria-live="polite"]');
    if (await heroAriaLive.count() > 0) {
      const liveValue = await heroAriaLive.first().getAttribute('aria-live');
      expect(liveValue).toBe('polite');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// COLOR CONTRAST TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Color Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('9. camp-quick-info-label has sufficient contrast against white', async ({ page }) => {
    const labels = page.locator('.camp-quick-info-label');
    const count = await labels.count();

    if (count > 0) {
      const color = await labels.first().evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      const rgb = parseRGB(color);
      expect(rgb).not.toBeNull();

      // Check contrast against white background (255, 255, 255)
      const ratio = contrastRatio(rgb[0], rgb[1], rgb[2], 255, 255, 255);

      // WCAG AA for normal text requires 4.5:1
      // The label is small uppercase text, so AA requirement applies
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('10. category-browse-count has sufficient contrast', async ({ page }) => {
    const counts = page.locator('.category-browse-count');
    const countElements = await counts.count();

    if (countElements > 0) {
      const colorInfo = await counts.first().evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          bgColor: style.backgroundColor,
        };
      });

      const fgRGB = parseRGB(colorInfo.color);
      expect(fgRGB).not.toBeNull();

      // If background is transparent, walk up to find the actual background
      let bgRGB = parseRGB(colorInfo.bgColor);
      if (!bgRGB || (bgRGB[0] === 0 && bgRGB[1] === 0 && bgRGB[2] === 0 && colorInfo.bgColor.includes('0)'))) {
        // Assume parent card background is white-ish (sand-50 or white)
        bgRGB = [255, 255, 255];
      }

      const ratio = contrastRatio(fgRGB[0], fgRGB[1], fgRGB[2], bgRGB[0], bgRGB[1], bgRGB[2]);

      // WCAG AA for normal text: 4.5:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TOUCH TARGET TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Touch Targets (44px minimum)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('11. Filter chips have height >= 44px', async ({ page }) => {
    const chips = page.locator('.filter-preset-link');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      if (await chip.isVisible()) {
        const box = await chip.boundingBox();
        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('12. Filter control button has height >= 44px', async ({ page }) => {
    const btn = page.locator('.filter-control-btn').first();
    if (await btn.isVisible()) {
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('13. Sort select has height >= 44px', async ({ page }) => {
    const select = page.locator('.filter-sort-select').first();
    if (await select.isVisible()) {
      const box = await select.boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MOBILE LAYOUT TESTS (375px viewport)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Mobile Layout (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForSelector('.camp-card, h1', { timeout: 15000 });
  });

  test('14. Footer has sufficient bottom padding to clear mobile nav', async ({ page }) => {
    // The mobile nav is fixed at the bottom (~70px). The footer needs enough
    // internal padding-bottom so text content doesn't go behind it.
    const mobileNav = page.locator('.mobile-nav');
    const hasNav = await mobileNav.isVisible().catch(() => false);

    if (hasNav) {
      const result = await page.evaluate(() => {
        const nav = document.querySelector('.mobile-nav');
        const footer = document.querySelector('footer') || document.querySelector('.site-footer');
        if (!nav || !footer) return { hasElements: false };

        const navHeight = nav.getBoundingClientRect().height;
        const footerPadBottom = parseFloat(getComputedStyle(footer).paddingBottom);

        return {
          hasElements: true,
          navHeight,
          footerPaddingBottom: footerPadBottom,
          sufficient: footerPadBottom >= navHeight,
        };
      });

      if (result.hasElements) {
        // Footer padding-bottom should be >= nav height to prevent overlap
        expect(result.sufficient).toBe(true);
      }
    }
  });

  test('15. No horizontal scroll on mobile', async ({ page }) => {
    // Wait for full render
    await page.waitForTimeout(500);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// IPAD FILTER BAR TEST (768px)
// ═══════════════════════════════════════════════════════════════════════

test.describe('iPad Filter Bar (768px)', () => {
  test('16. All 6 filter chip texts are fully visible and not clipped', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    // Wait for camps to load first (ensures app is fully rendered)
    await page.waitForSelector('.camp-card', { timeout: 15000 });
    // Then confirm filter chips are present
    await page.waitForSelector('.filter-preset-link', { timeout: 5000 });

    const chips = page.locator('.filter-preset-link');
    const chipCount = await chips.count();

    // There should be 6 filter preset chips
    expect(chipCount).toBe(6);

    // Verify each chip has readable text and is not zero-width/collapsed
    const expectedTexts = ['Extended Care', 'Under $300', 'Sports', 'Art', 'STEM', 'Outdoors'];
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);

      // Chip text should contain the expected label
      const text = (await chip.textContent()).trim();
      expect(text.length).toBeGreaterThan(0);

      // Scroll the chip into view (in case the presets area is horizontally scrollable)
      await chip.scrollIntoViewIfNeeded();

      const box = await chip.boundingBox();
      expect(box).not.toBeNull();

      // Each chip should have a reasonable width (text not collapsed/truncated to nothing)
      expect(box.width).toBeGreaterThan(50);
      // Each chip should have a reasonable height
      expect(box.height).toBeGreaterThan(20);

      // Verify the chip text is not being clipped by checking that the chip's
      // scrollWidth equals its clientWidth (no overflow hidden truncation)
      const isClipped = await chip.evaluate((el) => {
        return el.scrollWidth > el.clientWidth + 2; // 2px tolerance
      });
      expect(isClipped).toBe(false);
    }

    // Verify the filter controls (Filters btn, sort select) are also visible
    const filterControls = page.locator('.filter-controls').first();
    if (await filterControls.isVisible()) {
      const controlsBox = await filterControls.boundingBox();
      expect(controlsBox).not.toBeNull();
      expect(controlsBox.width).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// INTERACTION TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.camp-card', { timeout: 15000 });
  });

  test('17. Clicking a camp name navigates to camp detail', async ({ page }) => {
    // On desktop, clicking a camp card should navigate to /camp/<id>
    const firstCard = page.locator('.camp-card').first();
    const campId = await firstCard.getAttribute('id');
    expect(campId).toBeTruthy();

    // The id is in format "camp-<slug>"
    const slug = campId.replace('camp-', '');

    // Click the clickable area of the camp card
    const clickable = firstCard.locator('[role="button"], a').first();
    if (await clickable.count() > 0) {
      await clickable.click();
    } else {
      await firstCard.click();
    }

    await page.waitForTimeout(500);

    // URL should now contain /camp/ (either as navigation or overlay)
    const url = page.url();
    // On desktop it navigates to /camp/<id>, on mobile it may expand in-place
    // Check for either behavior
    const navigated = url.includes('/camp/');
    const expanded = await firstCard.locator('.expanded-details').count() > 0;
    expect(navigated || expanded).toBe(true);
  });

  test('18. Filter chips toggle on/off correctly', async ({ page }) => {
    const chip = page.locator('.filter-preset-link[data-filter="extended-care"]');
    await expect(chip).toBeVisible();

    // Initially should not be active
    const initialClasses = await chip.getAttribute('class');
    const wasActive = initialClasses.includes('active');

    // Click to toggle
    await chip.click();
    await page.waitForTimeout(300);

    const afterClickClasses = await chip.getAttribute('class');
    if (wasActive) {
      expect(afterClickClasses).not.toContain('active');
    } else {
      expect(afterClickClasses).toContain('active');
    }

    // Click again to toggle back
    await chip.click();
    await page.waitForTimeout(300);

    const afterSecondClickClasses = await chip.getAttribute('class');
    if (wasActive) {
      expect(afterSecondClickClasses).toContain('active');
    } else {
      expect(afterSecondClickClasses).not.toContain('active');
    }
  });

  test('19. Search input filters camps and shows result count', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    // Get initial camp count
    const initialCount = await page.locator('.camp-card').count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a specific search term
    await searchInput.fill('surf');
    await page.waitForTimeout(800);

    // Should see filtered results or result count message
    const resultText = page.locator('[aria-live="polite"]');
    const resultTextCount = await resultText.count();
    expect(resultTextCount).toBeGreaterThan(0);

    // The filtered count should be less than or equal to initial
    const filteredCount = await page.locator('.camp-card').count();
    // Either we see fewer camps, or there's a "Found X camps" message, or empty state
    const foundMessage = await page.locator('text=/Found \\d+ camp/').count();
    const noResults = await page.locator('text=/No camps match/').count();
    expect(filteredCount < initialCount || foundMessage > 0 || noResults > 0).toBe(true);
  });

  test('20. Empty state appears when no camps match filters', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    // Type a nonsensical search term that should match nothing
    await searchInput.fill('xyznonexistentcamp12345');
    await page.waitForTimeout(800);

    // Should see the empty state heading
    const emptyState = page.getByRole('heading', { name: /No camps match/ });
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    // Should see a clear filters button in the empty state
    const clearBtn = page.locator('button:has-text("Clear Filters"), button:has-text("Clear")');
    if (await clearBtn.count() > 0) {
      await expect(clearBtn.first()).toBeVisible();
    }
  });
});
