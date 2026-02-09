/**
 * Verify candidate image URLs by loading them in a browser
 * and screenshotting how they'd crop in a card (16:10 ratio, object-fit: cover).
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'camp-heroes', 'card-preview');

// Curated best picks based on what we saw
const PICKS = [
  {
    id: 'adventure-lab-crane',
    camp_name: 'Adventure Lab @ Crane',
    // The hero aerial shot of campus with green trees
    image_url: 'https://resources.finalsite.net/images/f_auto,q_auto/v1709360450/craneschoolorg/hoc6dxv3plfmvnnfa7c8/WebsiteHome-Values1440x1024.png',
  },
  {
    id: 'cliff-drive-care-center-summer-camp',
    camp_name: 'Cliff Drive Care Center Summer Camp',
    // Wide banner with 4 kids playing
    image_url: 'https://images.squarespace-cdn.com/content/v1/54fc7930e4b0433313325ff9/b70e4573-9751-486a-9dd7-ca6632aed808/CDCC+Website+Banners+%2817%29.jpg?format=1500w',
  },
  {
    id: 'code-next-connect-google-',
    camp_name: 'Code Next Connect (Google)',
    // Google Code Next hero
    image_url: 'https://lh3.googleusercontent.com/L295Icjdl9Jrq6v-jECACKKEAi8WC1X55aUGxmUNiQ_SYA5xIKQidAOvfDIhpXBrmys-1epswb-leBB3HWYXHOhLprgDreV5_bXrnJ60ZZV0CHhwotE=h720',
  },
  {
    id: 'elings-park-theater-camp',
    camp_name: 'Elings Park Theater Camp',
    // BMX photo from their site (scenic park action shot)
    image_url: 'https://elingspark.org/wp-content/uploads/2026/01/WEB-BMX.png',
  },
  {
    id: 'grant-house-sewing-camp',
    camp_name: 'Grant House Sewing Camp',
    // Sewing class with students
    image_url: 'https://media.rainpos.com/4929/ss_4929_6610704_17.png',
  },
  {
    id: 'gustafson-dance-camps',
    camp_name: 'Gustafson Dance Camps',
    // Actual dance/classes photo (not the logo)
    image_url: 'https://ssb-academy.com/wp-content/uploads/2021/12/classes-and-camps.jpg',
  },
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });

  for (const pick of PICKS) {
    console.log(`\n--- ${pick.camp_name} ---`);
    const page = await ctx.newPage();

    // Create a card-like preview: 400x250 with object-fit: cover
    await page.setContent(`
      <html><body style="margin:0;padding:0;background:#f5f3ef;">
        <div style="width:400px;height:250px;overflow:hidden;border-radius:12px;">
          <img src="${pick.image_url}"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="document.body.style.background='red'"
          />
        </div>
      </body></html>
    `);

    try {
      // Wait for image to load
      await page.waitForFunction(() => {
        const img = document.querySelector('img');
        return img && (img.complete || img.naturalWidth > 0);
      }, { timeout: 10000 });
      await page.waitForTimeout(500);

      // Check if image actually loaded (not error)
      const loaded = await page.evaluate(() => {
        const img = document.querySelector('img');
        return img && img.naturalWidth > 0 && img.naturalHeight > 0;
      });

      if (loaded) {
        const dims = await page.evaluate(() => {
          const img = document.querySelector('img');
          return { w: img.naturalWidth, h: img.naturalHeight };
        });
        console.log(`  ✓ Loaded: ${dims.w}x${dims.h}`);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${pick.id}.png`),
          clip: { x: 0, y: 0, width: 400, height: 250 },
        });
        console.log(`  → Card preview saved`);
      } else {
        console.log('  ✗ Image failed to load');
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nDone!');
}

main();
