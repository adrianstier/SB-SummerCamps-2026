/**
 * Re-capture specific camps that need better images.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'camp-heroes');
const WIDTH = 1280;

async function captureGrantHouse(browser) {
  console.log('\n--- Grant House Sewing Camp (scroll to hero image) ---');
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://granthousesewingmachines.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Scroll down past the header/nav to the actual content images
    await page.evaluate(() => window.scrollTo(0, 350));
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'grant-house-sewing-camp.png'),
      clip: { x: 0, y: 0, width: WIDTH, height: 500 },
    });
    console.log('  ✓ Captured (scrolled to content)');
  } catch (err) {
    console.log(`  ✗ Failed: ${err.message}`);
  }
  await ctx.close();
}

async function captureInspireDance(browser) {
  console.log('\n--- Inspire Dance Camps (SSL bypass) ---');
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  try {
    await page.goto('https://inspiredancesb.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'inspire-dance-camps.png'),
      clip: { x: 0, y: 0, width: WIDTH, height: 500 },
    });
    console.log('  ✓ Captured (SSL bypass)');
  } catch (err) {
    console.log(`  ✗ Failed: ${err.message}`);
  }
  await ctx.close();
}

// Also re-capture Elings Park and Adventure Lab with better crops
// (scroll past nav bars to get the image content)
async function recaptureWithScroll(browser, id, name, url, scrollY) {
  console.log(`\n--- ${name} (scroll to y=${scrollY}) ---`);
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    if (scrollY > 0) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${id}.png`),
      clip: { x: 0, y: 0, width: WIDTH, height: 500 },
    });
    console.log('  ✓ Captured');
  } catch (err) {
    console.log(`  ✗ Failed: ${err.message}`);
  }
  await ctx.close();
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  await captureGrantHouse(browser);
  await captureInspireDance(browser);
  // Elings Park: scroll past the nav header to get the park image
  await recaptureWithScroll(browser, 'elings-park-theater-camp', 'Elings Park Theater Camp', 'https://elingspark.org', 60);

  await browser.close();
  console.log('\nDone!');
}

main();
