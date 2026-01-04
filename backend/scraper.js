import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAMPS_FILE = path.join(DATA_DIR, 'camps.json');
const SCRAPE_LOG = path.join(DATA_DIR, 'scrape-log.json');
const CSV_FILE = path.join(DATA_DIR, 'summer-camps-2026-enhanced.csv');
const CACHE_FILE = path.join(DATA_DIR, 'scrape-cache.json');
const PDF_DIR = path.join(DATA_DIR, 'pdfs');

// Configuration
const CONFIG = {
  concurrency: 3,           // Number of parallel scrapers
  timeout: 25000,           // Page load timeout (ms)
  retries: 2,               // Retry attempts for failed scrapes
  retryDelay: 2000,         // Delay between retries (ms)
  politeDelay: 500,         // Delay between requests (ms)
  dynamicWait: 3000,        // Wait for dynamic content (ms)
  maxSubPages: 5,           // Maximum subpages to crawl per camp
  cacheMaxAge: 24 * 60 * 60 * 1000, // Cache valid for 24 hours
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Rate limiter with exponential backoff
class RateLimiter {
  constructor() {
    this.domainLastRequest = new Map();
    this.domainFailures = new Map();
  }

  async waitForDomain(url) {
    try {
      const domain = new URL(url).hostname;
      const lastRequest = this.domainLastRequest.get(domain) || 0;
      const failures = this.domainFailures.get(domain) || 0;

      // Exponential backoff: base delay * 2^failures (max 30s)
      const baseDelay = CONFIG.politeDelay;
      const backoffDelay = Math.min(baseDelay * Math.pow(2, failures), 30000);

      const elapsed = Date.now() - lastRequest;
      if (elapsed < backoffDelay) {
        await new Promise(r => setTimeout(r, backoffDelay - elapsed));
      }

      this.domainLastRequest.set(domain, Date.now());
    } catch (e) {
      // Invalid URL, proceed without delay
    }
  }

  recordSuccess(url) {
    try {
      const domain = new URL(url).hostname;
      this.domainFailures.set(domain, 0);
    } catch (e) {}
  }

  recordFailure(url) {
    try {
      const domain = new URL(url).hostname;
      const failures = this.domainFailures.get(domain) || 0;
      this.domainFailures.set(domain, Math.min(failures + 1, 5));
    } catch (e) {}
  }
}

const rateLimiter = new RateLimiter();

// Simple cache for avoiding re-scraping unchanged pages
class ScrapeCache {
  constructor() {
    this.cache = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    try {
      const data = await fs.readFile(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      this.cache = new Map(Object.entries(parsed));
      this.loaded = true;
      console.log(`  Loaded ${this.cache.size} cached entries`);
    } catch (e) {
      this.cache = new Map();
      this.loaded = true;
    }
  }

  async save() {
    const obj = Object.fromEntries(this.cache);
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj, null, 2));
  }

  getHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  isValid(campId, contentHash) {
    const entry = this.cache.get(campId);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > CONFIG.cacheMaxAge) return false;

    return entry.hash === contentHash;
  }

  getCached(campId) {
    const entry = this.cache.get(campId);
    if (entry && Date.now() - entry.timestamp < CONFIG.cacheMaxAge) {
      return entry.data;
    }
    return null;
  }

  set(campId, contentHash, data) {
    this.cache.set(campId, {
      hash: contentHash,
      timestamp: Date.now(),
      data
    });
  }
}

const scrapeCache = new ScrapeCache();

// Keywords for finding relevant subpages
const SUBPAGE_KEYWORDS = [
  'faq', 'frequently', 'questions',
  'policy', 'policies', 'refund', 'cancel',
  'register', 'registration', 'enroll', 'sign-up', 'signup',
  'schedule', 'sessions', 'dates', 'calendar',
  'pricing', 'rates', 'tuition', 'fees', 'cost',
  'about', 'info', 'information',
  'parent', 'handbook', 'guide',
  'contact', 'email', 'phone',  // Contact pages
  'programs', 'camps', 'summer'  // Program pages
];

// Find PDF links (handbooks, registration forms, schedules)
async function findPDFLinks(page) {
  return await page.evaluate(() => {
    const pdfLinks = [];
    const links = document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"]');

    for (const link of links) {
      const href = link.href;
      const text = (link.textContent || '').trim().toLowerCase();

      // Categorize the PDF
      let type = 'other';
      if (/handbook|parent|guide|manual/i.test(text) || /handbook|parent|guide/i.test(href)) {
        type = 'handbook';
      } else if (/schedule|calendar|dates/i.test(text) || /schedule|calendar/i.test(href)) {
        type = 'schedule';
      } else if (/registration|form|application/i.test(text) || /registration|form/i.test(href)) {
        type = 'registration';
      } else if (/policy|waiver|agreement/i.test(text) || /policy|waiver/i.test(href)) {
        type = 'policy';
      } else if (/packing|supply|list/i.test(text)) {
        type = 'packing-list';
      }

      pdfLinks.push({
        url: href,
        text: link.textContent?.trim().substring(0, 50) || '',
        type
      });
    }

    return pdfLinks;
  });
}

// Extract image alt text for activity clues
async function extractImageInfo(page) {
  return await page.evaluate(() => {
    const images = document.querySelectorAll('img[alt]');
    const activities = new Set();
    const facilities = new Set();

    const activityKeywords = {
      'swim': 'swimming', 'pool': 'swimming', 'water': 'water activities',
      'art': 'arts & crafts', 'paint': 'painting', 'craft': 'crafts',
      'climb': 'climbing', 'rope': 'ropes course', 'zip': 'zipline',
      'horse': 'horseback riding', 'archery': 'archery', 'bow': 'archery',
      'kayak': 'kayaking', 'canoe': 'canoeing', 'paddle': 'paddleboarding',
      'surf': 'surfing', 'beach': 'beach activities',
      'hike': 'hiking', 'nature': 'nature exploration', 'trail': 'hiking',
      'music': 'music', 'dance': 'dance', 'theater': 'theater', 'drama': 'drama',
      'science': 'science', 'stem': 'STEM', 'robot': 'robotics', 'code': 'coding',
      'sport': 'sports', 'soccer': 'soccer', 'basketball': 'basketball',
      'tennis': 'tennis', 'volleyball': 'volleyball',
      'camp': 'camping', 'tent': 'overnight camping', 'fire': 'campfire'
    };

    const facilityKeywords = {
      'gym': 'gymnasium', 'field': 'sports field', 'court': 'courts',
      'lake': 'lake access', 'cabin': 'cabins', 'lodge': 'lodge',
      'playground': 'playground', 'dining': 'dining hall'
    };

    for (const img of images) {
      const alt = (img.alt || '').toLowerCase();

      for (const [keyword, activity] of Object.entries(activityKeywords)) {
        if (alt.includes(keyword)) {
          activities.add(activity);
        }
      }

      for (const [keyword, facility] of Object.entries(facilityKeywords)) {
        if (alt.includes(keyword)) {
          facilities.add(facility);
        }
      }
    }

    return {
      activities: Array.from(activities),
      facilities: Array.from(facilities)
    };
  });
}

