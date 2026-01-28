/**
 * Smart Camp Data Extractor
 *
 * Dramatically improves extraction quality by:
 * 1. Using better heuristics and patterns
 * 2. Extracting from structured data (JSON-LD, tables, meta)
 * 3. Finding the RIGHT pages (pricing, schedule, FAQ)
 * 4. Extracting from PDFs
 * 5. Normalizing and validating data
 */

import { chromium } from 'playwright';

/**
 * Smart page discovery - find the actual camp info pages
 */
export async function discoverCampPages(baseUrl, browser) {
  const pages = {
    main: baseUrl,
    pricing: null,
    schedule: null,
    faq: null,
    register: null,
    camps: null,
    pdfs: []
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait a bit for JS to add links
    await page.waitForTimeout(2000);

    // Find all links on the page
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map(a => ({
        href: a.href,
        text: a.innerText.toLowerCase().trim(),
        ariaLabel: (a.getAttribute('aria-label') || '').toLowerCase()
      })).filter(l => l.href && l.href.startsWith('http'));
    });

    // Expanded keywords for better discovery
    const keywords = {
      pricing: [
        'price', 'pricing', 'cost', 'fee', 'rate', 'tuition',
        'payment', 'pay', 'how much', 'investment', 'scholarship',
        'financial', 'afford', '$'
      ],
      schedule: [
        'schedule', 'session', 'date', 'calendar', 'week',
        'summer 2026', 'summer 2025', 'summer camp', 'when',
        'june', 'july', 'august', 'availability'
      ],
      faq: [
        'faq', 'question', 'info', 'parent', 'detail', 'about',
        'learn more', 'what to', 'prepare', 'expect', 'policy'
      ],
      register: [
        'register', 'sign up', 'enroll', 'apply', 'book', 'reserve',
        'registration', 'signup', 'join', 'get started'
      ],
      camps: [
        'camp', 'program', 'summer', 'youth', 'kids', 'children',
        'activities', 'offerings'
      ]
    };

    // Score links based on keyword matches (more matches = more relevant)
    const scoredLinks = {};

    for (const link of links) {
      const text = link.text + ' ' + link.ariaLabel;
      const href = link.href.toLowerCase();

      // Skip social media and external sites
      if (href.includes('facebook.com') || href.includes('instagram.com') ||
          href.includes('twitter.com') || href.includes('youtube.com')) {
        continue;
      }

      for (const [category, words] of Object.entries(keywords)) {
        let score = 0;
        for (const word of words) {
          if (text.includes(word)) score += 2;
          if (href.includes(word.replace(/\s+/g, ''))) score += 1;
          if (href.includes(word.replace(/\s+/g, '-'))) score += 1;
        }

        if (score > 0) {
          if (!scoredLinks[category] || score > scoredLinks[category].score) {
            scoredLinks[category] = { href: link.href, score };
          }
        }
      }

      // Detect PDF links
      if (href.endsWith('.pdf') || href.includes('.pdf?')) {
        pages.pdfs.push({
          url: link.href,
          text: link.text
        });
      }
    }

    // Assign best matches
    for (const [category, data] of Object.entries(scoredLinks)) {
      if (data && !pages[category]) {
        pages[category] = data.href;
      }
    }

    await context.close();
  } catch (error) {
    console.error(`Page discovery error: ${error.message}`);
  }

  return pages;
}

/**
 * Enhanced price extraction with multiple patterns
 */
