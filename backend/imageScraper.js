import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Supabase setup - use anon key for reading, service key for writing if available
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_KEY !== 'your-service-role-key-here'
  ? process.env.SUPABASE_SERVICE_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'camp-images.json');

// Config
const CONFIG = {
  timeout: 20000,
  minImageWidth: 300,
  minImageHeight: 200,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Keywords that suggest a good camp image
const POSITIVE_KEYWORDS = [
  'camp', 'kids', 'children', 'summer', 'activity', 'fun', 'play',
  'outdoor', 'group', 'team', 'class', 'program', 'hero', 'banner',
  'main', 'feature', 'splash', 'header'
];

// Keywords to avoid (logos, icons, etc)
const NEGATIVE_KEYWORDS = [
  'logo', 'icon', 'avatar', 'badge', 'button', 'arrow', 'social',
  'facebook', 'instagram', 'twitter', 'youtube', 'linkedin',
  'payment', 'credit', 'visa', 'mastercard', 'paypal', 'stripe',
  'footer', 'sponsor', 'partner', 'ad', 'advertisement'
];

// Score an image based on various factors
function scoreImage(img) {
  let score = 0;
  const src = (img.src || '').toLowerCase();
  const alt = (img.alt || '').toLowerCase();
  const className = (img.className || '').toLowerCase();

  // Size bonus (larger = better, up to a point)
  if (img.naturalWidth >= 800) score += 30;
  else if (img.naturalWidth >= 600) score += 25;
  else if (img.naturalWidth >= 400) score += 15;
  else if (img.naturalWidth >= 300) score += 5;

  // Aspect ratio bonus (wide images are often hero images)
  const ratio = img.naturalWidth / img.naturalHeight;
  if (ratio >= 1.5 && ratio <= 3) score += 20;
  else if (ratio >= 1.2 && ratio <= 1.5) score += 10;

  // Position bonus (images near top of page)
  const rect = img.getBoundingClientRect();
  if (rect.top < 600) score += 15;
  else if (rect.top < 1200) score += 5;

  // Positive keywords bonus
  for (const kw of ['camp', 'kids', 'children', 'summer', 'activity', 'fun', 'play', 'outdoor', 'group', 'hero', 'banner', 'main', 'feature']) {
    if (alt.includes(kw) || src.includes(kw) || className.includes(kw)) {
      score += 10;
    }
  }

  // Negative keywords penalty
  for (const kw of ['logo', 'icon', 'avatar', 'badge', 'button', 'social', 'facebook', 'instagram', 'twitter', 'payment', 'footer', 'sponsor']) {
    if (alt.includes(kw) || src.includes(kw) || className.includes(kw)) {
      score -= 30;
    }
  }

  // SVG penalty (usually icons/graphics)
  if (src.includes('.svg')) score -= 40;

  // Data URI penalty (usually small embedded images)
  if (src.startsWith('data:')) score -= 20;

  // GIF penalty (often animations or small graphics)
  if (src.includes('.gif')) score -= 10;

  return score;
}

// Extract best image from a page
async function extractBestImage(page) {
  // Wait for images to load
  await page.waitForTimeout(2000);

  // Scroll to trigger lazy loading
  await page.evaluate(async () => {
    window.scrollTo(0, 300);
    await new Promise(r => setTimeout(r, 500));
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(1000);

  // Get all images with scoring
  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => {
      // Get computed dimensions if natural dimensions aren't available
      const rect = img.getBoundingClientRect();
      return {
        src: img.src,
        alt: img.alt || '',
        className: img.className || '',
        naturalWidth: img.naturalWidth || rect.width,
        naturalHeight: img.naturalHeight || rect.height,
        top: rect.top,
        // Calculate score inline
        score: (() => {
          let score = 0;
          const src = (img.src || '').toLowerCase();
          const alt = (img.alt || '').toLowerCase();
          const className = (img.className || '').toLowerCase();

          // Size bonus
          const w = img.naturalWidth || rect.width;
          const h = img.naturalHeight || rect.height;
          if (w >= 800) score += 30;
          else if (w >= 600) score += 25;
          else if (w >= 400) score += 15;
          else if (w >= 300) score += 5;

          // Minimum size requirement
          if (w < 200 || h < 150) return -100;

          // Aspect ratio bonus
          const ratio = w / h;
          if (ratio >= 1.5 && ratio <= 3) score += 20;
          else if (ratio >= 1.2 && ratio <= 1.5) score += 10;

          // Position bonus
          if (rect.top < 600) score += 15;
          else if (rect.top < 1200) score += 5;

          // Positive keywords
          const positiveKw = ['camp', 'kids', 'children', 'summer', 'activity', 'fun', 'play', 'outdoor', 'group', 'hero', 'banner', 'main', 'feature', 'header'];
          for (const kw of positiveKw) {
            if (alt.includes(kw) || src.includes(kw) || className.includes(kw)) score += 10;
          }

          // Negative keywords
          const negativeKw = ['logo', 'icon', 'avatar', 'badge', 'button', 'social', 'facebook', 'instagram', 'twitter', 'payment', 'footer', 'sponsor', 'partner'];
          for (const kw of negativeKw) {
            if (alt.includes(kw) || src.includes(kw) || className.includes(kw)) score -= 30;
          }

          // Format penalties
          if (src.includes('.svg')) score -= 40;
          if (src.startsWith('data:')) score -= 20;
          if (src.includes('.gif')) score -= 10;

          return score;
        })()
      };
    }).filter(img => img.src && !img.src.startsWith('data:') && img.score > -50);
  });

  // Sort by score and return best
  images.sort((a, b) => b.score - a.score);

  if (images.length > 0 && images[0].score > 0) {
    return images[0].src;
  }

  return null;
}

