/**
 * Claude-powered camp data extraction module
 * Uses Anthropic API for semantic extraction with confidence scoring
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS_DIR = path.join(__dirname, '..', '..', 'data', 'camp-configs');

// Initialize Anthropic client (may be null if no API key)
let anthropic = null;
try {
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
} catch (e) {
  console.warn('Could not initialize Anthropic client:', e.message);
}

/**
 * Check if Claude API is available
 */
export function isClaudeAvailable() {
  return !!anthropic;
}

/**
 * Load camp-specific configuration if it exists
 */
export async function loadCampConfig(campId) {
  try {
    const configPath = path.join(CONFIGS_DIR, `${campId}.json`);
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null; // No config file, use default extraction
  }
}

/**
 * Extract structured camp data using Claude
 * @param {Object} campConfig - Camp configuration with data hints
 * @param {Object} pageContents - Map of page type to content
 * @param {Object} csvBaseline - Baseline data from CSV
 * @returns {Object} Extracted data with confidence scores
 */
export async function extractWithClaude(campConfig, pageContents, csvBaseline = {}) {
  const campName = campConfig?.name || csvBaseline?.camp_name || 'Unknown Camp';
  const dataHints = campConfig?.data_hints || {};

  // Build content summary (limit to avoid token overflow)
  const contentSummary = Object.entries(pageContents)
    .map(([pageType, content]) => {
      const truncated = content.substring(0, 6000);
      return `=== ${pageType.toUpperCase()} PAGE ===\n${truncated}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are extracting summer camp data from website content. Be thorough and accurate.

CAMP: ${campName}
${Object.keys(dataHints).length > 0 ? `\nDATA HINTS FROM SITE MAPPING:\n${JSON.stringify(dataHints, null, 2)}` : ''}

BASELINE DATA (from our records - may be outdated):
- Price: $${csvBaseline.price_min || '?'} - $${csvBaseline.price_max || '?'}
- Ages: ${csvBaseline.min_age || '?'} - ${csvBaseline.max_age || '?'}
- Hours: ${csvBaseline.hours || 'Unknown'}
- Extended Care: ${csvBaseline.extended_care || 'Unknown'}

---

WEBSITE CONTENT:

${contentSummary}

---

EXTRACTION TASK:

Extract ALL available information with confidence scores (0-100).
- 90-100: Explicitly stated on the page
- 70-89: Strongly implied or partially stated
- 50-69: Inferred from context
- Below 50: Uncertain, may be incorrect

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "pricing": {
    "weekly_rate": null,
    "half_day_rate": null,
    "full_day_rate": null,
    "early_bird_rate": null,
    "early_bird_deadline": null,
    "member_rate": null,
    "non_member_rate": null,
    "sibling_discount": null,
    "multi_week_discount": null,
    "registration_fee": null
  },
  "schedule": {
    "sessions": [],
    "total_weeks": null,
    "start_date": null,
    "end_date": null,
    "days_of_week": null
  },
  "hours": {
    "standard_start": null,
    "standard_end": null,
    "drop_off_window": null,
    "pick_up_window": null,
    "has_extended_care": null,
    "extended_care_before": null,
    "extended_care_after": null,
    "extended_care_cost": null
  },
  "age_groups": {
    "min_age": null,
    "max_age": null,
    "named_groups": []
  },
  "activities": [],
  "policies": {
    "cancellation": null,
    "refund_policy": null,
    "what_to_bring": null,
    "food_provided": null,
    "food_details": null
  },
  "registration": {
    "status": null,
    "opens_date": null,
    "method": null,
    "waitlist_available": null
  },
  "contact": {
    "email": null,
    "phone": null,
    "address": null
  },
  "confidence": {
    "pricing": 0,
    "schedule": 0,
    "hours": 0,
    "age_groups": 0,
    "activities": 0,
    "policies": 0,
    "registration": 0,
    "contact": 0
  },
  "extraction_notes": ""
}

IMPORTANT:
- For hours.has_extended_care, look for terms like: "early drop-off", "late pick-up", "before care", "after care", "extended day", "AM care", "PM care"
- For pricing, distinguish between: weekly rate, per-session rate, half-day vs full-day
- For member_rate vs non_member_rate, check for zoo/museum membership pricing tiers
- Include ALL activities mentioned (swimming, hiking, crafts, STEM, sports, etc.)
- sessions array should include: { "name": "Week 1", "dates": "June 16-20", "theme": "if any" }`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response');
      return createEmptyExtraction('No JSON in response');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return extracted;

  } catch (error) {
    console.error(`Claude extraction error: ${error.message}`);
    return createEmptyExtraction(error.message);
  }
}

/**
 * Create empty extraction result for error cases
 */
function createEmptyExtraction(errorNote) {
  return {
    pricing: {},
    schedule: { sessions: [] },
    hours: { has_extended_care: null },
    age_groups: { named_groups: [] },
    activities: [],
    policies: {},
    registration: {},
    contact: {},
    confidence: {
      pricing: 0,
      schedule: 0,
      hours: 0,
      age_groups: 0,
      activities: 0,
      policies: 0,
      registration: 0,
      contact: 0
    },
    extraction_notes: `Extraction failed: ${errorNote}`
  };
}

/**
 * Merge Claude extraction with CSV baseline data
 * Prefers extracted data, falls back to CSV for nulls
 */
export function mergeWithCSVFallback(extracted, csvRow) {
  const sources = {};

  // Helper to pick value and track source
  const pick = (field, extractedVal, csvVal) => {
    if (extractedVal !== null && extractedVal !== undefined && extractedVal !== '') {
      sources[field] = 'scraped';
      return extractedVal;
    }
    if (csvVal !== null && csvVal !== undefined && csvVal !== '') {
      sources[field] = 'csv';
      return csvVal;
    }
    sources[field] = 'missing';
    return null;
  };

  return {
    // Pricing
    price_min: pick('price_min',
      extracted.pricing?.weekly_rate || extracted.pricing?.non_member_rate,
      parseFloat(csvRow.price_min)
    ),
    price_max: pick('price_max',
      extracted.pricing?.full_day_rate || extracted.pricing?.non_member_rate,
      parseFloat(csvRow.price_max)
    ),
    pricing_tiers: {
      earlyBird: extracted.pricing?.early_bird_rate || null,
      regular: extracted.pricing?.weekly_rate || null,
      halfDay: extracted.pricing?.half_day_rate || null,
      fullDay: extracted.pricing?.full_day_rate || null,
      member: extracted.pricing?.member_rate || null,
      nonMember: extracted.pricing?.non_member_rate || null,
      perSession: null
    },
    sibling_discount: extracted.pricing?.sibling_discount || null,
    multi_week_discount: extracted.pricing?.multi_week_discount || null,
    registration_fee: extracted.pricing?.registration_fee || null,

    // Hours
    hours: pick('hours',
      extracted.hours?.standard_start && extracted.hours?.standard_end
        ? `${extracted.hours.standard_start}-${extracted.hours.standard_end}`
        : null,
      csvRow.hours
    ),
    has_extended_care: pick('has_extended_care',
      extracted.hours?.has_extended_care,
      csvRow.extended_care?.toLowerCase()?.includes('yes') || false
    ),
    extended_care_hours: extracted.hours?.extended_care_before || extracted.hours?.extended_care_after
      ? `${extracted.hours.extended_care_before || ''} / ${extracted.hours.extended_care_after || ''}`.trim()
      : null,
    extended_care_cost: extracted.hours?.extended_care_cost || null,
    drop_off_window: extracted.hours?.drop_off_window || null,
    pick_up_window: extracted.hours?.pick_up_window || null,

    // Ages
    min_age: pick('min_age',
      extracted.age_groups?.min_age,
      parseInt(csvRow.min_age)
    ),
    max_age: pick('max_age',
      extracted.age_groups?.max_age,
      parseInt(csvRow.max_age)
    ),
    age_groups: extracted.age_groups?.named_groups || [],

    // Schedule
    sessions: extracted.schedule?.sessions || [],
    total_weeks: extracted.schedule?.total_weeks || null,
    start_date: extracted.schedule?.start_date || null,
    end_date: extracted.schedule?.end_date || null,

    // Activities
    activities: extracted.activities || [],

    // Policies
    cancellation_policy: extracted.policies?.cancellation || null,
    food_info: {
      provided: extracted.policies?.food_provided || false,
      details: extracted.policies?.food_details || null
    },
    what_to_bring: extracted.policies?.what_to_bring || null,

    // Registration
    registration_status: extracted.registration?.status || null,
    registration_opens: extracted.registration?.opens_date || null,
    waitlist_available: extracted.registration?.waitlist_available || null,

    // Contact
    email: extracted.contact?.email || csvRow.contact_email || null,
    phone: extracted.contact?.phone || csvRow.contact_phone || null,

    // Meta
    _confidence: extracted.confidence || {},
    _sources: sources,
    _extraction_notes: extracted.extraction_notes || null
  };
}

/**
 * Check if extraction needs manual review
 * @returns {Array} List of fields needing review
 */
export function checkNeedsReview(extracted, threshhold = 70) {
  const needsReview = [];

  if (!extracted.confidence) return ['all'];

  for (const [field, score] of Object.entries(extracted.confidence)) {
    if (score < threshhold) {
      needsReview.push({ field, confidence: score });
    }
  }

  return needsReview;
}

/**
 * Add camp to review queue
 */
export async function addToReviewQueue(campId, needsReview, extracted, urls) {
  const reviewQueuePath = path.join(__dirname, '..', '..', 'data', 'review-queue.json');

  let queue = [];
  try {
    const existing = await fs.readFile(reviewQueuePath, 'utf-8');
    queue = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist yet
  }

  // Remove existing entry for this camp
  queue = queue.filter(item => item.campId !== campId);

  // Add new entry
  queue.push({
    campId,
    fields: needsReview,
    extracted,
    urls,
    addedAt: new Date().toISOString()
  });

  await fs.writeFile(reviewQueuePath, JSON.stringify(queue, null, 2));
}

export default {
  isClaudeAvailable,
  loadCampConfig,
  extractWithClaude,
  mergeWithCSVFallback,
  checkNeedsReview,
  addToReviewQueue
};