export function extractPrices(text) {
  const prices = {
    weekly: null,
    daily: null,
    session: null,
    halfDay: null,
    fullDay: null,
    earlyBird: null,
    member: null,
    nonMember: null,
    extendedCare: null
  };

  if (!text) return prices;

  // Price patterns to try (order matters - more specific first)
  const patterns = [
    // "$XXX/week" or "$XXX per week" or "$XXX a week"
    { regex: /\$\s*(\d{2,4})(?:\s*[-\/]|\s+(?:per|a|each)\s+)week/gi, field: 'weekly' },
    // "weekly: $XXX" or "weekly rate: $XXX"
    { regex: /weekly(?:\s+rate)?[:\s]+\$?\s*(\d{2,4})/gi, field: 'weekly' },
    // "$XXX for the week" or "$XXX for one week"
    { regex: /\$\s*(\d{2,4})\s+(?:for\s+)?(?:the\s+|one\s+|each\s+)?week/gi, field: 'weekly' },
    // "Cost: $XXX" when followed by week context
    { regex: /cost[:\s]+\$?\s*(\d{2,4})(?=.*week)/gi, field: 'weekly' },
    // "$XXX/day" or "$XXX per day"
    { regex: /\$\s*(\d{2,4})(?:\s*[-\/]|\s+(?:per|a)\s+)day/gi, field: 'daily' },
    // "$XXX/session" or "$XXX per session"
    { regex: /\$\s*(\d{2,4})(?:\s*[-\/]|\s+(?:per|a)\s+)session/gi, field: 'session' },
    // "session fee: $XXX"
    { regex: /session\s+(?:fee|cost|price)[:\s]+\$?\s*(\d{2,4})/gi, field: 'session' },
    // "half day: $XXX" or "half-day $XXX" or "AM/PM session $XXX"
    { regex: /(?:half[-\s]?day|am\s+session|pm\s+session|morning|afternoon)[:\s]*\$?\s*(\d{2,4})/gi, field: 'halfDay' },
    // "$XXX half day"
    { regex: /\$\s*(\d{2,4})\s+(?:for\s+)?half[-\s]?day/gi, field: 'halfDay' },
    // "full day: $XXX" or "full-day $XXX" or "all day $XXX"
    { regex: /(?:full[-\s]?day|all[-\s]?day)[:\s]*\$?\s*(\d{2,4})/gi, field: 'fullDay' },
    // "$XXX full day"
    { regex: /\$\s*(\d{2,4})\s+(?:for\s+)?(?:full|all)[-\s]?day/gi, field: 'fullDay' },
    // "early bird: $XXX" or "early registration $XXX" or "register by DATE $XXX"
    { regex: /early\s*(?:bird|registration|pricing)?[:\s]*\$?\s*(\d{2,4})/gi, field: 'earlyBird' },
    // "save $XX" near a price - use the lower price as early bird
    { regex: /\$\s*(\d{2,4}).*save\s+\$/gi, field: 'earlyBird' },
    // "member: $XXX" or "members: $XXX" or "member price: $XXX"
    { regex: /members?\s*(?:price|rate|fee)?[:\s]+\$?\s*(\d{2,4})/gi, field: 'member' },
    // "$XXX member" or "$XXX for members"
    { regex: /\$\s*(\d{2,4})\s+(?:for\s+)?members?/gi, field: 'member' },
    // "non-member: $XXX" or "general public: $XXX"
    { regex: /(?:non[-\s]?members?|general\s+public)[:\s]+\$?\s*(\d{2,4})/gi, field: 'nonMember' },
    // "extended care: $XXX" or "before/after care $XXX"
    { regex: /(?:extended|before|after)[-\s]?care[:\s]*\$?\s*(\d{2,4})/gi, field: 'extendedCare' },
    // "early drop-off: $XXX" or "late pick-up: $XXX"
    { regex: /(?:early\s+drop|late\s+pick)[:\s-]*\$?\s*(\d{2,4})/gi, field: 'extendedCare' },
  ];

  for (const { regex, field } of patterns) {
    // Reset regex lastIndex for each new search
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (match && !prices[field]) {
      const price = parseInt(match[1]);
      if (price >= 20 && price <= 3000) {
        prices[field] = price;
      }
    }
  }

  // If no specific patterns matched, look for prices with context
  if (!prices.weekly && !prices.session) {
    // Look for "$XXX" near camp/week/session keywords
    const contextualPriceRegex = /(?:camp|week|session|program|tuition|fee|cost|rate)[^$]*\$\s*(\d{2,4})/gi;
    const match = contextualPriceRegex.exec(text);
    if (match) {
      const price = parseInt(match[1]);
      if (price >= 100 && price <= 2000) {
        prices.weekly = price;
      }
    }
  }

  // Last resort: find reasonable weekly-range prices
  if (!prices.weekly && !prices.session) {
    const allPrices = [];
    const generalPriceRegex = /\$\s*(\d{3,4})(?!\d)/g;
    let match;
    while ((match = generalPriceRegex.exec(text)) !== null) {
      const price = parseInt(match[1]);
      // Weekly camp prices typically $150-$800
      if (price >= 150 && price <= 800) {
        allPrices.push(price);
      }
    }

    if (allPrices.length > 0) {
      // Use the most common price (median)
      allPrices.sort((a, b) => a - b);
      prices.weekly = allPrices[Math.floor(allPrices.length / 2)];
    }
  }

  return prices;
}

