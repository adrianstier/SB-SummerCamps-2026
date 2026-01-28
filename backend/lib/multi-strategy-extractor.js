/**
 * Multi-Strategy Camp Data Extractor
 *
 * Tries multiple approaches to extract camp data:
 * 1. WebFetch on main URL
 * 2. WebFetch on alternate URLs (/camps, /summer, /programs, etc.)
 * 3. Playwright browser rendering for JS-heavy sites
 * 4. Config-based hints as fallback context
 * 5. CSV baseline data as final fallback
 *
 * Tracks extraction success rates per strategy for optimization.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONFIGS_DIR = path.join(DATA_DIR, 'camp-configs');
const EXTRACTION_LOG = path.join(DATA_DIR, 'extraction-log.json');

// URL patterns to try for each camp
const URL_PATTERNS = [
  '', // Base URL
  '/camps',
  '/summer-camps',
  '/summer',
  '/programs',
  '/summer-programs',
  '/youth-programs',
  '/education',
  '/learn/camps',
  '/programs/camps',
  '/about/camps'
];

/**
 * Generate alternate URLs to try
 */
export function generateAlternateUrls(baseUrl) {
  if (!baseUrl || baseUrl === 'N/A') return [];

  try {
    const url = new URL(baseUrl);
    const base = `${url.protocol}//${url.host}`;

    // Start with the original URL
    const urls = [baseUrl];

    // Add pattern variations
    for (const pattern of URL_PATTERNS) {
      const newUrl = base + pattern;
      if (!urls.includes(newUrl)) {
        urls.push(newUrl);
      }
    }

    // Add www variant if not present
    if (!url.host.startsWith('www.')) {
      const wwwBase = `${url.protocol}//www.${url.host}`;
      urls.push(wwwBase);
      urls.push(wwwBase + '/camps');
      urls.push(wwwBase + '/summer');
    }

    return urls.slice(0, 10); // Limit to 10 attempts
  } catch (e) {
    return [baseUrl];
  }
}

/**
 * Load extraction log to track what strategies work
 */
export async function loadExtractionLog() {
  try {
    const data = await fs.readFile(EXTRACTION_LOG, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {
      strategies: {},
      camps: {},
      lastUpdated: null
    };
  }
}

/**
 * Save extraction log
 */
export async function saveExtractionLog(log) {
  log.lastUpdated = new Date().toISOString();
  await fs.writeFile(EXTRACTION_LOG, JSON.stringify(log, null, 2));
}

/**
 * Record extraction attempt result
 */
export async function recordExtractionAttempt(log, campId, strategy, success, dataQuality = 0) {
  // Track per-strategy success rate
  if (!log.strategies[strategy]) {
    log.strategies[strategy] = { attempts: 0, successes: 0, avgQuality: 0 };
  }
  log.strategies[strategy].attempts++;
  if (success) {
    log.strategies[strategy].successes++;
    log.strategies[strategy].avgQuality =
      (log.strategies[strategy].avgQuality * (log.strategies[strategy].successes - 1) + dataQuality) /
      log.strategies[strategy].successes;
  }

  // Track per-camp results
  if (!log.camps[campId]) {
    log.camps[campId] = { attempts: [], bestStrategy: null, bestQuality: 0 };
  }
  log.camps[campId].attempts.push({
    strategy,
    success,
    dataQuality,
    timestamp: new Date().toISOString()
  });

  if (success && dataQuality > log.camps[campId].bestQuality) {
    log.camps[campId].bestStrategy = strategy;
    log.camps[campId].bestQuality = dataQuality;
  }

  await saveExtractionLog(log);
}

/**
 * Calculate data quality score (0-100) based on fields extracted
 */
export function calculateDataQuality(extracted) {
  if (!extracted) return 0;

  let score = 0;
  const weights = {
    pricing: 20,
    pricing_tiers: 20,
    hours: 15,
    has_extended_care: 10,
    extended_care: 10,
    sessions: 15,
    ages: 10,
    ageGroups: 10,
    activities: 10,
    programs: 10,
    registration: 5,
    contact: 5
  };

  for (const [field, weight] of Object.entries(weights)) {
    if (extracted[field] !== undefined && extracted[field] !== null) {
      if (Array.isArray(extracted[field]) && extracted[field].length > 0) {
        score += weight;
      } else if (typeof extracted[field] === 'object' && Object.keys(extracted[field]).length > 0) {
        score += weight;
      } else if (extracted[field]) {
        score += weight;
      }
    }
  }

  return Math.min(100, score);
}

/**
 * Load camp config if available
 */
export async function loadCampConfig(campId) {
  try {
    const configPath = path.join(CONFIGS_DIR, `${campId}.json`);
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * Generate extraction report
 */
export async function generateExtractionReport() {
  const log = await loadExtractionLog();

  console.log('\n=== EXTRACTION STRATEGY REPORT ===\n');

  // Strategy effectiveness
  console.log('Strategy Effectiveness:');
  const strategies = Object.entries(log.strategies)
    .sort((a, b) => (b[1].successes / b[1].attempts) - (a[1].successes / a[1].attempts));

  for (const [strategy, stats] of strategies) {
    const rate = ((stats.successes / stats.attempts) * 100).toFixed(1);
    console.log(`  ${strategy}: ${rate}% success (${stats.successes}/${stats.attempts}), avg quality: ${stats.avgQuality.toFixed(0)}`);
  }

  // Camps needing attention
  console.log('\nCamps Needing Manual Review:');
  const needsReview = Object.entries(log.camps)
    .filter(([_, data]) => data.bestQuality < 50)
    .sort((a, b) => a[1].bestQuality - b[1].bestQuality);

  for (const [campId, data] of needsReview.slice(0, 10)) {
    console.log(`  ${campId}: best quality ${data.bestQuality}, tried ${data.attempts.length} strategies`);
  }

  return log;
}

/**
 * Key fields we want to extract for each camp
 */
export const REQUIRED_FIELDS = [
  'pricing',           // Any pricing info
  'hours',             // Operating hours
  'extended_care',     // Before/after care
  'sessions',          // Session dates
  'ages',              // Age groups
  'activities',        // What they do
  'registration'       // How to sign up
];

/**
 * Prompt template for Claude session extraction
 */
export function generateExtractionPrompt(campName, pageContent, config = null) {
  let prompt = `Extract ALL summer camp information for "${campName}" from this content:

${pageContent}

`;

  if (config?.data_hints) {
    prompt += `\nHINTS from site mapping:\n${JSON.stringify(config.data_hints, null, 2)}\n`;
  }

  prompt += `
Return a JSON object with:
{
  "pricing": { any pricing tiers, rates, discounts found },
  "hours": { standard hours, drop-off, pick-up times },
  "extended_care": { available: true/false, hours, cost },
  "sessions": [{ name, dates, theme if any }],
  "ages": "age range or grades",
  "activities": ["list", "of", "activities"],
  "registration": { status, opens date, url },
  "confidence": 0-100
}

Extract EVERY number, date, time, and price mentioned. Be thorough.`;

  return prompt;
}

export default {
  generateAlternateUrls,
  loadExtractionLog,
  saveExtractionLog,
  recordExtractionAttempt,
  calculateDataQuality,
  loadCampConfig,
  generateExtractionReport,
  generateExtractionPrompt,
  REQUIRED_FIELDS
};
