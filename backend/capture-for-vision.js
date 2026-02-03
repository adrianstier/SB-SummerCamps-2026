#!/usr/bin/env node
/**
 * Capture Camp Screenshots for Claude Vision Analysis
 *
 * Takes screenshots of camp websites for analysis in a Claude session.
 * Output is a list of screenshot paths that can be viewed with the Read tool.
 *
 * Usage:
 *   node backend/capture-for-vision.js "zoo"           # Single camp
 *   node backend/capture-for-vision.js --all           # All camps
 *   node backend/capture-for-vision.js --needs-work    # Camps with quality < 60
 *   node backend/capture-for-vision.js --list          # List available camps
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAMPS_FILE = path.join(DATA_DIR, 'camps.json');
const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');
const VISION_QUEUE_FILE = path.join(DATA_DIR, 'vision-queue.json');

// Ensure screenshots directory exists
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true }).catch(() => {});

async function loadCamps() {
  const data = await fs.readFile(CAMPS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function captureFullPageScreenshot(url, outputPath, options = {}) {
  const { timeout = 30000 } = options;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Scroll to trigger lazy loading
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 400);
        await new Promise(r => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });

    // Capture full page screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png'
    });

    const title = await page.title();
    await browser.close();

    return { success: true, title };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Capture Camp Screenshots for Claude Vision Analysis

Usage:
  node backend/capture-for-vision.js "camp name"    # Single camp by name
  node backend/capture-for-vision.js --all          # All camps
  node backend/capture-for-vision.js --needs-work   # Camps with quality < 60
  node backend/capture-for-vision.js --list         # List all camps

Screenshots are saved to: data/screenshots/
Use the Read tool in Claude to view them for vision analysis.
`);
    process.exit(0);
  }

  const camps = await loadCamps();

  // List mode
  if (args.includes('--list')) {
    console.log('\nAvailable camps:\n');
    for (const camp of camps.sort((a, b) => a.camp_name.localeCompare(b.camp_name))) {
      const quality = camp._last_quality || (camp.extracted ? 50 : 0);
      console.log(`  ${camp.id.padEnd(40)} ${camp.camp_name.substring(0, 30).padEnd(32)} Q:${quality}`);
    }
    process.exit(0);
  }

  // Filter camps
  let campsToCapture = [];

  if (args.includes('--all')) {
    campsToCapture = camps;
  } else if (args.includes('--needs-work')) {
    campsToCapture = camps.filter(c => {
      const quality = c._last_quality || (c.extracted ? 50 : 0);
      return quality < 60;
    });
    console.log(`Found ${campsToCapture.length} camps needing work\n`);
  } else if (args.length > 0) {
    const searchTerm = args.filter(a => !a.startsWith('--')).join(' ').toLowerCase();
    campsToCapture = camps.filter(c =>
      c.camp_name?.toLowerCase().includes(searchTerm) ||
      c.id?.toLowerCase().includes(searchTerm)
    );
  }

  if (campsToCapture.length === 0) {
    console.error('No camps matched. Use --list to see available camps.');
    process.exit(1);
  }

  console.log(`\nCapturing screenshots for ${campsToCapture.length} camp(s)...\n`);

  const visionQueue = [];

  for (const camp of campsToCapture) {
    console.log(`[${campsToCapture.indexOf(camp) + 1}/${campsToCapture.length}] ${camp.camp_name}`);

    const urls = [camp.website_url];

    // Add subpages if we know them
    if (camp.pages_scraped?.length > 0) {
      for (const page of camp.pages_scraped.slice(0, 3)) {
        if (page.url && !urls.includes(page.url)) {
          urls.push(page.url);
        }
      }
    }

    const screenshots = [];

    for (const url of urls) {
      const urlHash = Buffer.from(url).toString('base64').slice(0, 15).replace(/[/+=]/g, '_');
      const filename = `${camp.id}_${urlHash}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);

      console.log(`  Capturing: ${url.substring(0, 60)}...`);
      const result = await captureFullPageScreenshot(url, filepath);

      if (result.success) {
        screenshots.push({
          url,
          filepath,
          filename,
          title: result.title
        });
        console.log(`    -> ${filepath}`);
      } else {
        console.log(`    FAILED: ${result.error}`);
      }
    }

    if (screenshots.length > 0) {
      visionQueue.push({
        campId: camp.id,
        campName: camp.camp_name,
        baseUrl: camp.website_url,
        screenshots,
        capturedAt: new Date().toISOString(),
        currentData: {
          quality: camp._last_quality || 50,
          hasPricing: !!camp.extracted?.pricing_tiers?.weekly,
          hasSessions: camp.extracted?.sessions?.length > 0,
          hasExtendedCare: camp.extracted?.has_extended_care !== null,
          hasHours: !!camp.hours || !!camp.extracted?.hours
        }
      });
    }
  }

  // Save vision queue
  await fs.writeFile(VISION_QUEUE_FILE, JSON.stringify(visionQueue, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('SCREENSHOTS CAPTURED');
  console.log(`${'='.repeat(60)}`);
  console.log(`
Total camps:       ${visionQueue.length}
Total screenshots: ${visionQueue.reduce((sum, c) => sum + c.screenshots.length, 0)}
Vision queue:      ${VISION_QUEUE_FILE}

To analyze in Claude session:
1. Use the Read tool to view screenshots: data/screenshots/<filename>.png
2. Ask Claude to extract camp data from the screenshot
3. Update camps.json with extracted data

Screenshot paths:
`);

  for (const camp of visionQueue) {
    console.log(`\n${camp.campName}:`);
    for (const ss of camp.screenshots) {
      console.log(`  ${ss.filepath}`);
    }
  }

  console.log('\n');
}

main().catch(console.error);