/**
 * Enhanced session/date extraction
 */
export function extractSessions(text) {
  const sessions = [];
  if (!text) return sessions;

  const seen = new Set();

  // Pattern 1: "Week 1: June 16-20" or "Session 1: June 16-20"
  const weekPattern = /(?:week|session)\s*#?\s*(\d+)[:\s]+([A-Z][a-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?/gi;

  let match;
  while ((match = weekPattern.exec(text)) !== null) {
    const sessionNum = match[1];
    const startMonth = match[2];
    const startDay = match[3];
    const endMonth = match[4] || startMonth;
    const endDay = match[5];
    const year = match[6] || '2026';

    const dateStr = `${startMonth} ${startDay}-${endMonth !== startMonth ? endMonth + ' ' : ''}${endDay}, ${year}`;
    const key = `Session ${sessionNum}: ${dateStr}`;

    if (!seen.has(key)) {
      seen.add(key);
      sessions.push({
        name: `Session ${sessionNum}`,
        dates: dateStr,
        raw: match[0]
      });
    }
  }

  // Pattern 2: "June 16-20" short date ranges (likely sessions)
  const shortRangePattern = /(June|July|August)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})(?:,?\s*(\d{4}))?/gi;
  while ((match = shortRangePattern.exec(text)) !== null) {
    const dateStr = match[0];
    if (!seen.has(dateStr) && sessions.length < 15) {
      seen.add(dateStr);
      sessions.push({
        name: `Session ${sessions.length + 1}`,
        dates: dateStr,
        raw: match[0]
      });
    }
  }

  // Pattern 3: "6/16-6/20" or "6/16 - 6/20" numeric format
  const numericPattern = /(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
  while ((match = numericPattern.exec(text)) !== null) {
    const dateStr = match[0];
    if (!seen.has(dateStr) && sessions.length < 15) {
      seen.add(dateStr);
      sessions.push({
        name: `Session ${sessions.length + 1}`,
        dates: dateStr,
        raw: match[0]
      });
    }
  }

  // Pattern 4: "Summer 2026" or "Summer Camp 2026" with date mentions
  const summer2026Pattern = /summer\s*(?:camp)?\s*2026/gi;
  if (summer2026Pattern.test(text) && sessions.length === 0) {
    // Look for any date ranges near "summer" keyword
    const contextualPattern = /(?:begins?|starts?|runs?|from)\s*(?:on\s+)?([A-Z][a-z]+\s+\d{1,2})/gi;
    while ((match = contextualPattern.exec(text)) !== null) {
      if (!seen.has(match[1]) && sessions.length < 5) {
        seen.add(match[1]);
        sessions.push({
          name: 'Summer Session',
          dates: match[1],
          raw: match[0]
        });
      }
    }
  }

  // Pattern 5: Registration dates like "Registration opens January 15"
  const regPattern = /registration\s+(?:opens?|begins?|starts?)\s*(?:on\s+)?([A-Z][a-z]+\s+\d{1,2}(?:,?\s*\d{4})?)/gi;
  while ((match = regPattern.exec(text)) !== null) {
    const key = 'reg:' + match[1];
    if (!seen.has(key)) {
      seen.add(key);
      sessions.push({
        name: 'Registration Opens',
        dates: match[1],
        raw: match[0],
        type: 'registration'
      });
    }
  }

  return sessions;
}

/**
 * Enhanced hours extraction
 */