// Try to fetch and parse sitemap.xml for better page discovery
async function fetchSitemap(baseUrl) {
  const pages = [];
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': CONFIG.userAgent },
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const text = await response.text();
      // Simple regex extraction of URLs from sitemap
      const urlMatches = text.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const match of urlMatches) {
        const url = match[1];
        // Filter for camp-related pages
        if (/camp|summer|program|session|register|schedule|faq|policy/i.test(url)) {
          pages.push(url);
        }
      }
    }
  } catch (e) {
    // Sitemap not available, continue without it
  }
  return pages.slice(0, 10); // Limit to 10 pages
}

// Extract waitlist/availability status
function extractAvailabilityStatus(text) {
  const status = {
    isOpen: false,
    hasWaitlist: false,
    soldOutSessions: [],
    availableSessions: [],
    openingDate: null
  };

  // Registration open patterns
  if (/register\s*now|registration\s*open|sign\s*up\s*today|enroll\s*now|book\s*now/i.test(text)) {
    status.isOpen = true;
  }

  // Waitlist patterns
  if (/waitlist|wait\s*list|waiting\s*list/i.test(text)) {
    status.hasWaitlist = true;
  }

  // Sold out patterns
  const soldOutPatterns = [
    /(?:session|week)\s*(\d+)[^.]*(?:sold\s*out|full|closed)/gi,
    /(?:sold\s*out|full|closed)[^.]*(?:session|week)\s*(\d+)/gi
  ];
  for (const pattern of soldOutPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      status.soldOutSessions.push(`Session ${match[1]}`);
    }
  }

  // Available sessions
  const availablePatterns = [
    /(?:session|week)\s*(\d+)[^.]*(?:available|spots?\s*(?:left|remaining)|openings?)/gi,
    /(\d+)\s*spots?\s*(?:left|remaining|available)/gi
  ];
  for (const pattern of availablePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      status.availableSessions.push(match[0].substring(0, 50));
    }
  }

  // Registration opening date
  const openingPatterns = [
    /registration\s*(?:opens?|begins?|starts?)[:\s]*([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:opens?|begins?)\s*([A-Za-z]+\s+\d{1,2}(?:,?\s*2026)?)/i
  ];
  for (const pattern of openingPatterns) {
    const match = text.match(pattern);
    if (match) {
      status.openingDate = match[1];
      break;
    }
  }

  return status;
}

// Extract social media links
async function extractSocialMedia(page) {
  return await page.evaluate(() => {
    const social = {};
    const links = document.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.href.toLowerCase();
      if (href.includes('facebook.com')) social.facebook = link.href;
      else if (href.includes('instagram.com')) social.instagram = link.href;
      else if (href.includes('twitter.com') || href.includes('x.com')) social.twitter = link.href;
      else if (href.includes('youtube.com')) social.youtube = link.href;
      else if (href.includes('tiktok.com')) social.tiktok = link.href;
      else if (href.includes('yelp.com')) social.yelp = link.href;
    }

    return social;
  });
}

// Extract reviews/testimonials
function extractTestimonials(text) {
  const testimonials = [];

  // Look for quoted text that seems like reviews
  const quotePatterns = [
    /"([^"]{50,300})"/g,
    /'([^']{50,300})'/g,
    /[""]([^""]{50,300})[""]"/g
  ];

  for (const pattern of quotePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const quote = match[1].trim();
      // Filter for camp-related testimonials
      if (/camp|kid|child|summer|love|amazing|great|fun|recommend/i.test(quote)) {
        testimonials.push(quote.substring(0, 200));
      }
    }
  }

  return testimonials.slice(0, 3); // Limit to 3 testimonials
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Load existing camp data from enhanced CSV
async function loadCampsFromCSV() {
  const content = await fs.readFile(CSV_FILE, 'utf-8');
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);

  const camps = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const camp = {};
    headers.forEach((header, idx) => {
      camp[header.toLowerCase().replace(/[\s\/]/g, '_')] = values[idx] || '';
    });

    // Normalize the website field
    if (camp.website && camp.website !== 'N/A' && !camp.website.startsWith('http')) {
      camp.website_url = `https://${camp.website}`;
    } else {
      camp.website_url = camp.website;
    }

    // Add unique ID
    camp.id = camp.camp_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    camps.push(camp);
  }

  return camps;
}

// Find relevant subpage links on the main page
async function findRelevantSubpages(page, baseUrl) {
  const links = await page.evaluate((keywords) => {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const relevantLinks = [];

    for (const link of allLinks) {
      const href = link.href;
      const text = (link.textContent || '').toLowerCase();
      const hrefLower = href.toLowerCase();

      // Skip external links, anchors, and non-http links
      if (!href.startsWith('http') || href.includes('#') ||
          href.includes('mailto:') || href.includes('tel:')) {
        continue;
      }

      // Check if link matches any keyword
      const matches = keywords.some(kw =>
        text.includes(kw) || hrefLower.includes(kw)
      );

      if (matches && !relevantLinks.some(r => r.href === href)) {
        relevantLinks.push({
          href,
          text: link.textContent?.trim().substring(0, 50) || '',
          type: keywords.find(kw => text.includes(kw) || hrefLower.includes(kw)) || 'other'
        });
      }
    }

    return relevantLinks;
  }, SUBPAGE_KEYWORDS);

  // Filter to same domain
  const baseDomain = new URL(baseUrl).hostname.replace('www.', '');
  return links.filter(link => {
    try {
      const linkDomain = new URL(link.href).hostname.replace('www.', '');
      return linkDomain.includes(baseDomain) || baseDomain.includes(linkDomain);
    } catch {
      return false;
    }
  }).slice(0, CONFIG.maxSubPages);
}

