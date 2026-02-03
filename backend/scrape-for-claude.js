#!/usr/bin/env node
/**
 * Scrapes camp websites and outputs content for Claude session extraction
 * Usage: node backend/scrape-for-claude.js "camp name"
 *
 * Outputs JSON with scraped content that can be pasted into a Claude session
 * for AI extraction without requiring an Anthropic API key.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CSV_FILE = path.join(DATA_DIR, 'summer-camps-2026-enhanced.csv');
const CONFIGS_DIR = path.join(DATA_DIR, 'camp-configs');

async function loadCampsFromCSV() {
  const csvData = await fs.readFile(CSV_FILE, 'utf-8');
  const lines = csvData.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = line.match(/("([^"]|"")*"|[^,]*)/g) || [];
    const camp = {};
    headers.forEach((header, i) => {
      let val = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      camp[header] = val;
    });
    return camp;
  });
}

async function loadCampConfig(campId) {
  try {
    const configPath = path.join(CONFIGS_DIR, `${campId}.json`);
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function scrapeCampForClaude(campName) {
  const camps = await loadCampsFromCSV();
  const camp = camps.find(c =>
    c.camp_name?.toLowerCase().includes(campName.toLowerCase()) ||
    c.id?.toLowerCase().includes(campName.toLowerCase())
  );

  if (!camp) {
    console.error(`Camp not found: ${campName}`);
    console.error('Available camps:', camps.map(c => c.camp_name).filter(Boolean).join(', '));
    process.exit(1);
  }

  console.error(`\nScraping: ${camp.camp_name}`);
  console.error(`URL: ${camp.website_url}`);

  // Load config if available
  const config = await loadCampConfig(camp.id);
  if (config) {
    console.error(`Config found: data/camp-configs/${camp.id}.json`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const pageContents = {};
  const urls = config?.pages ? Object.values(config.pages).filter(u => u.startsWith('http')) : [camp.website_url];

  // Scrape each URL
  for (const url of urls.slice(0, 5)) {
    try {
      console.error(`  Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);

      const text = await page.evaluate(() => {
        // Remove scripts and styles
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(s => s.remove());
        return document.body?.innerText || '';
      });

      const urlKey = new URL(url).pathname || 'main';
      pageContents[urlKey] = text.substring(0, 8000);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  await browser.close();

  // Output JSON for Claude
  const output = {
    camp_id: camp.id,
    camp_name: camp.camp_name,
    website_url: camp.website_url,
    csv_baseline: {
      price_min: camp.price_min,
      price_max: camp.price_max,
      min_age: camp.min_age,
      max_age: camp.max_age,
      hours: camp.hours,
      extended_care: camp.extended_care
    },
    config_hints: config?.data_hints || null,
    scraped_content: pageContents,
    scraped_at: new Date().toISOString()
  };

  console.log(JSON.stringify(output, null, 2));
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
  console.log(`
Usage: node backend/scrape-for-claude.js "camp name"

Scrapes a camp website and outputs JSON content for Claude session extraction.
The output can be copied and pasted to Claude for AI-powered data extraction.

Examples:
  node backend/scrape-for-claude.js "zoo"
  node backend/scrape-for-claude.js "UCSB"
  node backend/scrape-for-claude.js "peak2pacific"
`);
  process.exit(0);
}

scrapeCampForClaude(args.join(' ')).catch(console.error);