export function extractHours(text) {
  if (!text) return null;

  const hours = {
    standard: null,
    dropOff: null,
    pickUp: null,
    extendedBefore: null,
    extendedAfter: null
  };

  // Standard hours: "9am-3pm" or "9:00 AM - 3:00 PM"
  const standardPattern = /(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?))\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.?))/gi;
  const match = standardPattern.exec(text);
  if (match) {
    hours.standard = `${match[1]} - ${match[2]}`.replace(/\./g, '').toUpperCase();
  }

  // Drop-off window: "Drop-off: 8:45-9:00am"
  const dropOffPattern = /drop[-\s]?off[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.?)?)/gi;
  const dropMatch = dropOffPattern.exec(text);
  if (dropMatch) {
    hours.dropOff = `${dropMatch[1]}-${dropMatch[2]}`;
  }

  // Pick-up window
  const pickUpPattern = /pick[-\s]?up[:\s]+(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.?)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.?)?)/gi;
  const pickMatch = pickUpPattern.exec(text);
  if (pickMatch) {
    hours.pickUp = `${pickMatch[1]}-${pickMatch[2]}`;
  }

  // Extended care: "Early drop-off from 7:30am" or "Extended day until 5:30pm"
  const extendedBeforePattern = /(?:early\s+drop[-\s]?off|before[-\s]?care|am\s+care)[:\s]+(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|a\.m\.)?)/gi;
  const beforeMatch = extendedBeforePattern.exec(text);
  if (beforeMatch) {
    hours.extendedBefore = beforeMatch[1];
  }

  const extendedAfterPattern = /(?:extended\s+day|late\s+pick[-\s]?up|after[-\s]?care|pm\s+care)[:\s]+(?:until\s+)?(\d{1,2}(?::\d{2})?\s*(?:pm|p\.m\.)?)/gi;
  const afterMatch = extendedAfterPattern.exec(text);
  if (afterMatch) {
    hours.extendedAfter = afterMatch[1];
  }

  return hours;
}

/**
 * Extract from HTML tables (often contain pricing grids)
 */
export function extractFromTables(tables) {
  const extracted = {
    pricing: {},
    sessions: [],
    ageGroups: []
  };

  for (const table of tables) {
    if (!table.rows || table.rows.length === 0) continue;

    // Check if this looks like a pricing table
    const flatText = table.rows.flat().join(' ').toLowerCase();
    const isPricingTable = flatText.includes('$') ||
                           flatText.includes('price') ||
                           flatText.includes('rate') ||
                           flatText.includes('fee');

    if (isPricingTable) {
      for (const row of table.rows) {
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          const priceMatch = cell.match(/\$\s*(\d{2,4})/);

          if (priceMatch) {
            const price = parseInt(priceMatch[1]);
            const label = row[0]?.toLowerCase() || '';

            if (price >= 50 && price <= 2000) {
              if (label.includes('early') || label.includes('bird')) {
                extracted.pricing.earlyBird = price;
              } else if (label.includes('member') && !label.includes('non')) {
                extracted.pricing.member = price;
              } else if (label.includes('non-member') || label.includes('non member')) {
                extracted.pricing.nonMember = price;
              } else if (label.includes('half')) {
                extracted.pricing.halfDay = price;
              } else if (label.includes('full')) {
                extracted.pricing.fullDay = price;
              } else if (label.includes('week')) {
                extracted.pricing.weekly = price;
              } else if (!extracted.pricing.weekly) {
                extracted.pricing.weekly = price;
              }
            }
          }
        }
      }
    }

    // Check if this looks like a session/schedule table
    const isScheduleTable = flatText.includes('week') ||
                            flatText.includes('session') ||
                            flatText.includes('june') ||
                            flatText.includes('july') ||
                            flatText.includes('august');

    if (isScheduleTable) {
      for (const row of table.rows) {
        const rowText = row.join(' ');
        const dateMatch = rowText.match(/([A-Z][a-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2})/);
        if (dateMatch) {
          extracted.sessions.push({
            name: row[0] || `Session ${extracted.sessions.length + 1}`,
            dates: dateMatch[0]
          });
        }
      }
    }
  }

  return extracted;
}

/**
 * Extract from JSON-LD structured data
 */