// Extract structured data (JSON-LD, microdata, tables)
async function extractStructuredData(page) {
  return await page.evaluate(() => {
    const data = {
      jsonLd: [],
      tables: [],
      lists: [],
      metaData: {}
    };

    // Extract JSON-LD schemas (rich data often used for events/camps)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        data.jsonLd.push(parsed);
      } catch (e) {}
    }

    // Extract meta tags
    const metaTags = document.querySelectorAll('meta[name], meta[property]');
    for (const meta of metaTags) {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        data.metaData[name] = content;
      }
    }

    // Extract tables (often contain schedules, pricing)
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const tableData = {
        headers: [],
        rows: []
      };

      const headerCells = table.querySelectorAll('th');
      tableData.headers = Array.from(headerCells).map(th => th.textContent?.trim());

      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          tableData.rows.push(Array.from(cells).map(td => td.textContent?.trim()));
        }
      }

      if (tableData.rows.length > 0) {
        data.tables.push(tableData);
      }
    }

    // Extract definition lists (often used for camp details)
    const dlLists = document.querySelectorAll('dl');
    for (const dl of dlLists) {
      const items = {};
      const dts = dl.querySelectorAll('dt');
      for (const dt of dts) {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') {
          items[dt.textContent?.trim()] = dd.textContent?.trim();
        }
      }
      if (Object.keys(items).length > 0) {
        data.lists.push(items);
      }
    }

    return data;
  });
}

// Extract session schedules with dates and themes
function extractSessionSchedules(text, tables) {
  const sessions = [];

  // Pattern for session listings like "Session 1: June 16-20 - Art Week"
  const sessionPatterns = [
    /(?:session|week)\s*(\d+)[:\s-]*([A-Za-z]+)\s*(\d{1,2})\s*[-–to]\s*(?:([A-Za-z]+)\s*)?(\d{1,2})(?:[:\s-]*([^$\n]{3,50}))?/gi,
    /(June|July|August)\s*(\d{1,2})\s*[-–to]\s*(?:(June|July|August)\s*)?(\d{1,2})(?:\s*[-:]\s*)?([^$\n]{3,50})?/gi,
  ];

  for (const pattern of sessionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      sessions.push({
        raw: match[0].substring(0, 100),
        parsed: true
      });
    }
  }

  // Also extract from tables
  if (tables && tables.length > 0) {
    for (const table of tables) {
      const headers = table.headers.map(h => h?.toLowerCase() || '');
      const dateColIdx = headers.findIndex(h =>
        h.includes('date') || h.includes('week') || h.includes('session')
      );
      const themeColIdx = headers.findIndex(h =>
        h.includes('theme') || h.includes('topic') || h.includes('activity')
      );

      if (dateColIdx >= 0 || themeColIdx >= 0) {
        for (const row of table.rows) {
          if (row.length > Math.max(dateColIdx, themeColIdx)) {
            sessions.push({
              date: dateColIdx >= 0 ? row[dateColIdx] : null,
              theme: themeColIdx >= 0 ? row[themeColIdx] : null,
              fromTable: true
            });
          }
        }
      }
    }
  }

  return sessions.length > 0 ? sessions.slice(0, 20) : null;
}

// Extract pricing tiers (early bird, regular, late)
function extractPricingTiers(text) {
  const pricing = {
    earlyBird: null,
    regular: null,
    late: null,
    halfDay: null,
    fullDay: null,
    weekly: null,
    perSession: null
  };

  // Early bird pricing patterns (various formats)
  const earlyBirdPatterns = [
    /early[\s-]*(?:bird|registration)?[:\s-]*\$(\d{2,4})/i,
    /\$(\d{2,4})[^$\n]{0,30}early[\s-]*(?:bird|registration)/i,
    /early[\s-]*-?\s*\$(\d{2,4})/i
  ];
  for (const pattern of earlyBirdPatterns) {
    const match = text.match(pattern);
    if (match) {
      pricing.earlyBird = parseInt(match[1]);
      break;
    }
  }

  // Regular pricing patterns
  const regularPatterns = [
    /regular[\s-]*(?:price|rate|registration)?[:\s-]*\$(\d{2,4})/i,
    /standard[\s-]*(?:price|rate)?[:\s-]*\$(\d{2,4})/i,
    /\$(\d{2,4})[^$\n]{0,30}regular(?:\s*(?:price|rate))?/i,
    /regular\s*-?\s*\$(\d{2,4})/i
  ];
  for (const pattern of regularPatterns) {
    const match = text.match(pattern);
    if (match) {
      pricing.regular = parseInt(match[1]);
      break;
    }
  }

  // Late registration
  const lateMatch = text.match(/late(?:\s*registration)?[:\s]*\$(\d{2,4})/i);
  if (lateMatch) {
    pricing.late = parseInt(lateMatch[1]);
  }

  // Half day vs full day
  const halfDayMatch = text.match(/half[\s-]?day[:\s]*\$(\d{2,4})/i);
  const fullDayMatch = text.match(/full[\s-]?day[:\s]*\$(\d{2,4})/i);
  if (halfDayMatch) pricing.halfDay = parseInt(halfDayMatch[1]);
  if (fullDayMatch) pricing.fullDay = parseInt(fullDayMatch[1]);

  // Weekly rate
  const weeklyMatch = text.match(/\$(\d{2,4})\s*(?:\/|\s*per\s*)?\s*week/i);
  if (weeklyMatch) pricing.weekly = parseInt(weeklyMatch[1]);

  // Per session
  const sessionMatch = text.match(/\$(\d{2,4})\s*(?:\/|\s*per\s*)?\s*session/i);
  if (sessionMatch) pricing.perSession = parseInt(sessionMatch[1]);

  // If we found early bird but not regular, look for general price that's higher
  if (pricing.earlyBird && !pricing.regular) {
    const allPrices = text.match(/\$(\d{2,4})/g);
    if (allPrices) {
      const prices = allPrices.map(p => parseInt(p.replace('$', '')));
      const higherPrice = prices.find(p => p > pricing.earlyBird && p < pricing.earlyBird * 1.5);
      if (higherPrice) pricing.regular = higherPrice;
    }
  }

  return pricing;
}

