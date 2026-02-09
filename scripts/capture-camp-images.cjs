/**
 * Capture hero images for camps that don't have one.
 * Uses Playwright to screenshot each camp's website and crop to card aspect ratio.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CAMPS = [
  { id: 'adventure-lab-crane', name: 'Adventure Lab @ Crane', url: 'https://craneschool.org', category: 'Multi-Activity' },
  { id: 'cliff-drive-care-center-summer-camp', name: 'Cliff Drive Care Center Summer Camp', url: 'https://cliffdrivecarecenter.org', category: 'Multi-Activity' },
  { id: 'code-next-connect-google-', name: 'Code Next Connect (Google)', url: 'https://codenext.withgoogle.com', category: 'STEM/Tech' },
  { id: 'elings-park-theater-camp', name: 'Elings Park Theater Camp', url: 'https://elingspark.org', category: 'Theater' },
  { id: 'grant-house-sewing-camp', name: 'Grant House Sewing Camp', url: 'https://granthousesewingmachines.com', category: 'Art/Crafts' },
  { id: 'gustafson-dance-camps', name: 'Gustafson Dance Camps', url: 'https://ssb-academy.com', category: 'Dance' },
  { id: 'inspire-dance-camps', name: 'Inspire Dance Camps', url: 'https://inspiredancesb.com', category: 'Dance' },
];

// Card image aspect ratio: roughly 16:10 (400x250 in the card)
const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 800;
const CROP_HEIGHT = 500; // Top portion of the page

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'camp-heroes');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  for (const camp of CAMPS) {
    console.log(`\n--- ${camp.name} (${camp.url}) ---`);
    const context = await browser.newContext({
      viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      await page.goto(camp.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Let images and hero sections load
      await page.waitForTimeout(3000);

      // Dismiss common cookie/popup overlays
      for (const sel of ['[aria-label="Close"]', '.cookie-close', '#cookie-accept', 'button:has-text("Accept")', 'button:has-text("Got it")']) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
          await el.click().catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      // Take a cropped screenshot of just the top hero area
      const outPath = path.join(OUTPUT_DIR, `${camp.id}.png`);
      await page.screenshot({
        path: outPath,
        clip: { x: 0, y: 0, width: CAPTURE_WIDTH, height: CROP_HEIGHT },
      });

      console.log(`  ✓ Saved ${outPath}`);
      results.push({ id: camp.id, name: camp.name, status: 'captured', path: outPath });
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
      results.push({ id: camp.id, name: camp.name, status: 'failed', error: err.message });
    }

    await context.close();
  }

  await browser.close();

  console.log('\n=== Results ===');
  for (const r of results) {
    console.log(`${r.status === 'captured' ? '✓' : '✗'} ${r.name}: ${r.status}`);
  }
}

main();
