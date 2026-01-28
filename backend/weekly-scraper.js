#!/usr/bin/env node
/**
 * Weekly Multi-Strategy Camp Data Scraper
 *
 * Runs all extraction strategies and produces a comprehensive data update.
 * Designed to be run weekly via cron or manually.
 *
 * Usage:
 *   node backend/weekly-scraper.js                    # Full run
 *   node backend/weekly-scraper.js --camp "zoo"       # Single camp
 *   node backend/weekly-scraper.js --strategy webfetch # Specific strategy only
 *   node backend/weekly-scraper.js --report           # Generate report only
 *   node backend/weekly-scraper.js --dry-run          # Preview without saving
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

import {
  scoreDataQuality,
  mergeExtractions,
  detectChanges,
  validateExtraction,
  logPipelineRun,
  logChanges,
  generateWeeklyReport
} from './lib/pipeline.js';

import {
  captureScreenshots,
  captureAccessibilitySnapshot,
  generateScreenshotPrompt,
  cleanupOldScreenshots
} from './lib/screenshot-extractor.js';

import {
  generateAlternateUrls,
  loadExtractionLog,
  recordExtractionAttempt,
  calculateDataQuality,
  loadCampConfig
} from './lib/multi-strategy-extractor.js';

import {
  discoverCampPages,
  extractPrices,
  extractSessions,
  extractHours,
  extractFromTables,
  extractFromJsonLd,
  detectExtendedCare,
  extractActivities,
  calculateQualityScore
} from './lib/smart-extractor.js';

import {
  isClaudeAvailable,
  extractWithClaude,
  mergeWithCSVFallback
} from './lib/claude-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAMPS_FILE = path.join(DATA_DIR, 'camps.json');
const CSV_FILE = path.join(DATA_DIR, 'summer-camps-2026-enhanced.csv');
const REPORT_DIR = path.join(DATA_DIR, 'reports');

// Ensure report directory exists
await fs.mkdir(REPORT_DIR, { recursive: true }).catch(() => {});

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a, i) => args[i - 1] === '--limit');
  return {
    camp: args.find((a, i) => args[i - 1] === '--camp') || null,
    strategy: args.find((a, i) => args[i - 1] === '--strategy') || 'all',
    limit: limitArg ? parseInt(limitArg) : null,
    reportOnly: args.includes('--report'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Load current camps data
 */