// Scrape image for a single camp
async function scrapeCampImage(browser, camp) {
  if (!camp.website_url && !camp.website) {
    console.log(`  [SKIP] ${camp.camp_name} - No website URL`);
    return null;
  }

  const url = camp.website_url || camp.website;
  if (!url || url === 'N/A' || url.includes('CLOSED')) {
    console.log(`  [SKIP] ${camp.camp_name} - Invalid URL`);
    return null;
  }

  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  try {
    console.log(`  Scraping: ${camp.camp_name}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout
    });

    const imageUrl = await extractBestImage(page);

    if (imageUrl) {
      console.log(`    ✓ Found image: ${imageUrl.substring(0, 60)}...`);
      return imageUrl;
    } else {
      console.log(`    ✗ No suitable image found`);
      return null;
    }

  } catch (error) {
    console.log(`    ✗ Error: ${error.message.substring(0, 50)}`);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// Main function
async function scrapeImages() {
  console.log('Starting image scraper...\n');

  // Get camps from Supabase
  const { data: camps, error } = await supabase
    .from('camps')
    .select('id, camp_name, website_url, website, image_url')
    .order('camp_name');

  if (error) {
    console.error('Error fetching camps:', error);
    process.exit(1);
  }

  console.log(`Found ${camps.length} camps in database\n`);

  // Filter to camps without images (or all if --force flag)
  const forceAll = process.argv.includes('--force');
  const campsToScrape = forceAll
    ? camps
    : camps.filter(c => !c.image_url);

  console.log(`Scraping images for ${campsToScrape.length} camps${forceAll ? ' (forced)' : ' (missing images only)'}\n`);

  if (campsToScrape.length === 0) {
    console.log('All camps already have images!');
    return;
  }

  const browser = await chromium.launch({ headless: true });

  let successCount = 0;
  let failCount = 0;
  const results = [];

  try {
    for (const camp of campsToScrape) {
      const imageUrl = await scrapeCampImage(browser, camp);

      if (imageUrl) {
        results.push({ id: camp.id, camp_name: camp.camp_name, image_url: imageUrl });

        // Try to update Supabase directly
        const { error: updateError } = await supabase
          .from('camps')
          .update({ image_url: imageUrl })
          .eq('id', camp.id);

        if (updateError) {
          console.log(`    ⚠ DB update failed (will save to file): ${updateError.message}`);
        } else {
          console.log(`    ✓ Updated in database`);
        }
        successCount++;
      } else {
        failCount++;
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    }
  } finally {
    await browser.close();
  }

  // Save results to file (backup in case DB updates fail)
  if (results.length > 0) {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${OUTPUT_FILE}`);
  }

  console.log('\n--- Summary ---');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${campsToScrape.length}`);

  return results;
}

// Run
scrapeImages().catch(console.error);