// Extract staff to camper ratio
function extractStaffRatio(text) {
  const ratioPatterns = [
    /(?:staff|counselor|instructor)[:\s-]*(?:to[:\s-]*)?(?:camper|child|student)[:\s-]*ratio[:\s]*(\d{1,2})[:\s]*(?:to)?[:\s]*(\d{1,2})/i,
    /(\d{1,2})[:\s]*(?:to)?[:\s]*(\d{1,2})[:\s]*(?:staff|counselor)?[:\s-]*(?:to[:\s-]*)?(?:camper|child)/i,
    /ratio[:\s]*(\d{1,2})[:\s]*(?:to)?[:\s]*(\d{1,2})/i,
    /one\s*(?:staff|counselor|instructor)\s*(?:to|for\s*every)\s*(\d{1,2})\s*(?:camper|child|kid)/i
  ];

  for (const pattern of ratioPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1]}:${match[2]}`;
      } else {
        return `1:${match[1]}`;
      }
    }
  }

  // Look for descriptions
  if (/small\s*group/i.test(text)) return 'Small groups';
  if (/low\s*ratio/i.test(text)) return 'Low ratio';

  return null;
}

// Extract age groups with names
function extractAgeGroups(text) {
  const groups = [];

  // Words that indicate months/dates (not age groups)
  const dateWords = /^(january|february|march|april|may|june|july|august|september|october|november|december|session|week|day|pm|am|hours|image)$/i;

  // Patterns for named age groups like "Blue Crew: ages 5-6"
  const groupPatterns = [
    /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*[:\s]+\s*(?:ages?\s*)?(\d{1,2})\s*[-–to]\s*(\d{1,2})(?:\s*years?)?/gi,
  ];

  for (const pattern of groupPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = (match[1] || '').trim().replace(/\n/g, ' ').trim();
      const minAge = parseInt(match[2]);
      const maxAge = parseInt(match[3]);

      // Validate: skip if name looks like a date, is too short, or ages are unrealistic
      if (!name || name.length < 3 || dateWords.test(name.split(/\s+/)[0])) continue;
      if (minAge > 18 || maxAge > 18 || minAge >= maxAge) continue;
      if (/^\d+$/.test(name)) continue; // Skip if name is just numbers

      // Avoid duplicates
      if (!groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        groups.push({ name, minAge, maxAge });
      }
    }
  }

  return groups.length > 0 ? groups.slice(0, 10) : null;
}

// Wait for dynamic content to load
async function waitForDynamicContent(page) {
  try {
    // Wait for network to be idle (no requests for 500ms)
    await page.waitForLoadState('networkidle', { timeout: CONFIG.dynamicWait });
  } catch (e) {
    // Continue even if networkidle times out
  }

  // Try to trigger lazy-loaded content by scrolling
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;

    // Scroll through page to trigger lazy loading
    for (let i = 0; i < scrollHeight; i += viewportHeight) {
      window.scrollTo(0, i);
      await new Promise(r => setTimeout(r, 100));
    }

    // Scroll back to top
    window.scrollTo(0, 0);
  });

  // Short wait for any triggered content
  await page.waitForTimeout(500);
}

// Click through tabs/accordions to reveal hidden content
async function expandDynamicContent(page) {
  try {
    // Click common tab/accordion patterns
    const expandSelectors = [
      '[role="tab"]:not([aria-selected="true"])',
      '.accordion-header:not(.active)',
      '.faq-question',
      '.toggle-content',
      'details:not([open]) > summary',
      '[data-toggle="collapse"]'
    ];

    for (const selector of expandSelectors) {
      const elements = await page.$$(selector);
      for (const el of elements.slice(0, 5)) { // Limit to first 5
        try {
          await el.click();
          await page.waitForTimeout(200);
        } catch (e) {}
      }
    }
  } catch (e) {}
}

// Extract cancellation/refund policy from page text
function extractCancellationPolicy(text) {
  const policies = [];

  const patterns = [
    // Full refund patterns
    /(?:full\s*refund|100%\s*refund)[^.]*?(?:\d+\s*(?:days?|weeks?|months?))[^.]*/gi,
    // Percentage refund patterns
    /\d+%\s*(?:refund|back)[^.]*/gi,
    // Days before patterns
    /\d+\+?\s*(?:days?|weeks?)\s*(?:prior|before|notice)[^.]*/gi,
    // No refund patterns
    /no\s*refund[^.]*/gi,
    // Cancellation fee patterns
    /(?:cancellation|processing)\s*fee[^.]*/gi,
    // Credit patterns
    /(?:credit|voucher)[^.]*(?:future|next)[^.]*/gi,
    // Medical/emergency patterns
    /(?:medical|illness|emergency)[^.]*(?:refund|credit)[^.]*/gi
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const policy = match[0].trim().substring(0, 150);
      if (policy.length > 10) {
        policies.push(policy);
      }
    }
  }

  const uniquePolicies = [...new Set(policies)].slice(0, 2);
  return uniquePolicies.length > 0 ? uniquePolicies.join('; ') : null;
}

// Extract food information from page text
function extractFoodInfo(text) {
  const foodInfo = {
    provided: null,
    details: null,
    cost: null
  };

  // Check if food is provided
  if (/lunch\s*(?:provided|included)|snacks?\s*(?:provided|included)|meals?\s*(?:provided|included)|hot\s*lunch/i.test(text)) {
    foodInfo.provided = true;

    // Try to find what food is provided
    const foodTypePatterns = [
      /(?:hot\s*)?lunch[^.]*(?:provided|included|served)[^.]*/i,
      /(?:morning\s*and\s*afternoon\s*)?snacks?[^.]*(?:provided|included)[^.]*/i,
      /breakfast[^.]*(?:provided|included)[^.]*/i,
      /meals?[^.]*include[^.]*/i
    ];

    for (const pattern of foodTypePatterns) {
      const match = text.match(pattern);
      if (match) {
        foodInfo.details = match[0].trim().substring(0, 100);
        break;
      }
    }

    // Check if food costs extra
    const foodCostMatch = text.match(/(?:lunch|meal|food)[^.]*\$(\d+)[^.]*/i);
    if (foodCostMatch) {
      foodInfo.cost = `$${foodCostMatch[1]}`;
    }
  } else if (/bring\s*(?:your\s*own\s*)?lunch|pack\s*(?:a\s*)?lunch|lunch\s*not\s*(?:provided|included)|bring\s*snacks/i.test(text)) {
    foodInfo.provided = false;
    foodInfo.details = 'Bring your own lunch';
  }

  // Check for optional lunch purchase
  const optionalLunchMatch = text.match(/(?:optional|available)[^.]*lunch[^.]*\$(\d+)/i);
  if (optionalLunchMatch) {
    foodInfo.optionalCost = `$${optionalLunchMatch[1]}/day`;
  }

  return foodInfo;
}

// Extract all camp information from page text and structured data
function extractCampInfo(text, html, existingCamp, structuredData = null) {
  const extracted = {};
  const tables = structuredData?.tables || [];

  // === PRICING (Enhanced with tiers) ===
  extracted.pricing_tiers = extractPricingTiers(text);

  // Also keep simple price patterns as fallback
  const pricePatterns = [
    /\$(\d{1,4}(?:,\d{3})?(?:\s*[-–—]\s*\$?\d{1,4}(?:,\d{3})?)?)\s*(?:per\s*week|\/week|weekly|\/wk)/i,
    /(?:price|cost|tuition|fee|rate)[:\s]*\$(\d{1,4}(?:,\d{3})?(?:\s*[-–—]\s*\$?\d{1,4}(?:,\d{3})?)?)/i,
    /\$(\d{2,4})\s*(?:full|half)[\s-]?day/i,
    /(?:weekly\s*(?:rate|fee|tuition))[:\s]*\$(\d{2,4})/i,
    /\$(\d{2,4})\s*(?:\/|per)\s*(?:day|session|week)/i,
    /(?:camp|session|week)\s*(?:is|costs?|:)\s*\$(\d{2,4})/i,
    /(?:starting\s*(?:at|from)|from)\s*\$(\d{2,4})/i,
    /\$(\d{2,4})\s*[-–—]\s*\$(\d{2,4})/,  // Price range like "$300 - $500"
    /Price[:\s]*\$(\d{2,4})/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.price_found = match[0];
      const prices = match[0].match(/\$?(\d{2,4}(?:,\d{3})?)/g);
      if (prices) {
        const numPrices = prices.map(p => parseInt(p.replace(/[$,]/g, ''))).filter(p => p >= 50 && p <= 5000);
        if (numPrices.length > 0) {
          extracted.price_min = Math.min(...numPrices);
          extracted.price_max = Math.max(...numPrices);
        }
      }
      break;
    }
  }

  // === AGES (Enhanced with named groups) ===
  extracted.age_groups = extractAgeGroups(text);

  const agePatterns = [
    /ages?\s*(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2})/i,
    /(?:grades?|gr\.?)\s*(K|TK|PK|\d{1,2})\s*(?:to|[-–—]|through)\s*(K|TK|\d{1,2})/i,
    /(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2})\s*years?\s*old/i,
    /for\s*(?:ages?|children|kids?)\s*(\d{1,2})\s*(?:to|[-–—]|and\s*(?:up|older))/i,
    /(?:children|kids?|campers?)\s*(?:ages?)?\s*(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2})/i,
    /(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(?:yrs?|years?)/i,
    /(?:preschool|pre-k|prek).*?(\d{1,2})/i,  // Preschool programs
    /(?:entering|rising)\s*(?:grades?|gr\.?)\s*(K|\d{1,2})/i,
    /\b(\d{1,2})\s*(?:and\s*)?(?:up|older|\+)\b/i,  // "5 and up", "5+"
  ];

  for (const pattern of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.ages_found = match[0];
      // Parse min/max ages
      const ages = match[0].match(/\d+/g);
      if (ages && ages.length >= 2) {
        extracted.min_age = parseInt(ages[0]);
        extracted.max_age = parseInt(ages[1]);
      } else if (ages && ages.length === 1) {
        // Single age like "5 and up"
        extracted.min_age = parseInt(ages[0]);
        if (/up|older|\+/i.test(match[0])) {
          extracted.max_age = 18; // Assume up to 18
        }
      }
      break;
    }
  }

  // === HOURS (Enhanced with drop-off/pick-up windows) ===
  const hoursPatterns = [
    /(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?))\s*(?:to|[-–—])\s*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.?))/i,
    /(?:camp\s*)?hours?[:\s]*(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?))\s*(?:to|[-–—])\s*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.?))/i,
    /(?:drop[\s-]?off|check[\s-]?in)[:\s]*(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?))/i,
    /(\d{1,2}:\d{2})\s*(?:am|a\.?m\.?)\s*[-–—to]+\s*(\d{1,2}:\d{2})\s*(?:pm|p\.?m\.?)/i,
    /(?:daily|program|session)\s*(?:hours?)?[:\s]*(\d{1,2}(?::\d{2})?)\s*(?:am|a\.?m\.?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?)\s*(?:pm|p\.?m\.?)/i,
    /(\d{1,2})\s*(?:am|a\.?m\.?)\s*[-–—]\s*(\d{1,2})\s*(?:pm|p\.?m\.?)/i,  // "9am - 3pm" format
    /(?:time|schedule)[:\s]*(\d{1,2}(?::\d{2})?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?)/i,
  ];

  for (const pattern of hoursPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.hours_found = match[0];
      break;
    }
  }

  // Specific drop-off/pick-up times
  const dropOffMatch = text.match(/drop[\s-]?off[:\s]*(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.)?)\s*[-–to]*\s*(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.)?)?/i);
  const pickUpMatch = text.match(/pick[\s-]?up[:\s]*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.)?)\s*[-–to]*\s*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.)?)?/i);
  if (dropOffMatch) extracted.drop_off_window = dropOffMatch[0];
  if (pickUpMatch) extracted.pick_up_window = pickUpMatch[0];

  // === REGISTRATION ===
  const regPatterns = [
    /registration\s*(?:opens?|begins?|starts?)[:\s]*([A-Za-z]+\s*\d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:opens?|begins?|starts?)\s*([A-Za-z]+\s*\d{1,2}(?:,?\s*2026)?)/i,
    /(?:sign[\s-]?up|register)\s*(?:now|today|online)/i,
    /2026\s*registration/i
  ];

  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.registration_found = match[0];
      break;
    }
  }

  // === SESSION SCHEDULES (NEW) ===
  extracted.sessions = extractSessionSchedules(text, tables);

  // === STAFF RATIO (NEW) ===
  extracted.staff_ratio = extractStaffRatio(text);

  // === CANCELLATION POLICY ===
  extracted.cancellation_policy = extractCancellationPolicy(text);

  // === FOOD INFORMATION ===
  extracted.food_info = extractFoodInfo(text);

  // === EXTENDED CARE ===
  if (/extended\s*(?:care|day)|before[\s-]?care|after[\s-]?care|early\s*drop|late\s*pick/i.test(text)) {
    extracted.has_extended_care = true;
    const ecCostMatch = text.match(/(?:extended|before|after)[\s-]?care[:\s]*\$(\d+)/i) ||
                        text.match(/early\s*(?:drop[\s-]?off|bird)[:\s]*\$(\d+)/i) ||
                        text.match(/late\s*pick[\s-]?up[:\s]*\$(\d+)/i);
    if (ecCostMatch) {
      extracted.extended_care_cost = `$${ecCostMatch[1]}`;
    }

    // Also check for extended care hours
    const ecHoursMatch = text.match(/(?:extended|before|after)[\s-]?care[:\s]*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–to]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (ecHoursMatch) {
      extracted.extended_care_hours = ecHoursMatch[0];
    }
  }

  // === DISCOUNTS ===
  // Sibling discount
  if (/sibling\s*discount|multi[\s-]?child\s*discount|family\s*discount/i.test(text)) {
    extracted.has_sibling_discount = true;
    const siblingMatch = text.match(/sibling[:\s]*\$?(\d+)(?:\s*(?:off|discount))?/i) ||
                         text.match(/\$(\d+)\s*(?:off|discount)[^.]*sibling/i);
    if (siblingMatch) {
      extracted.sibling_discount_amount = `$${siblingMatch[1]} off`;
    }
  }

  // Multi-week discount
  if (/multi[\s-]?week\s*discount|weekly\s*discount|book\s*multiple/i.test(text)) {
    extracted.has_multiweek_discount = true;
    const multiWeekMatch = text.match(/multi[\s-]?week[:\s]*(\d+)%/i);
    if (multiWeekMatch) {
      extracted.multiweek_discount = `${multiWeekMatch[1]}% off`;
    }
  }

  // Early registration discount
  if (/early\s*(?:registration|bird)\s*(?:discount|savings?|special)/i.test(text)) {
    extracted.has_early_bird_discount = true;
    const earlyMatch = text.match(/early\s*(?:bird|registration)[:\s]*(?:save\s*)?\$?(\d+)/i);
    if (earlyMatch) {
      extracted.early_bird_savings = `$${earlyMatch[1]} off`;
    }
  }

  // === TRANSPORTATION ===
  if (/(?:bus|van|shuttle)\s*(?:service|transport|available)|pick[\s-]?up\s*(?:service|available)/i.test(text)) {
    extracted.has_transport = true;
    const transportCostMatch = text.match(/(?:bus|van|shuttle|transport)[:\s]*\$(\d+)/i);
    if (transportCostMatch) {
      extracted.transport_cost = `$${transportCostMatch[1]}`;
    }
  }

  // === SCHOLARSHIPS ===
  if (/scholarship|financial\s*(?:aid|assistance)|sliding\s*scale|need[\s-]?based/i.test(text)) {
    extracted.has_scholarships = true;
    // Try to find scholarship amount or percentage
    const scholarshipMatch = text.match(/scholarship[:\s]+(?:up\s*to\s*)?\$?(\d+)/i);
    if (scholarshipMatch) {
      extracted.scholarship_info = `Up to $${scholarshipMatch[1]}`;
    }
  }

  // === CERTIFICATIONS & QUALIFICATIONS ===
  const certPatterns = [
    /(?:CPR|first\s*aid)\s*(?:certified|trained)/gi,
    /(?:lifeguard|water\s*safety)\s*(?:certified|on[\s-]?site)/gi,
    /(?:ACA|American\s*Camp\s*Association)\s*(?:accredited|certified)/gi,
    /background\s*check(?:ed)?/gi,
    /(?:licensed|certified)\s*(?:teachers?|instructors?)/gi
  ];

  const certs = [];
  for (const pattern of certPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      certs.push(...matches.map(m => m.trim()));
    }
  }
  if (certs.length > 0) {
    extracted.certifications = [...new Set(certs)].slice(0, 5);
  }

  // === CONTACT INFORMATION ===
  // Find all emails and pick the most relevant one
  const allEmails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  if (allEmails.length > 0) {
    // Prefer camp-related emails over generic ones
    const campEmail = allEmails.find(e =>
      /camp|summer|info|contact|register|enroll|admin/i.test(e) &&
      !/unsubscribe|noreply|no-reply|privacy|support@google|support@facebook/i.test(e)
    );
    extracted.email_found = campEmail || allEmails.find(e =>
      !/unsubscribe|noreply|no-reply|privacy|support@google|support@facebook/i.test(e)
    ) || allEmails[0];
  }

  // Enhanced phone patterns
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
    /(?:phone|tel|call)[:\s]*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/i,
  ];
  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      extracted.phone_found = phoneMatch[0].replace(/(?:phone|tel|call)[:\s]*/i, '');
      break;
    }
  }

  // === ACTIVITIES & SPECIALTIES ===
  const activityKeywords = [
    'swimming', 'surfing', 'kayaking', 'paddleboard',
    'art', 'painting', 'pottery', 'crafts',
    'science', 'STEM', 'robotics', 'coding', 'engineering',
    'sports', 'soccer', 'basketball', 'tennis',
    'theater', 'drama', 'music', 'dance',
    'nature', 'hiking', 'camping', 'wildlife',
    'horseback', 'equestrian',
    'archery', 'climbing', 'ropes course'
  ];

  const foundActivities = activityKeywords.filter(activity =>
    new RegExp(activity, 'i').test(text)
  );
  if (foundActivities.length > 0) {
    extracted.activities = foundActivities;
  }

  // === WHAT TO BRING / PACKING LIST ===
  if (/what\s*to\s*bring|packing\s*list|items?\s*to\s*bring/i.test(text)) {
    extracted.has_packing_list = true;
  }

  // === SPECIAL NEEDS / ACCOMMODATIONS ===
  if (/special\s*needs|accommodations?|inclusive|accessibility/i.test(text)) {
    extracted.special_needs_friendly = true;
  }

  // === AVAILABILITY STATUS (NEW) ===
  extracted.availability = extractAvailabilityStatus(text);

  // === TESTIMONIALS (NEW) ===
  extracted.testimonials = extractTestimonials(text);

  // === SAFETY/MEDICAL INFO ===
  if (/nurse\s*on[\s-]?site|medical\s*staff|health\s*center/i.test(text)) {
    extracted.has_medical_staff = true;
  }
  if (/allergy|allergies|dietary\s*(?:restrictions?|needs?)/i.test(text)) {
    extracted.handles_allergies = true;
  }

  // === COVID/HEALTH PROTOCOLS ===
  if (/covid|health\s*protocols?|vaccination|mask/i.test(text)) {
    extracted.has_health_protocols = true;
  }

  // === OUTDOOR vs INDOOR ===
  if (/outdoor|outside|nature|wilderness/i.test(text) && !/indoor/i.test(text)) {
    extracted.setting = 'Outdoor';
  } else if (/indoor|inside|air[\s-]?condition/i.test(text) && !/outdoor/i.test(text)) {
    extracted.setting = 'Indoor';
  } else if (/indoor/i.test(text) && /outdoor/i.test(text)) {
    extracted.setting = 'Both';
  }

  // === CAMP SIZE/CAPACITY ===
  const capacityMatch = text.match(/(?:limited\s*to|maximum|capacity|up\s*to)\s*(\d{2,3})\s*(?:camper|kid|child)/i);
  if (capacityMatch) {
    extracted.max_capacity = parseInt(capacityMatch[1]);
  }

  return extracted;
}

// Scrape a single camp website with retry logic and multi-page crawling
async function scrapeCamp(browser, camp, retryCount = 0, options = {}) {
  const { useCache = true, forceFresh = false } = options;

  if (!camp.website_url || camp.website_url === 'N/A' || camp.website_url.includes('CLOSED')) {
    return { ...camp, scrape_status: 'skipped', scrape_reason: 'No valid URL' };
  }

  // Check cache first (unless forcing fresh scrape)
  if (useCache && !forceFresh) {
    const cached = scrapeCache.getCached(camp.id);
    if (cached) {
      console.log(`  [CACHED] ${camp.camp_name}`);
      return { ...camp, ...cached, scrape_status: 'cached' };
    }
  }

  // Rate limiting
  await rateLimiter.waitForDomain(camp.website_url);

  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  const scrapedData = {
    scrape_timestamp: new Date().toISOString(),
    scrape_status: 'pending',
    pages_scraped: [],
    pdf_links: [],
    social_media: {}
  };

  try {
    console.log(`  Scraping: ${camp.camp_name}`);

    // === TRY SITEMAP FIRST (for additional pages) ===
    const sitemapPages = await fetchSitemap(camp.website_url);
    if (sitemapPages.length > 0) {
      console.log(`    Found ${sitemapPages.length} pages from sitemap`);
    }

    // === MAIN PAGE ===
    await page.goto(camp.website_url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout
    });

    // Wait for dynamic content
    await waitForDynamicContent(page);

    // Try to expand tabs/accordions
    await expandDynamicContent(page);

    // Gather all content from main page
    let allText = await page.evaluate(() => document.body.innerText);
    const pageHtml = await page.evaluate(() => document.body.innerHTML);
    scrapedData.page_title = await page.title();
    scrapedData.pages_scraped.push({ url: camp.website_url, type: 'main' });

    // Extract structured data (JSON-LD, tables, meta)
    const structuredData = await extractStructuredData(page);
    scrapedData.structured_data = structuredData;

    // === EXTRACT PDF LINKS (NEW) ===
    const pdfLinks = await findPDFLinks(page);
    if (pdfLinks.length > 0) {
      scrapedData.pdf_links = pdfLinks;
      console.log(`    Found ${pdfLinks.length} PDF documents`);
    }

    // === EXTRACT IMAGE ALT TEXT (NEW) ===
    const imageInfo = await extractImageInfo(page);
    if (imageInfo.activities.length > 0 || imageInfo.facilities.length > 0) {
      scrapedData.image_detected = imageInfo;
    }

    // === EXTRACT SOCIAL MEDIA LINKS (NEW) ===
    scrapedData.social_media = await extractSocialMedia(page);

    // === MULTI-PAGE CRAWLING ===
    const subpages = await findRelevantSubpages(page, camp.website_url);

    // Merge sitemap pages with discovered subpages (deduplicate)
    const allSubpageUrls = new Set(subpages.map(s => s.href));
    for (const sitemapUrl of sitemapPages) {
      if (!allSubpageUrls.has(sitemapUrl)) {
        subpages.push({ href: sitemapUrl, text: '', type: 'sitemap' });
        allSubpageUrls.add(sitemapUrl);
      }
    }

    console.log(`    Found ${subpages.length} relevant subpages`);

    for (const subpage of subpages.slice(0, CONFIG.maxSubPages)) {
      try {
        console.log(`      → ${subpage.type}: ${subpage.text || subpage.href.substring(0, 50)}`);

        // Rate limit between subpages too
        await rateLimiter.waitForDomain(subpage.href);

        await page.goto(subpage.href, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.timeout
        });

        await page.waitForTimeout(1000);

        // Expand any accordions/FAQs on subpage
        await expandDynamicContent(page);

        const subpageText = await page.evaluate(() => document.body.innerText);
        allText += '\n\n--- ' + subpage.type.toUpperCase() + ' PAGE ---\n\n' + subpageText;

        // Get structured data from subpage too
        const subStructured = await extractStructuredData(page);
        if (subStructured.tables.length > 0) {
          structuredData.tables.push(...subStructured.tables);
        }

        // Check for additional PDFs on subpages
        const subPdfs = await findPDFLinks(page);
        for (const pdf of subPdfs) {
          if (!scrapedData.pdf_links.some(p => p.url === pdf.url)) {
            scrapedData.pdf_links.push(pdf);
          }
        }

        scrapedData.pages_scraped.push({
          url: subpage.href,
          type: subpage.type,
          title: await page.title()
        });

      } catch (subError) {
        console.log(`      ⚠ Subpage error: ${subError.message.substring(0, 50)}`);
      }
    }

    // === EXTRACT ALL INFORMATION ===
    scrapedData.extracted = extractCampInfo(allText, pageHtml, camp, structuredData);
    scrapedData.scrape_status = 'success';

    // Merge image-detected activities with text-detected activities
    if (scrapedData.image_detected?.activities) {
      const textActivities = scrapedData.extracted.activities || [];
      const imageActivities = scrapedData.image_detected.activities;
      scrapedData.extracted.activities = [...new Set([...textActivities, ...imageActivities])];
    }

    // Quick indicators
    scrapedData.has_registration_open = /register|sign up|enroll|book now/i.test(allText);
    scrapedData.has_pricing = /\$\d+/.test(allText);
    scrapedData.has_2026 = /2026/.test(allText);
    scrapedData.has_summer = /summer/i.test(allText);

    // Text length for debugging
    scrapedData.total_text_length = allText.length;

    // Content hash for caching
    const contentHash = scrapeCache.getHash(allText);
    scrapedData.content_hash = contentHash;

    // Record success for rate limiter
    rateLimiter.recordSuccess(camp.website_url);

    // Cache the results
    if (useCache) {
      scrapeCache.set(camp.id, contentHash, scrapedData);
    }

  } catch (error) {
    rateLimiter.recordFailure(camp.website_url);

    if (retryCount < CONFIG.retries) {
      console.log(`    Retry ${retryCount + 1}/${CONFIG.retries} for ${camp.camp_name}`);
      await page.close();
      await context.close();
      await new Promise(r => setTimeout(r, CONFIG.retryDelay));
      return scrapeCamp(browser, camp, retryCount + 1, options);
    }

    scrapedData.scrape_status = 'error';
    scrapedData.scrape_error = error.message;
    console.error(`    Error: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }

  return { ...camp, ...scrapedData };
}

