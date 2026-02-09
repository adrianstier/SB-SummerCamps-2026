/**
 * Mobile UX/UI Audit Script
 *
 * Tests the homepage at multiple mobile breakpoints:
 * - 375px (iPhone SE)
 * - 390px (iPhone 14)
 * - 768px (iPad)
 *
 * Captures screenshots and measures interactive element sizes,
 * text readability, horizontal overflow, and sticky element behavior.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'audit', 'mobile');
const BASE_URL = 'http://localhost:5173';

// Device configurations
const DEVICES = [
  { name: 'iphone-se', width: 375, height: 667, scale: 2, label: 'iPhone SE (375px)' },
  { name: 'iphone-14', width: 390, height: 844, scale: 3, label: 'iPhone 14 (390px)' },
  { name: 'ipad', width: 768, height: 1024, scale: 2, label: 'iPad (768px)' },
];

// Minimum touch target size per WCAG 2.5.5 (Enhanced) / Apple HIG
const MIN_TOUCH_TARGET = 44;
// Minimum readable text size on mobile
const MIN_TEXT_SIZE = 14;

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function waitForPageReady(page) {
  // Wait for camps to load (the grid should have camp cards)
  try {
    await page.waitForSelector('.camp-card, .skeleton-card', { timeout: 15000 });
    // If we see skeleton cards, wait for real ones
    const hasSkeleton = await page.$('.skeleton-card');
    if (hasSkeleton) {
      await page.waitForSelector('.camp-card', { timeout: 20000 });
    }
    // Extra settle time for animations
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('  Warning: Could not find camp cards, proceeding anyway');
    await page.waitForTimeout(3000);
  }
}

async function captureScreenshots(page, device) {
  const prefix = `${device.name}`;
  console.log(`\n=== Capturing screenshots for ${device.label} ===`);

  // 1. Full page screenshot
  console.log('  1. Full page screenshot...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${prefix}-full-page.png`),
    fullPage: true,
  });

  // 2. Hero section (top viewport)
  console.log('  2. Hero section...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${prefix}-hero.png`),
  });

  // 3. Filter bar (scroll to it and screenshot)
  console.log('  3. Filter bar...');
  const filterBar = await page.$('.filter-bar-section, .filter-bar-inner, .filter-presets');
  if (filterBar) {
    await filterBar.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-filter-bar.png`),
    });

    // Also capture just the filter bar element
    try {
      const filterSection = await page.$('.filter-bar-section');
      if (filterSection) {
        await filterSection.screenshot({
          path: path.join(OUTPUT_DIR, `${prefix}-filter-bar-element.png`),
        });
      }
    } catch (e) {
      console.log('    Could not capture filter bar element screenshot');
    }
  } else {
    console.log('    Filter bar not found');
  }

  // 4. Camp cards (first 2-3 cards)
  console.log('  4. Camp cards...');
  const campCards = await page.$$('.camp-card');
  if (campCards.length > 0) {
    // Scroll to first card
    await campCards[0].scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-camp-cards.png`),
    });

    // Individual card screenshot
    try {
      await campCards[0].screenshot({
        path: path.join(OUTPUT_DIR, `${prefix}-camp-card-single.png`),
      });
    } catch (e) {
      console.log('    Could not capture single card screenshot');
    }

    // Second card if exists
    if (campCards.length > 1) {
      try {
        await campCards[1].screenshot({
          path: path.join(OUTPUT_DIR, `${prefix}-camp-card-second.png`),
        });
      } catch (e) {
        console.log('    Could not capture second card screenshot');
      }
    }
  } else {
    console.log('    No camp cards found');
  }

  // 5. Bottom navigation bar
  console.log('  5. Bottom navigation bar...');
  const mobileNav = await page.$('.mobile-nav, nav[aria-label="Main navigation"]');
  if (mobileNav) {
    // Scroll up to make nav visible (it auto-hides on scroll down)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    try {
      await mobileNav.screenshot({
        path: path.join(OUTPUT_DIR, `${prefix}-bottom-nav.png`),
      });
    } catch (e) {
      console.log('    Could not capture bottom nav screenshot');
    }
    // Full viewport with nav visible
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-bottom-nav-viewport.png`),
    });
  } else {
    console.log('    Mobile nav not found');
  }

  // 6. Filter bar horizontal scroll
  console.log('  6. Filter bar horizontal scroll...');
  const filterChips = await page.$('.filter-presets');
  if (filterChips) {
    await filterChips.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // Screenshot before scroll
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-filter-chips-start.png`),
    });
    // Scroll the chips container to the right
    await page.evaluate(() => {
      const container = document.querySelector('.filter-presets');
      if (container) {
        container.scrollLeft = container.scrollWidth;
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-filter-chips-scrolled.png`),
    });
  }

  // 7. Camp card tapped/hover state
  console.log('  7. Camp card interaction state...');
  if (campCards.length > 0) {
    await campCards[0].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // Click to expand/tap the card
    try {
      const cardButton = await campCards[0].$('.camp-card-button');
      if (cardButton) {
        await cardButton.click();
        await page.waitForTimeout(800);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${prefix}-camp-card-tapped.png`),
        });
        // Screenshot the expanded card
        try {
          await campCards[0].screenshot({
            path: path.join(OUTPUT_DIR, `${prefix}-camp-card-expanded.png`),
          });
        } catch (e) {
          console.log('    Could not capture expanded card element screenshot');
        }
        // Click again to collapse
        await cardButton.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('    Could not interact with camp card:', e.message);
    }
  }

  // 8. Scroll 500px down - verify sticky elements
  console.log('  8. Sticky elements after scroll...');
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${prefix}-scrolled-500px.png`),
  });

  // 9. Category browse grid
  console.log('  9. Category browse grid...');
  const categoryGrid = await page.$('.category-browse');
  if (categoryGrid) {
    await categoryGrid.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-category-grid.png`),
    });
    try {
      await categoryGrid.screenshot({
        path: path.join(OUTPUT_DIR, `${prefix}-category-grid-element.png`),
      });
    } catch (e) {
      console.log('    Could not capture category grid element');
    }
  }

  // 10. Footer
  console.log('  10. Footer...');
  const footer = await page.$('.site-footer');
  if (footer) {
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${prefix}-footer.png`),
    });
  }
}

async function measureTouchTargets(page, device) {
  console.log(`\n--- Measuring touch targets for ${device.label} ---`);

  const results = await page.evaluate((minSize) => {
    const interactive = document.querySelectorAll(
      'button, a, input, select, [role="button"], [tabindex="0"], .filter-preset-link, .category-browse-card, .mobile-nav-tab'
    );

    const issues = [];
    const measurements = [];

    interactive.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);

      // Skip hidden/invisible elements
      if (rect.width === 0 || rect.height === 0) return;
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return;
      if (computedStyle.opacity === '0') return;

      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().substring(0, 50);
      const ariaLabel = el.getAttribute('aria-label') || '';
      const className = (el.className || '').toString().substring(0, 80);

      const entry = {
        tag,
        text: text || ariaLabel || className,
        width,
        height,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        className: className,
      };

      measurements.push(entry);

      if (width < minSize || height < minSize) {
        issues.push({
          ...entry,
          issue: `Touch target too small: ${width}x${height}px (min ${minSize}x${minSize}px)`,
        });
      }
    });

    return { issues, total: measurements.length, measurements };
  }, MIN_TOUCH_TARGET);

  console.log(`  Total interactive elements: ${results.total}`);
  console.log(`  Touch target issues: ${results.issues.length}`);
  results.issues.forEach((issue) => {
    console.log(`    - ${issue.tag} "${issue.text}" at (${issue.left},${issue.top}): ${issue.width}x${issue.height}px`);
  });

  return results;
}

async function measureTextReadability(page, device) {
  console.log(`\n--- Measuring text readability for ${device.label} ---`);

  const results = await page.evaluate((minFontSize) => {
    const allText = document.querySelectorAll(
      'p, span, h1, h2, h3, h4, h5, h6, a, button, label, td, th, li, dt, dd, .filter-preset-link, .camp-quick-info-value, .camp-quick-info-label'
    );

    const issues = [];
    const measurements = [];

    allText.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);

      if (rect.width === 0 || rect.height === 0) return;
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return;

      const fontSize = parseFloat(computedStyle.fontSize);
      const text = (el.textContent || '').trim().substring(0, 60);
      const tag = el.tagName.toLowerCase();
      const className = (el.className || '').toString().substring(0, 60);

      if (!text) return;

      const entry = {
        tag,
        text,
        fontSize: Math.round(fontSize * 10) / 10,
        lineHeight: computedStyle.lineHeight,
        fontWeight: computedStyle.fontWeight,
        color: computedStyle.color,
        className,
        top: Math.round(rect.top),
      };

      measurements.push(entry);

      if (fontSize < minFontSize) {
        issues.push({
          ...entry,
          issue: `Text too small: ${fontSize}px (min ${minFontSize}px)`,
        });
      }
    });

    return { issues, total: measurements.length, measurements };
  }, MIN_TEXT_SIZE);

  console.log(`  Total text elements: ${results.total}`);
  console.log(`  Text size issues: ${results.issues.length}`);
  // Show unique font sizes that are too small
  const uniqueSizes = [...new Set(results.issues.map(i => i.fontSize))].sort((a, b) => a - b);
  uniqueSizes.forEach(size => {
    const count = results.issues.filter(i => i.fontSize === size).length;
    console.log(`    - ${size}px: ${count} elements`);
  });

  return results;
}

async function checkHorizontalOverflow(page, device) {
  console.log(`\n--- Checking horizontal overflow for ${device.label} ---`);

  const results = await page.evaluate((viewportWidth) => {
    const issues = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);

      if (rect.width === 0) return;
      if (computedStyle.display === 'none') return;

      // Check if element extends beyond viewport
      if (rect.right > viewportWidth + 2) { // 2px tolerance
        const tag = el.tagName.toLowerCase();
        const className = (el.className || '').toString().substring(0, 80);
        const text = (el.textContent || '').trim().substring(0, 40);
        issues.push({
          tag,
          className,
          text,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          overflow: Math.round(rect.right - viewportWidth),
        });
      }
    });

    // Also check document scroll width
    const docScrollWidth = document.documentElement.scrollWidth;
    const hasHorizontalScroll = docScrollWidth > viewportWidth;

    return {
      issues: issues.slice(0, 30), // Limit to avoid huge output
      hasHorizontalScroll,
      documentScrollWidth: docScrollWidth,
      viewportWidth,
    };
  }, device.width);

  console.log(`  Document scroll width: ${results.documentScrollWidth}px (viewport: ${results.viewportWidth}px)`);
  console.log(`  Has horizontal scroll: ${results.hasHorizontalScroll}`);
  console.log(`  Overflow issues: ${results.issues.length}`);
  results.issues.slice(0, 10).forEach((issue) => {
    console.log(`    - <${issue.tag}> class="${issue.className}" overflows by ${issue.overflow}px`);
  });

  return results;
}

async function measureSpacing(page, device) {
  console.log(`\n--- Measuring element spacing for ${device.label} ---`);

  const results = await page.evaluate(() => {
    const measurements = {};

    // Measure filter chips spacing
    const chips = document.querySelectorAll('.filter-preset-link');
    if (chips.length > 1) {
      const chipSpacing = [];
      for (let i = 1; i < chips.length; i++) {
        const prev = chips[i - 1].getBoundingClientRect();
        const curr = chips[i].getBoundingClientRect();
        chipSpacing.push(Math.round(curr.left - prev.right));
      }
      measurements.filterChipSpacing = chipSpacing;
      measurements.filterChipSizes = Array.from(chips).map(c => {
        const r = c.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      });
    }

    // Measure camp card grid gap
    const cards = document.querySelectorAll('.camp-card');
    if (cards.length > 1) {
      const card1 = cards[0].getBoundingClientRect();
      const card2 = cards[1].getBoundingClientRect();
      measurements.campCardGap = Math.round(card2.top - card1.bottom);
      measurements.campCardWidth = Math.round(card1.width);
      measurements.campCardPadding = {
        left: Math.round(card1.left),
        right: Math.round(window.innerWidth - card1.right),
      };
    }

    // Measure mobile nav tabs
    const navTabs = document.querySelectorAll('.mobile-nav-tab');
    if (navTabs.length > 0) {
      measurements.navTabSizes = Array.from(navTabs).map(t => {
        const r = t.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      });
      const navLabels = document.querySelectorAll('.mobile-nav-label');
      measurements.navLabelSizes = Array.from(navLabels).map(l => {
        const style = window.getComputedStyle(l);
        return { fontSize: parseFloat(style.fontSize), text: l.textContent };
      });
    }

    // Measure hero section
    const hero = document.querySelector('.hero-section');
    if (hero) {
      const r = hero.getBoundingClientRect();
      measurements.heroHeight = Math.round(r.height);
    }

    // Measure hero title
    const heroTitle = document.querySelector('.hero-section h1');
    if (heroTitle) {
      const style = window.getComputedStyle(heroTitle);
      measurements.heroTitleFontSize = parseFloat(style.fontSize);
    }

    // Measure search input
    const searchInput = document.querySelector('.search-input, .hero-search input');
    if (searchInput) {
      const r = searchInput.getBoundingClientRect();
      const style = window.getComputedStyle(searchInput);
      measurements.searchInput = {
        width: Math.round(r.width),
        height: Math.round(r.height),
        fontSize: parseFloat(style.fontSize),
        padding: style.padding,
      };
    }

    // Measure category browse cards
    const catCards = document.querySelectorAll('.category-browse-card');
    if (catCards.length > 0) {
      measurements.categoryCardSizes = Array.from(catCards).slice(0, 6).map(c => {
        const r = c.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      });
    }

    // Check filter bar stickiness
    const filterBarSection = document.querySelector('.filter-bar-section');
    if (filterBarSection) {
      const style = window.getComputedStyle(filterBarSection);
      measurements.filterBarPosition = style.position;
      measurements.filterBarTop = style.top;
    }

    return measurements;
  });

  console.log('  Measurements:', JSON.stringify(results, null, 2));
  return results;
}

async function runAudit() {
  await ensureDir(OUTPUT_DIR);

  console.log('Starting Mobile UX Audit...');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const allResults = {};

  for (const device of DEVICES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Device: ${device.label}`);
    console.log(`${'='.repeat(60)}`);

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      isMobile: device.width < 768,
      hasTouch: device.width < 768,
      userAgent: device.width < 768
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    const page = await context.newPage();

    // Navigate and wait for page to load
    console.log('  Loading page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPageReady(page);

    // Capture all screenshots
    await captureScreenshots(page, device);

    // Run measurements
    const touchTargets = await measureTouchTargets(page, device);
    const textReadability = await measureTextReadability(page, device);
    const horizontalOverflow = await checkHorizontalOverflow(page, device);
    const spacing = await measureSpacing(page, device);

    allResults[device.name] = {
      device,
      touchTargets,
      textReadability,
      horizontalOverflow,
      spacing,
    };

    await context.close();
  }

  // Save raw results as JSON for reference
  const resultsPath = path.join(OUTPUT_DIR, 'audit-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`\nRaw results saved to: ${resultsPath}`);

  await browser.close();
  console.log('\nAudit complete!');
  return allResults;
}

runAudit().catch(console.error);
