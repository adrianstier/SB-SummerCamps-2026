/**
 * Extract hero image URLs from camp websites for use in camp cards.
 * Finds the largest/most prominent image in the hero section.
 */
const { chromium } = require('playwright');

const CAMPS = [
  { id: 'adventure-lab-crane', name: 'Adventure Lab @ Crane', url: 'https://craneschool.org' },
  { id: 'cliff-drive-care-center-summer-camp', name: 'Cliff Drive Care Center Summer Camp', url: 'https://cliffdrivecarecenter.org' },
  { id: 'code-next-connect-google-', name: 'Code Next Connect (Google)', url: 'https://codenext.withgoogle.com' },
  { id: 'elings-park-theater-camp', name: 'Elings Park Theater Camp', url: 'https://elingspark.org' },
  { id: 'grant-house-sewing-camp', name: 'Grant House Sewing Camp', url: 'https://granthousesewingmachines.com' },
  { id: 'gustafson-dance-camps', name: 'Gustafson Dance Camps', url: 'https://ssb-academy.com' },
  { id: 'inspire-dance-camps', name: 'Inspire Dance Camps', url: 'https://inspiredancesb.com' },
];

async function extractImages(page) {
  return page.evaluate(() => {
    const results = [];

    // 1. Check <img> tags
    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect();
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:') || rect.width < 100 || rect.height < 80) return;
      // Skip tiny icons, logos
      if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) return;
      results.push({
        src,
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height,
        y: rect.top + window.scrollY,
        type: 'img',
        alt: img.alt || '',
      });
    });

    // 2. Check CSS background-images on divs/sections in the hero area
    document.querySelectorAll('header, section, div, [class*="hero"], [class*="banner"], [class*="slider"]').forEach(el => {
      const style = getComputedStyle(el);
      const bg = style.backgroundImage;
      if (!bg || bg === 'none') return;
      const match = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
      if (!match) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 100) return;
      results.push({
        src: match[1],
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height,
        y: rect.top + window.scrollY,
        type: 'bg',
        alt: '',
      });
    });

    // Sort by area (largest first), then by position (higher on page first)
    results.sort((a, b) => {
      // Prefer images in the top 800px of the page
      const aInHero = a.y < 800 ? 1 : 0;
      const bInHero = b.y < 800 ? 1 : 0;
      if (aInHero !== bInHero) return bInHero - aInHero;
      return b.area - a.area;
    });

    return results.slice(0, 5); // Top 5 candidates
  });
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const camp of CAMPS) {
    console.log(`\n--- ${camp.name} ---`);
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();

    try {
      await page.goto(camp.url, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(3000);

      const images = await extractImages(page);

      if (images.length === 0) {
        console.log('  No suitable images found');
        results.push({ ...camp, image_url: null, note: 'no images found' });
      } else {
        console.log(`  Found ${images.length} candidates:`);
        images.forEach((img, i) => {
          console.log(`    ${i + 1}. [${img.type}] ${img.width}x${img.height} y=${Math.round(img.y)} ${img.src.substring(0, 80)}...`);
        });
        const best = images[0];
        console.log(`  → Selected: ${best.src.substring(0, 100)}`);
        results.push({ id: camp.id, camp_name: camp.name, image_url: best.src });
      }
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
      results.push({ ...camp, image_url: null, note: err.message });
    }

    await ctx.close();
  }

  await browser.close();

  console.log('\n\n=== RESULTS (for camp-images.json) ===');
  const valid = results.filter(r => r.image_url);
  console.log(JSON.stringify(valid, null, 2));
}

main();