// Process camps in parallel batches
async function processCampsInParallel(browser, camps, concurrency, options = {}) {
  const results = [];
  const queue = [...camps];
  const inProgress = new Set();

  const scrapeLog = {
    started_at: new Date().toISOString(),
    total_camps: camps.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    cached: 0,
    details: []
  };

  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0 && inProgress.size === 0) {
        scrapeLog.completed_at = new Date().toISOString();
        scrapeLog.duration_seconds = (new Date(scrapeLog.completed_at) - new Date(scrapeLog.started_at)) / 1000;
        resolve({ results, scrapeLog });
        return;
      }

      while (inProgress.size < concurrency && queue.length > 0) {
        const camp = queue.shift();
        inProgress.add(camp.id);

        scrapeCamp(browser, camp, 0, options)
          .then(result => {
            results.push(result);
            inProgress.delete(camp.id);

            if (result.scrape_status === 'success') {
              scrapeLog.successful++;
            } else if (result.scrape_status === 'cached') {
              scrapeLog.cached++;
            } else if (result.scrape_status === 'error') {
              scrapeLog.failed++;
            } else {
              scrapeLog.skipped++;
            }

            scrapeLog.details.push({
              camp: camp.camp_name,
              status: result.scrape_status,
              error: result.scrape_error,
              extracted: result.extracted ? Object.keys(result.extracted) : []
            });

            const completed = scrapeLog.successful + scrapeLog.failed + scrapeLog.skipped;
            console.log(`  Progress: ${completed}/${camps.length} (${Math.round(completed/camps.length*100)}%)`);

            setTimeout(processNext, CONFIG.politeDelay);
          })
          .catch(err => {
            console.error(`Unexpected error scraping ${camp.camp_name}:`, err);
            inProgress.delete(camp.id);
            setTimeout(processNext, CONFIG.politeDelay);
          });
      }
    };

    processNext();
  });
}