async function loadCampsData() {
  try {
    const data = await fs.readFile(CAMPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Load CSV baseline data
 */
async function loadCSVBaseline() {
  try {
    const csvData = await fs.readFile(CSV_FILE, 'utf-8');
    const lines = csvData.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map(line => {
      const values = line.match(/(\"([^\"]|\"\")*\"|[^,]*)/g) || [];
      const camp = {};
      headers.forEach((header, i) => {
        let val = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
        camp[header] = val;
      });
      return camp;
    });
  } catch (error) {
    console.error('Failed to load CSV:', error.message);
    return [];
  }
}

/**
 * Retry wrapper for strategies
 */
async function withRetry(fn, maxRetries = 2, delayMs = 2000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result.success) return result;
      lastError = result.error;
    } catch (error) {
      lastError = error.message;
    }
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return { success: false, error: lastError };
}

/**
 * Strategy 1: WebFetch-based extraction
 * Fast but limited for JS-heavy sites
 */
async function strategyWebFetch(url, campName) {
  return withRetry(async () => {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      const text = await page.evaluate(() => {
        const remove = document.querySelectorAll('script, style, noscript');
        remove.forEach(el => el.remove());
        return document.body?.innerText || '';
      });

      const title = await page.title();
      await browser.close();
      browser = null;

      const extracted = extractFromText(text, campName);
      extracted._strategy = 'webfetch';

      return {
        success: true,
        extracted,
        textLength: text.length,
        title
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return { success: false, error: error.message };
    }
  }, 1); // 1 retry for webfetch
}

/**
 * Strategy 2: Full Playwright rendering with smart page discovery
 * Better for JS-heavy sites - now discovers and scrapes additional pages
 */
async function strategyPlaywright(url, campName) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    // First, discover all relevant pages (pricing, schedule, FAQ, register, camps)
    const discoveredPages = await discoverCampPages(url, browser);
    const pagesToScrape = [url];
    const pdfLinks = discoveredPages.pdfs || [];

    // Priority order for pages: pricing > camps > schedule > register > faq
    const priorityOrder = ['pricing', 'camps', 'schedule', 'register', 'faq'];

    // Add discovered pages if they're different from main
    for (const pageType of priorityOrder) {
      const pageUrl = discoveredPages[pageType];
      if (pageUrl && typeof pageUrl === 'string' &&
          pageUrl !== url && !pagesToScrape.includes(pageUrl) &&
          !pageUrl.endsWith('.pdf') && !pageUrl.includes('.pdf?')) {
        pagesToScrape.push(pageUrl);
      }
    }

    // Limit to 5 pages max to balance thoroughness with speed
    const urlsToProcess = pagesToScrape.slice(0, 5);

    let allText = '';
    const allStructuredData = { jsonLd: [], tables: [] };
    let title = '';

    // Scrape each discovered page
    for (const pageUrl of urlsToProcess) {
      try {
        const page = await context.newPage();

        // Use domcontentloaded for faster initial load, then wait for JS
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Wait for dynamic content to render
        await page.waitForTimeout(3000);

        // Scroll to trigger lazy loading
        await page.evaluate(async () => {
          for (let i = 0; i < 3; i++) {
            window.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 200));
          }
          window.scrollTo(0, 0);
        });

        // Get all text content
        const pageText = await page.evaluate(() => {
          const remove = document.querySelectorAll('script, style, noscript, iframe');
          remove.forEach(el => el.remove());
          return document.body?.innerText || '';
        });

        // Get structured data
        const structuredData = await page.evaluate(() => {
          const jsonLd = [];
          document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
            try {
              jsonLd.push(JSON.parse(el.textContent));
            } catch {}
          });

          const tables = [];
          document.querySelectorAll('table').forEach(table => {
            const rows = [];
            table.querySelectorAll('tr').forEach(tr => {
              const cells = [];
              tr.querySelectorAll('td, th').forEach(cell => {
                cells.push(cell.innerText.trim());
              });
              if (cells.length > 0) rows.push(cells);
            });
            if (rows.length > 0) tables.push(rows);
          });

          return { jsonLd, tables };
        });

        if (!title) {
          title = await page.title();
        }

        // Accumulate text and structured data
        allText += `\n\n=== PAGE: ${pageUrl} ===\n${pageText}`;
        allStructuredData.jsonLd.push(...structuredData.jsonLd);
        allStructuredData.tables.push(...structuredData.tables);

        await page.close();
      } catch (pageError) {
        // Continue with other pages if one fails
        console.log(`  Page ${pageUrl} failed: ${pageError.message}`);
      }
    }

    await browser.close();
    browser = null;

    const extracted = extractFromText(allText, campName);
    extracted._strategy = 'playwright';
    extracted._pages_scraped = urlsToProcess;
    extracted._discovered_pages = discoveredPages;

    // Extract from JSON-LD if present
    if (allStructuredData.jsonLd.length > 0) {
      mergeFromJsonLd(extracted, allStructuredData.jsonLd);
    }

    // Extract from tables
    if (allStructuredData.tables.length > 0) {
      mergeFromTables(extracted, allStructuredData.tables);
    }

    return {
      success: true,
      extracted,
      textLength: allText.length,
      title,
      pagesScraped: urlsToProcess.length,
      hasStructuredData: allStructuredData.jsonLd.length > 0 || allStructuredData.tables.length > 0
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return { success: false, error: error.message };
  }
}

/**
 * Strategy 3: Accessibility snapshot
 * Gets semantic structure of the page - with robust error handling
 */
async function strategyAccessibility(url, campName) {
  let browser;
  try {
    // Use direct Playwright instead of captureAccessibilitySnapshot which had issues
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    // Wait a moment for initial JS
    await page.waitForTimeout(1000);

    // Get accessibility snapshot
    let accessibilityTree = null;
    try {
      accessibilityTree = await page.accessibility.snapshot();
    } catch (accessError) {
      // Accessibility snapshot not supported - continue without it
    }

    // Extract all text from accessibility nodes
    const textContent = await page.evaluate(() => {
      // Get all visible text
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        { acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }}
      );

      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (text) texts.push(text);
      }
      return texts.join(' ');
    });

    await browser.close();
    browser = null;

    const extracted = extractFromText(textContent, campName);
    extracted._strategy = 'accessibility';

    // Parse accessibility tree for additional structure if available
    if (accessibilityTree) {
      const treeData = parseAccessibilityTree(accessibilityTree);
      Object.assign(extracted, treeData);
    }

    return {
      success: true,
      extracted,
      textLength: textContent?.length || 0
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return { success: false, error: error.message };
  }
}