export function extractFromJsonLd(jsonLdArray) {
  const extracted = {
    pricing: {},
    sessions: [],
    contact: {}
  };

  for (const data of jsonLdArray) {
    // Event or Course type
    if (data['@type'] === 'Event' || data['@type'] === 'Course' || data['@type'] === 'ChildCare') {
      if (data.offers) {
        const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
        for (const offer of offers) {
          if (offer.price) {
            extracted.pricing.weekly = parseFloat(offer.price);
          }
        }
      }

      if (data.startDate) {
        extracted.sessions.push({
          name: data.name || 'Session',
          dates: `${data.startDate}${data.endDate ? ' - ' + data.endDate : ''}`
        });
      }
    }

    // Organization type
    if (data['@type'] === 'Organization' || data['@type'] === 'LocalBusiness') {
      if (data.email) extracted.contact.email = data.email;
      if (data.telephone) extracted.contact.phone = data.telephone;
      if (data.address) {
        extracted.contact.address = typeof data.address === 'string'
          ? data.address
          : `${data.address.streetAddress || ''}, ${data.address.addressLocality || ''}`;
      }
    }
  }

  return extracted;
}

/**
 * Detect extended care availability
 */
export function detectExtendedCare(text) {
  if (!text) return { available: null, details: null };

  const textLower = text.toLowerCase();

  const positiveTerms = [
    'extended care', 'extended day', 'before care', 'after care',
    'aftercare', 'beforecare', 'early drop-off', 'late pick-up',
    'am care', 'pm care', 'before school', 'after school',
    'early bird drop', 'extended hours', 'wrap-around care'
  ];

  const negativeTerms = [
    'no extended', 'not available', 'no before', 'no after',
    'does not offer extended', 'no early drop'
  ];

  // Check for negative first
  for (const term of negativeTerms) {
    if (textLower.includes(term)) {
      return { available: false, details: 'Not offered' };
    }
  }

  // Check for positive
  for (const term of positiveTerms) {
    const index = textLower.indexOf(term);
    if (index !== -1) {
      // Extract surrounding context
      const start = Math.max(0, index - 20);
      const end = Math.min(text.length, index + term.length + 100);
      const context = text.substring(start, end);

      // Look for price in context
      const priceMatch = context.match(/\$\s*(\d{2,4})/);
      const timeMatch = context.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi);

      return {
        available: true,
        details: context.trim(),
        cost: priceMatch ? `$${priceMatch[1]}` : null,
        times: timeMatch ? timeMatch.join(' - ') : null
      };
    }
  }

  return { available: null, details: null };
}

/**
 * Extract activities from text
 */
export function extractActivities(text) {
  if (!text) return [];

  const textLower = text.toLowerCase();
  const activities = new Set();

  const activityPatterns = [
    // Sports
    { pattern: /\b(swimming|swim lessons?)\b/gi, category: 'Swimming' },
    { pattern: /\b(soccer)\b/gi, category: 'Soccer' },
    { pattern: /\b(basketball)\b/gi, category: 'Basketball' },
    { pattern: /\b(tennis)\b/gi, category: 'Tennis' },
    { pattern: /\b(golf)\b/gi, category: 'Golf' },
    { pattern: /\b(archery)\b/gi, category: 'Archery' },
    { pattern: /\b(rock climbing|climbing wall)\b/gi, category: 'Rock Climbing' },
    { pattern: /\b(kayaking|canoeing|paddling)\b/gi, category: 'Kayaking' },
    { pattern: /\b(surfing|boogie board)\b/gi, category: 'Surfing' },
    { pattern: /\b(horseback|horse riding|equestrian)\b/gi, category: 'Horseback Riding' },

    // Arts
    { pattern: /\b(arts?\s*(?:&|and)?\s*crafts?)\b/gi, category: 'Arts & Crafts' },
    { pattern: /\b(painting|drawing|art class)\b/gi, category: 'Visual Arts' },
    { pattern: /\b(pottery|ceramics)\b/gi, category: 'Pottery' },
    { pattern: /\b(music|singing|instruments?)\b/gi, category: 'Music' },
    { pattern: /\b(dance|dancing|ballet|hip hop)\b/gi, category: 'Dance' },
    { pattern: /\b(theater|theatre|drama|acting)\b/gi, category: 'Theater' },
    { pattern: /\b(photography|filmmaking|video)\b/gi, category: 'Photography/Film' },

    // STEM
    { pattern: /\b(coding|programming|computer)\b/gi, category: 'Coding' },
    { pattern: /\b(robotics|robots?)\b/gi, category: 'Robotics' },
    { pattern: /\b(science|experiments?|lab)\b/gi, category: 'Science' },
    { pattern: /\b(stem|steam)\b/gi, category: 'STEM' },
    { pattern: /\b(engineering|building|construction)\b/gi, category: 'Engineering' },

    // Nature
    { pattern: /\b(hiking|nature walks?|trails?)\b/gi, category: 'Hiking' },
    { pattern: /\b(camping|outdoor adventure)\b/gi, category: 'Camping' },
    { pattern: /\b(gardening|farming|agriculture)\b/gi, category: 'Gardening' },
    { pattern: /\b(animals?|wildlife|zoo)\b/gi, category: 'Animal Education' },
    { pattern: /\b(marine|ocean|beach)\b/gi, category: 'Marine Science' },

    // Other
    { pattern: /\b(cooking|culinary|baking)\b/gi, category: 'Cooking' },
    { pattern: /\b(yoga|meditation|mindfulness)\b/gi, category: 'Yoga/Mindfulness' },
    { pattern: /\b(martial arts?|karate|judo)\b/gi, category: 'Martial Arts' },
    { pattern: /\b(field trips?|excursions?)\b/gi, category: 'Field Trips' },
    { pattern: /\b(games?|play|recreation)\b/gi, category: 'Games & Recreation' },
  ];

  for (const { pattern, category } of activityPatterns) {
    if (pattern.test(text)) {
      activities.add(category);
    }
  }

  return Array.from(activities);
}