// Main scraper function
async function runScraper(options = {}) {
  const { singleCamp, limit, concurrency = CONFIG.concurrency, forceFresh = false, noCache = false } = options;

  console.log('Starting optimized camp scraper...');
  console.log(`Concurrency: ${concurrency} parallel scrapers`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Cache: ${noCache ? 'disabled' : (forceFresh ? 'force refresh' : 'enabled')}`);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });

  // Load cache
  if (!noCache) {
    await scrapeCache.load();
  }

  let camps = await loadCampsFromCSV();
  console.log(`Loaded ${camps.length} camps from CSV`);

  if (singleCamp) {
    camps = camps.filter(c =>
      c.camp_name.toLowerCase().includes(singleCamp.toLowerCase()) ||
      c.id.includes(singleCamp.toLowerCase())
    );
    console.log(`Filtered to ${camps.length} matching camps`);
  }

  if (limit) {
    camps = camps.slice(0, limit);
    console.log(`Limited to ${camps.length} camps`);
  }

  const browser = await chromium.launch({
    headless: true
  });

  let results, scrapeLog;

  try {
    console.log(`\nScraping ${camps.length} camps...`);
    const scrapeOptions = { useCache: !noCache, forceFresh };
    ({ results, scrapeLog } = await processCampsInParallel(browser, camps, concurrency, scrapeOptions));
  } finally {
    await browser.close();
  }

  await fs.writeFile(CAMPS_FILE, JSON.stringify(results, null, 2));
  await fs.writeFile(SCRAPE_LOG, JSON.stringify(scrapeLog, null, 2));

  // Save cache
  if (!noCache) {
    await scrapeCache.save();
    console.log('  Cache saved');
  }

  console.log('\n--- Scrape Summary ---');
  console.log(`Total: ${scrapeLog.total_camps}`);
  console.log(`Successful: ${scrapeLog.successful}`);
  console.log(`Cached: ${scrapeLog.cached}`);
  console.log(`Failed: ${scrapeLog.failed}`);
  console.log(`Skipped: ${scrapeLog.skipped}`);
  console.log(`Duration: ${scrapeLog.duration_seconds.toFixed(1)}s`);
  console.log(`Results saved to: ${CAMPS_FILE}`);

  // Summary of extracted data
  const withPricing = results.filter(r => r.extracted?.pricing_tiers?.weekly || r.extracted?.price_min).length;
  const withPDFs = results.filter(r => r.pdf_links?.length > 0).length;
  const withSocial = results.filter(r => Object.keys(r.social_media || {}).length > 0).length;

  console.log('\n--- Data Quality ---');
  console.log(`With pricing: ${withPricing}/${results.length}`);
  console.log(`With PDFs: ${withPDFs}/${results.length}`);
  console.log(`With social media: ${withSocial}/${results.length}`);

  return { results, scrapeLog };
}

// CLI support
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Camp Scraper - Optimized web scraper for Santa Barbara summer camps

Usage:
  node scraper.js [options]

Options:
  --single <name>     Scrape only camps matching name
  --limit <n>         Limit to first n camps
  --concurrency <n>   Number of parallel scrapers (default: ${CONFIG.concurrency})
  --fresh             Force fresh scrape (ignore cache)
  --no-cache          Disable caching entirely
  --help              Show this help

Features:
  • Multi-page crawling (FAQ, policies, registration pages)
  • Sitemap.xml parsing for page discovery
  • PDF detection (handbooks, schedules, forms)
  • Image alt text analysis for activities
  • Social media link extraction
  • Rate limiting with exponential backoff
  • Smart caching (24-hour validity)
  • Structured data extraction (JSON-LD, tables)
  • Availability/waitlist status detection

Examples:
  node scraper.js                     # Scrape all camps (uses cache)
  node scraper.js --fresh             # Force fresh scrape of all camps
  node scraper.js --single "UCSB"     # Scrape only UCSB camps
  node scraper.js --limit 5           # Scrape first 5 camps
  node scraper.js --concurrency 5     # Use 5 parallel scrapers
`);
} else if (args.includes('--single')) {
  const idx = args.indexOf('--single');
  const campName = args[idx + 1];
  const forceFresh = args.includes('--fresh');
  const noCache = args.includes('--no-cache');
  runScraper({ singleCamp: campName, forceFresh, noCache }).catch(console.error);
} else if (args.includes('--limit')) {
  const idx = args.indexOf('--limit');
  const limit = parseInt(args[idx + 1]);
  const concurrencyIdx = args.indexOf('--concurrency');
  const concurrency = concurrencyIdx >= 0 ? parseInt(args[concurrencyIdx + 1]) : CONFIG.concurrency;
  const forceFresh = args.includes('--fresh');
  const noCache = args.includes('--no-cache');
  runScraper({ limit, concurrency, forceFresh, noCache }).catch(console.error);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const concurrencyIdx = args.indexOf('--concurrency');
  const concurrency = concurrencyIdx >= 0 ? parseInt(args[concurrencyIdx + 1]) : CONFIG.concurrency;
  const forceFresh = args.includes('--fresh');
  const noCache = args.includes('--no-cache');
  runScraper({ concurrency, forceFresh, noCache }).catch(console.error);
}

export { runScraper, loadCampsFromCSV };
