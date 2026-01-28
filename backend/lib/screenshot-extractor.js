/**
 * Screenshot-based Camp Data Extractor
 *
 * Uses Playwright to capture screenshots of camp websites and analyzes them
 * with Claude's vision capabilities for extraction. Particularly useful for:
 * - JS-heavy/SPA sites (Wix, Squarespace, etc.)
 * - Sites that block traditional scraping
 * - Pricing tables rendered as images
 * - Calendar/schedule displays
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'data', 'screenshots');

// Ensure screenshots directory exists
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true }).catch(() => {});

/**
 * Capture screenshots of key pages for a camp
 */
export async function captureScreenshots(campId, urls, options = {}) {
  const {
    timeout = 30000,
    fullPage = true,
    waitForSelectors = [],
    scrollDelay = 1000
  } = options;

  const screenshots = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Filter out PDFs and other non-HTML URLs
    const htmlUrls = urls.filter(url => {
      const lower = url.toLowerCase();
      return !lower.endsWith('.pdf') && !lower.includes('.pdf?') &&
             !lower.endsWith('.doc') && !lower.endsWith('.docx') &&
             !lower.endsWith('.xls') && !lower.endsWith('.xlsx');
    });

    for (const url of htmlUrls.slice(0, 5)) { // Limit to 5 pages
      try {
        console.log(`  Capturing screenshot: ${url}`);

        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout
        });

        // Wait for any specified selectors
        for (const selector of waitForSelectors) {
          await page.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
        }

        // Scroll to trigger lazy loading
        await autoScroll(page, scrollDelay);

        // Generate filename
        const urlHash = Buffer.from(url).toString('base64').slice(0, 20).replace(/[/+=]/g, '_');
        const filename = `${campId}_${urlHash}.png`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);

        // Capture screenshot
        await page.screenshot({
          path: filepath,
          fullPage,
          type: 'png'
        });

        screenshots.push({
          url,
          filepath,
          filename,
          capturedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`  Screenshot failed for ${url}: ${error.message}`);
      }
    }

    await browser.close();

  } catch (error) {
    console.error(`Browser error for ${campId}: ${error.message}`);
    if (browser) await browser.close().catch(() => {});
  }

  return screenshots;
}

/**
 * Auto-scroll page to trigger lazy loading
 */
async function autoScroll(page, delay = 1000) {
  await page.evaluate(async (scrollDelay) => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0); // Scroll back to top
          resolve();
        }
      }, 100);

      // Timeout after scrollDelay
      setTimeout(() => {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }, scrollDelay);
    });
  }, delay);
}

/**
 * Generate extraction prompt for screenshot analysis
 */
export function generateScreenshotPrompt(campName, pageType = 'main') {
  return `Analyze this screenshot of the "${campName}" summer camp website (${pageType} page).

Extract ALL visible information about the summer camp, focusing on:

1. **PRICING** (CRITICAL - look carefully for any numbers with $ signs)
   - Weekly rates, session rates, daily rates
   - Member vs non-member pricing
   - Early bird discounts and deadlines
   - Sibling discounts, multi-week discounts
   - Registration fees

2. **SCHEDULE/SESSIONS**
   - Session dates (look for calendars, date ranges)
   - Session names/themes
   - Days of week offered
   - Total weeks available

3. **HOURS**
   - Daily start/end times
   - Drop-off and pick-up windows
   - Extended care/before-after care availability
   - Extended care hours and cost

4. **AGES**
   - Minimum and maximum ages
   - Grade levels
   - Age group names

5. **ACTIVITIES**
   - List all activities visible (swimming, crafts, sports, STEM, etc.)

6. **REGISTRATION STATUS**
   - Is registration open?
   - Waitlist available?
   - Registration deadline

Return a JSON object with this structure:
{
  "pricing": {
    "weekly_rate": null,
    "member_rate": null,
    "non_member_rate": null,
    "early_bird": { "rate": null, "deadline": null },
    "sibling_discount": null
  },
  "sessions": [
    { "name": "Week 1", "dates": "June 16-20", "theme": "if visible" }
  ],
  "hours": {
    "start": null,
    "end": null,
    "extended_care_available": null,
    "extended_care_hours": null,
    "extended_care_cost": null
  },
  "ages": {
    "min": null,
    "max": null,
    "groups": []
  },
  "activities": [],
  "registration": {
    "status": null,
    "deadline": null,
    "waitlist": null
  },
  "confidence": 0-100,
  "notes": "Any important observations"
}

IMPORTANT:
- Extract EVERY price, date, and time you can see
- If text is partially visible, note what you can read
- Look for pricing tables, calendars, and info boxes
- Check headers, footers, and sidebars for contact/hours`;
}

/**
 * Capture accessibility snapshot (semantic structure)
 */
export async function captureAccessibilitySnapshot(url, options = {}) {
  const { timeout = 30000 } = options;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout
    });

    // Get accessibility tree
    const snapshot = await page.accessibility.snapshot({ interestingOnly: false });

    // Also get all text content
    const textContent = await page.evaluate(() => {
      const removeElements = document.querySelectorAll('script, style, noscript, iframe');
      removeElements.forEach(el => el.remove());
      return document.body?.innerText || '';
    });

    await browser.close();

    return {
      accessibilityTree: snapshot,
      textContent: textContent.substring(0, 15000), // Limit size
      url,
      capturedAt: new Date().toISOString()
    };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    throw error;
  }
}

/**
 * Clean up old screenshots
 */
export async function cleanupOldScreenshots(maxAgeDays = 7) {
  try {
    const files = await fs.readdir(SCREENSHOTS_DIR);
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(SCREENSHOTS_DIR, file);
      const stat = await fs.stat(filepath);

      if (now - stat.mtime.getTime() > maxAge) {
        await fs.unlink(filepath);
        console.log(`Cleaned up old screenshot: ${file}`);
      }
    }
  } catch (error) {
    console.error(`Cleanup error: ${error.message}`);
  }
}

export default {
  captureScreenshots,
  captureAccessibilitySnapshot,
  generateScreenshotPrompt,
  cleanupOldScreenshots
};