/**
 * Calculate comprehensive quality score
 */
export function calculateQualityScore(extracted) {
  let score = 0;
  const breakdown = {};

  // Pricing (30 points max)
  const pricing = extracted.pricing || extracted.pricing_tiers || {};
  if (pricing.weekly || pricing.session) {
    score += 15;
    breakdown.pricing_base = 15;
  }
  if (pricing.earlyBird || pricing.member) {
    score += 8;
    breakdown.pricing_tiers = 8;
  }
  if (pricing.halfDay || pricing.fullDay) {
    score += 7;
    breakdown.pricing_options = 7;
  }

  // Sessions (20 points max)
  const sessions = extracted.sessions || [];
  if (sessions.length > 0) {
    score += 10;
    breakdown.sessions_exist = 10;
  }
  if (sessions.length >= 5) {
    score += 5;
    breakdown.sessions_multiple = 5;
  }
  if (sessions.some(s => s.dates && s.dates.includes('2026'))) {
    score += 5;
    breakdown.sessions_2026 = 5;
  }

  // Hours (15 points max)
  const hours = extracted.hours;
  if (hours) {
    if (typeof hours === 'string' && hours.includes('-')) {
      score += 10;
      breakdown.hours_standard = 10;
    } else if (hours.standard) {
      score += 10;
      breakdown.hours_standard = 10;
    }
    if (hours.dropOff || hours.pickUp) {
      score += 5;
      breakdown.hours_windows = 5;
    }
  }

  // Extended care (15 points max)
  if (extracted.extendedCare?.available === true || extracted.has_extended_care === true) {
    score += 10;
    breakdown.extended_care = 10;
    if (extracted.extendedCare?.cost || extracted.extended_care_cost) {
      score += 5;
      breakdown.extended_care_cost = 5;
    }
  } else if (extracted.extendedCare?.available === false || extracted.has_extended_care === false) {
    score += 5; // At least we know definitively
    breakdown.extended_care_known = 5;
  }

  // Ages (10 points max)
  if (extracted.age_groups?.length > 0 || extracted.min_age || extracted.ages?.min) {
    score += 10;
    breakdown.ages = 10;
  }

  // Activities (10 points max)
  const activities = extracted.activities || [];
  if (activities.length > 0) {
    score += 5;
    breakdown.activities_exist = 5;
  }
  if (activities.length >= 5) {
    score += 5;
    breakdown.activities_multiple = 5;
  }

  return { score: Math.min(100, score), breakdown };
}

export default {
  discoverCampPages,
  extractPrices,
  extractSessions,
  extractHours,
  extractFromTables,
  extractFromJsonLd,
  detectExtendedCare,
  extractActivities,
  calculateQualityScore
};
