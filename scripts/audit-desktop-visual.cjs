/**
 * Desktop Visual UX Audit Script
 * Captures full-page and section-specific screenshots at multiple breakpoints
 * for systematic visual review.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'audit', 'desktop');
const BASE_URL = 'http://localhost:5173';

const BREAKPOINTS = [
  { name: '1400', width: 1400, height: 800 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 800 },
];

async function waitForAppReady(page) {
  // Wait for React to mount and camps to load
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Wait for any camp cards or main content to appear
  await page.waitForTimeout(3000);
  // Try waiting for camp cards specifically
  try {
    await page.waitForSelector('[class*="camp"], [class*="card"], [data-testid*="camp"]', { timeout: 8000 });
  } catch (e) {
    console.log('  Warning: Could not find camp card elements, continuing...');
  }
  // Extra settle time for images and animations
  await page.waitForTimeout(2000);
}

async function captureSection(page, name, breakpointName, options = {}) {
  const filename = `${breakpointName}-${name}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  if (options.fullPage) {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  Captured: ${filename} (full page)`);
    return;
  }

  if (options.clip) {
    await page.screenshot({ path: filepath, clip: options.clip });
    console.log(`  Captured: ${filename} (clip: ${JSON.stringify(options.clip)})`);
    return;
  }

  if (options.selector) {
    try {
      const el = page.locator(options.selector).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.screenshot({ path: filepath });
      console.log(`  Captured: ${filename} (selector: ${options.selector})`);
      return;
    } catch (e) {
      console.log(`  Warning: Selector "${options.selector}" not found for ${name}, using clip fallback`);
      if (options.fallbackClip) {
        await page.screenshot({ path: filepath, clip: options.fallbackClip });
        console.log(`  Captured: ${filename} (fallback clip)`);
        return;
      }
    }
  }

  if (options.scrollTo !== undefined) {
    await page.evaluate((y) => window.scrollTo(0, y), options.scrollTo);
    await page.waitForTimeout(500);
    await page.screenshot({ path: filepath });
    console.log(`  Captured: ${filename} (scrolled to ${options.scrollTo})`);
    return;
  }
}

async function auditBreakpoint(browser, bp) {
  console.log(`\n=== Auditing at ${bp.width}x${bp.height} (${bp.name}) ===`);

  const context = await browser.newContext({
    viewport: { width: bp.width, height: bp.height },
    deviceScaleFactor: 2, // Retina for detail
  });
  const page = await context.newPage();

  // Navigate and wait for full load
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitForAppReady(page);

  // 1. Full page screenshot
  await captureSection(page, '01-full-page', bp.name, { fullPage: true });

  // 2. Hero section (top 600px of viewport)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await captureSection(page, '02-hero-section', bp.name, {
    clip: { x: 0, y: 0, width: bp.width, height: 600 }
  });

  // 3. Filter bar area - scroll past hero to expose filters
  // First, try to find the filter bar element
  const filterBarInfo = await page.evaluate(() => {
    const selectors = [
      '[class*="filter-bar"]',
      '[class*="FilterBar"]',
      '[class*="filter"]',
      'nav',
      '[role="toolbar"]',
      '[class*="filters"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollY = window.scrollY;
        return {
          selector: sel,
          top: rect.top + scrollY,
          height: rect.height,
          found: true
        };
      }
    }
    return { found: false };
  });

  if (filterBarInfo.found) {
    const scrollTarget = Math.max(0, filterBarInfo.top - 50);
    await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
    await page.waitForTimeout(500);
    await captureSection(page, '03-filter-bar', bp.name, {
      clip: { x: 0, y: 0, width: bp.width, height: Math.min(400, filterBarInfo.height + 100) }
    });
  } else {
    // Fallback: scroll to approx 500px and capture
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await captureSection(page, '03-filter-bar', bp.name, {
      clip: { x: 0, y: 0, width: bp.width, height: 400 }
    });
  }

  // 4. Camp card grid - find the first row of camp cards
  const cardGridInfo = await page.evaluate(() => {
    const selectors = [
      '[class*="camp-grid"]',
      '[class*="CampGrid"]',
      '[class*="grid"]',
      '[class*="camp-card"]',
      '[class*="CampCard"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollY = window.scrollY;
        return {
          selector: sel,
          top: rect.top + scrollY,
          height: rect.height,
          found: true
        };
      }
    }
    // Try finding any card-like element
    const cards = document.querySelectorAll('[class*="card"]');
    if (cards.length > 0) {
      const rect = cards[0].getBoundingClientRect();
      const scrollY = window.scrollY;
      return {
        selector: 'first card',
        top: rect.top + scrollY,
        height: 600,
        found: true
      };
    }
    return { found: false };
  });

  if (cardGridInfo.found) {
    const scrollTarget = Math.max(0, cardGridInfo.top - 30);
    await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
    await page.waitForTimeout(500);
    await captureSection(page, '04-camp-cards', bp.name, {
      clip: { x: 0, y: 0, width: bp.width, height: 700 }
    });
  } else {
    // Fallback: scroll to approximate card area
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(500);
    await captureSection(page, '04-camp-cards', bp.name, {
      clip: { x: 0, y: 0, width: bp.width, height: 700 }
    });
  }

  // Also capture a second row of cards (scroll further)
  if (cardGridInfo.found) {
    const scrollTarget = Math.max(0, cardGridInfo.top + 600);
    await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
    await page.waitForTimeout(500);
    await captureSection(page, '04b-camp-cards-row2', bp.name, {
      clip: { x: 0, y: 0, width: bp.width, height: 700 }
    });
  }

  // 5. Footer area - scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const footerClipY = Math.max(0, pageHeight - bp.height);
  await captureSection(page, '05-footer', bp.name, {
    clip: { x: 0, y: 0, width: bp.width, height: bp.height }
  });

  // 6. Bonus: capture the area just below hero (transition zone)
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  await captureSection(page, '06-hero-to-content-transition', bp.name, {
    clip: { x: 0, y: 0, width: bp.width, height: 600 }
  });

  // 7. Bonus: capture with filter interaction if possible
  try {
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters"), [class*="filter"] button').first();
    if (await filterButton.isVisible({ timeout: 2000 })) {
      await filterButton.click();
      await page.waitForTimeout(800);
      await captureSection(page, '07-filters-expanded', bp.name, {
        clip: { x: 0, y: 0, width: bp.width, height: bp.height }
      });
    }
  } catch (e) {
    console.log(`  Skipped: filters-expanded (no filter button found)`);
  }

  // Gather page metrics
  const metrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return {
      pageHeight: Math.max(body.scrollHeight, html.scrollHeight),
      pageWidth: Math.max(body.scrollWidth, html.scrollWidth),
      viewportWidth: window.innerWidth,
      hasHorizontalScroll: body.scrollWidth > window.innerWidth,
      computedFontSize: getComputedStyle(body).fontSize,
      elementsCount: document.querySelectorAll('*').length,
    };
  });
  console.log(`  Page metrics:`, JSON.stringify(metrics, null, 2));

  await context.close();
  return metrics;
}

(async () => {
  console.log('Desktop Visual UX Audit');
  console.log('=======================');
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const allMetrics = {};
  for (const bp of BREAKPOINTS) {
    allMetrics[bp.name] = await auditBreakpoint(browser, bp);
  }

  // Save metrics
  const metricsPath = path.join(OUTPUT_DIR, 'metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(allMetrics, null, 2));
  console.log(`\nMetrics saved to ${metricsPath}`);

  await browser.close();
  console.log('\nAudit complete! Screenshots saved to:', OUTPUT_DIR);
})();