/**
 * Strategy 4: Screenshot capture (for later vision analysis)
 * Captures screenshots that can be analyzed with Claude Vision
 */
async function strategyScreenshot(campId, urls, campName) {
  try {
    const screenshots = await captureScreenshots(campId, urls.slice(0, 3));

    return {
      success: screenshots.length > 0,
      screenshots,
      extracted: {
        _strategy: 'screenshot',
        _screenshot_count: screenshots.length,
        _screenshot_paths: screenshots.map(s => s.filepath),
        _needs_vision_analysis: true
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Extract structured data from raw text using smart-extractor methods
 */
function extractFromText(text, campName) {
  const extracted = {
    pricing_tiers: {},
    sessions: [],
    activities: [],
    age_groups: [],
    has_extended_care: null,
    extended_care_details: null,
    hours: null
  };

  if (!text) return extracted;

  // Use smart-extractor for pricing (much more comprehensive)
  const prices = extractPrices(text);
  if (prices.weekly || prices.session || prices.daily) {
    extracted.pricing_tiers = {
      weekly: prices.weekly,
      daily: prices.daily,
      perSession: prices.session,
      halfDay: prices.halfDay,
      fullDay: prices.fullDay,
      earlyBird: prices.earlyBird,
      member: prices.member,
      nonMember: prices.nonMember
    };
    // Also store extended care pricing separately
    if (prices.extendedCare) {
      extracted.extended_care_cost = `$${prices.extendedCare}`;
    }
  }

  // Use smart-extractor for hours (handles drop-off/pick-up windows)
  const hours = extractHours(text);
  if (hours) {
    extracted.hours = hours.standard;
    extracted.hours_detail = {
      standard: hours.standard,
      dropOff: hours.dropOff,
      pickUp: hours.pickUp,
      extendedBefore: hours.extendedBefore,
      extendedAfter: hours.extendedAfter
    };
  }

  // Use smart-extractor for extended care detection (more nuanced)
  const extendedCare = detectExtendedCare(text);
  if (extendedCare.available !== null) {
    extracted.has_extended_care = extendedCare.available;
    extracted.extended_care_details = extendedCare.details;
    if (extendedCare.cost) {
      extracted.extended_care_cost = extendedCare.cost;
    }
    if (extendedCare.times) {
      extracted.extended_care_hours = extendedCare.times;
    }
  }

  // Use smart-extractor for activities (categorized, more comprehensive)
  const activities = extractActivities(text);
  if (activities.length > 0) {
    extracted.activities = activities;
  }

  // Use smart-extractor for sessions (handles Week 1: pattern, date ranges)
  const sessions = extractSessions(text);
  if (sessions.length > 0) {
    extracted.sessions = sessions;
  }

  // Extract ages (keep existing logic, works well)
  const ageMatch = text.match(/ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i);
  if (ageMatch) {
    extracted.min_age = parseInt(ageMatch[1]);
    extracted.max_age = parseInt(ageMatch[2]);
  }

  // Look for named age groups
  const ageGroupPatterns = [
    /(\w+(?:\s+\w+)?)\s*(?:ages?|:)\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/gi
  ];
  for (const pattern of ageGroupPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 30 && !name.toLowerCase().includes('week')) {
        extracted.age_groups.push({
          name,
          minAge: parseInt(match[2]),
          maxAge: parseInt(match[3])
        });
      }
    }
  }

  return extracted;
}

/**
 * Merge data from JSON-LD structured data (using smart-extractor)
 */
function mergeFromJsonLd(extracted, jsonLd) {
  const jsonLdData = extractFromJsonLd(jsonLd);

  // Merge pricing
  if (jsonLdData.pricing) {
    extracted.pricing_tiers = {
      ...extracted.pricing_tiers,
      ...jsonLdData.pricing
    };
  }

  // Merge sessions
  if (jsonLdData.sessions && jsonLdData.sessions.length > 0) {
    extracted.sessions = [
      ...(extracted.sessions || []),
      ...jsonLdData.sessions.filter(newS =>
        !extracted.sessions?.some(existingS =>
          existingS.dates === newS.dates
        )
      )
    ];
  }

  // Merge contact info
  if (jsonLdData.contact) {
    extracted.contact = {
      ...extracted.contact,
      ...jsonLdData.contact
    };
  }
}

/**
 * Merge data from HTML tables (using smart-extractor)
 */
function mergeFromTables(extracted, tables) {
  // Convert to format expected by smart-extractor
  const formattedTables = tables.map(rows => ({ rows }));
  const tableData = extractFromTables(formattedTables);

  // Merge pricing from tables
  if (tableData.pricing) {
    extracted.pricing_tiers = {
      ...extracted.pricing_tiers,
      ...tableData.pricing
    };
  }

  // Merge sessions from tables
  if (tableData.sessions && tableData.sessions.length > 0) {
    extracted.sessions = [
      ...(extracted.sessions || []),
      ...tableData.sessions.filter(newS =>
        !extracted.sessions?.some(existingS =>
          existingS.dates === newS.dates
        )
      )
    ];
  }

  // Merge age groups from tables
  if (tableData.ageGroups && tableData.ageGroups.length > 0) {
    extracted.age_groups = [
      ...(extracted.age_groups || []),
      ...tableData.ageGroups
    ];
  }
}

/**
 * Parse accessibility tree for structured data
 */
function parseAccessibilityTree(tree, depth = 0) {
  const data = {};

  // Recursive search would go here
  // For now, return empty - full implementation would traverse tree

  return data;
}

/**
 * Run all strategies for a single camp
 */
async function processCamp(camp, options = {}) {
  const { verbose = false, strategies = ['webfetch', 'playwright', 'accessibility'] } = options;

  const campId = camp.id;
  const campName = camp.camp_name;
  const baseUrl = camp.website_url;

  if (verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${campName}`);
    console.log(`URL: ${baseUrl}`);
    console.log(`${'='.repeat(60)}`);
  }

  // Load camp-specific config if exists
  const config = await loadCampConfig(campId);

  // Generate URLs to try
  const urls = config?.pages
    ? Object.values(config.pages).filter(u => u?.startsWith('http'))
    : generateAlternateUrls(baseUrl);

  const results = [];

  // Strategy 1: WebFetch (fast)
  if (strategies.includes('webfetch') || strategies.includes('all')) {
    if (verbose) console.log('  Strategy: WebFetch...');
    const result = await strategyWebFetch(urls[0], campName);
    if (result.success) {
      result.strategy = 'webfetch';
      result.quality = scoreDataQuality(result.extracted);
      results.push(result);
      if (verbose) console.log(`    Quality: ${result.quality}`);
    } else if (verbose) {
      console.log(`    Failed: ${result.error}`);
    }
  }

  // Strategy 2: Playwright (comprehensive)
  if (strategies.includes('playwright') || strategies.includes('all')) {
    if (verbose) console.log('  Strategy: Playwright...');
    const result = await strategyPlaywright(urls[0], campName);
    if (result.success) {
      result.strategy = 'playwright';
      result.quality = scoreDataQuality(result.extracted);
      results.push(result);
      if (verbose) console.log(`    Quality: ${result.quality}`);
    } else if (verbose) {
      console.log(`    Failed: ${result.error}`);
    }
  }

  // Strategy 3: Accessibility
  if (strategies.includes('accessibility') || strategies.includes('all')) {
    if (verbose) console.log('  Strategy: Accessibility...');
    const result = await strategyAccessibility(urls[0], campName);
    if (result.success) {
      result.strategy = 'accessibility';
      result.quality = scoreDataQuality(result.extracted);
      results.push(result);
      if (verbose) console.log(`    Quality: ${result.quality}`);
    } else if (verbose) {
      console.log(`    Failed: ${result.error}`);
    }
  }

  // Strategy 4: Screenshot (for later vision analysis)
  if (strategies.includes('screenshot') || strategies.includes('all')) {
    if (verbose) console.log('  Strategy: Screenshot...');
    const result = await strategyScreenshot(campId, urls, campName);
    if (result.success) {
      result.strategy = 'screenshot';
      result.quality = 0; // Screenshots need vision analysis
      results.push(result);
      if (verbose) console.log(`    Captured: ${result.screenshots?.length || 0} screenshots`);
    }
  }

  // Strategy 5: Claude API (highest quality, requires ANTHROPIC_API_KEY)
  if ((strategies.includes('claude') || strategies.includes('all')) && isClaudeAvailable()) {
    if (verbose) console.log('  Strategy: Claude API...');
    try {
      // Collect all text from other strategies to feed to Claude
      const pageContents = {};
      for (const r of results) {
        if (r.extracted?._pages_scraped) {
          pageContents['scraped'] = r.textContent || '';
        }
      }

      // Get fresh text content if we don't have much
      if (Object.keys(pageContents).length === 0) {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        try {
          await page.goto(urls[0], { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2000);
          pageContents['main'] = await page.evaluate(() => document.body?.innerText || '');
        } catch (e) {
          // Ignore errors
        }
        await browser.close();
      }

      if (Object.keys(pageContents).length > 0) {
        const claudeExtracted = await extractWithClaude(config || { name: campName }, pageContents, camp);
        const normalized = mergeWithCSVFallback(claudeExtracted, camp);

        const result = {
          success: true,
          strategy: 'claude',
          extracted: {
            ...normalized,
            _strategy: 'claude-api'
          },
          quality: 0 // Will calculate below
        };

        // Calculate quality from Claude's confidence scores
        const confidenceTotal = Object.values(claudeExtracted.confidence || {}).reduce((a, b) => a + b, 0);
        const confidenceCount = Object.keys(claudeExtracted.confidence || {}).length || 1;
        result.quality = Math.round(confidenceTotal / confidenceCount);

        results.push(result);
        if (verbose) console.log(`    Quality: ${result.quality}`);
      }
    } catch (error) {
      if (verbose) console.log(`    Failed: ${error.message}`);
    }
  }

  // Merge results from all strategies
  const merged = mergeExtractions(results);
  const finalQuality = scoreDataQuality(merged);

  // Validate
  const validation = validateExtraction(merged, config);

  // Track best strategy
  const bestResult = results.reduce((best, r) =>
    (r.quality || 0) > (best?.quality || 0) ? r : best, null);

  return {
    campId,
    campName,
    url: baseUrl,
    quality: finalQuality,
    bestStrategy: bestResult?.strategy,
    strategyQualities: Object.fromEntries(
      results.map(r => [r.strategy, r.quality || 0])
    ),
    extracted: merged,
    validation,
    strategies: results.length
  };
}

/**
 * Main pipeline runner
 */
async function runPipeline() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Weekly Multi-Strategy Camp Scraper

Usage:
  node backend/weekly-scraper.js [options]

Options:
  --camp <name>       Scrape only camps matching <name>
  --limit <n>         Limit to first N camps
  --strategy <type>   Use only specific strategy (webfetch|playwright|accessibility|screenshot|claude|all)
  --report            Generate report from existing data (no scraping)
  --dry-run           Preview without saving changes
  --verbose, -v       Show detailed progress
  --help, -h          Show this help

Note: Claude strategy requires ANTHROPIC_API_KEY environment variable.

Examples:
  node backend/weekly-scraper.js                        # Full weekly run
  node backend/weekly-scraper.js --camp "zoo" -v        # Single camp, verbose
  node backend/weekly-scraper.js --limit 10             # First 10 camps only
  node backend/weekly-scraper.js --strategy playwright  # Playwright only
  node backend/weekly-scraper.js --report               # Generate report
`);
    process.exit(0);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  WEEKLY MULTI-STRATEGY CAMP SCRAPER');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70) + '\n');

  // Load current data
  const camps = await loadCampsData();
  const csvBaseline = await loadCSVBaseline();

  if (camps.length === 0) {
    console.error('No camps data found. Run the initial scraper first.');
    process.exit(1);
  }

  // Filter camps if specified
  let campsToProcess = camps;
  if (args.camp) {
    campsToProcess = camps.filter(c =>
      c.camp_name?.toLowerCase().includes(args.camp.toLowerCase()) ||
      c.id?.toLowerCase().includes(args.camp.toLowerCase())
    );
    console.log(`Filtered to ${campsToProcess.length} camps matching "${args.camp}"`);
  }

  // Apply limit if specified
  if (args.limit && args.limit > 0) {
    campsToProcess = campsToProcess.slice(0, args.limit);
    console.log(`Limited to ${campsToProcess.length} camps`);
  }

  // Report only mode
  if (args.reportOnly) {
    console.log('Generating report from existing data...\n');
    const mockResults = camps.map(c => ({
      campId: c.id,
      campName: c.camp_name,
      quality: scoreDataQuality(c.extracted),
      bestStrategy: c.extracted?._extraction_source || 'unknown'
    }));
    const report = generateWeeklyReport(mockResults, []);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  // Process each camp
  const results = [];
  const changes = [];
  const startTime = Date.now();

  console.log(`Processing ${campsToProcess.length} camps...\n`);

  for (let i = 0; i < campsToProcess.length; i++) {
    const camp = campsToProcess[i];
    const progress = `[${i + 1}/${campsToProcess.length}]`;

    if (!args.verbose) {
      process.stdout.write(`\r${progress} ${camp.camp_name.padEnd(40)} `);
    }

    try {
      const result = await processCamp(camp, {
        verbose: args.verbose,
        strategies: args.strategy === 'all' ? ['webfetch', 'playwright', 'accessibility', 'screenshot'] :
          [args.strategy]
      });

      results.push(result);

      // Detect changes from previous data
      const change = detectChanges(camp, result, camp.id);
      if (change.hasChanges) {
        changes.push(change);
      }

      if (!args.verbose) {
        process.stdout.write(`Quality: ${result.quality}`);
      }

      // Update camp data if not dry run
      if (!args.dryRun && result.extracted) {
        camp.extracted = {
          ...camp.extracted,
          ...result.extracted
        };
        camp.scrape_timestamp = new Date().toISOString();
        camp.scrape_status = 'scraped';
        camp._last_quality = result.quality;
        camp._last_strategy = result.bestStrategy;
      }

    } catch (error) {
      console.error(`\nError processing ${camp.camp_name}: ${error.message}`);
      results.push({
        campId: camp.id,
        campName: camp.camp_name,
        quality: 0,
        error: error.message
      });
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n');

  // Save updated data if not dry run
  if (!args.dryRun) {
    await fs.writeFile(CAMPS_FILE, JSON.stringify(camps, null, 2));
    console.log(`Updated ${CAMPS_FILE}`);

    // Log changes
    await logChanges(changes);
    if (changes.length > 0) {
      console.log(`Logged ${changes.length} changes to change-log.json`);
    }
  }

  // Generate and save report
  const report = generateWeeklyReport(results, changes);
  const reportPath = path.join(REPORT_DIR, `report-${new Date().toISOString().split('T')[0]}.json`);

  if (!args.dryRun) {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
  }

  // Log pipeline run
  await logPipelineRun({
    duration: Date.now() - startTime,
    campsProcessed: results.length,
    avgQuality: report.summary.avgQuality,
    changesDetected: changes.length
  });

  // Cleanup old screenshots
  await cleanupOldScreenshots(7);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`
  Total camps:       ${report.summary.totalCamps}
  Successful (60+):  ${report.summary.successfulExtractions}
  Needs review:      ${report.summary.needsReview}
  Failed:            ${report.summary.failed}
  Average quality:   ${report.summary.avgQuality}

  Changes detected:  ${report.changes.total}
  - Price changes:   ${report.changes.priceChanges}
  - Reg changes:     ${report.changes.registrationChanges}

  Duration:          ${Math.round((Date.now() - startTime) / 1000)}s
`);

  if (report.campsNeedingAttention.length > 0) {
    console.log('  Camps needing attention:');
    for (const camp of report.campsNeedingAttention.slice(0, 5)) {
      console.log(`    - ${camp.name} (quality: ${camp.quality})`);
    }
  }

  console.log('='.repeat(70) + '\n');
}

// Run if called directly
runPipeline().catch(console.error);
