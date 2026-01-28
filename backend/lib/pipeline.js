/**
 * Multi-Strategy Camp Data Extraction Pipeline
 *
 * Orchestrates multiple extraction strategies to maximize data accuracy:
 *
 * Strategy 1: WebFetch (fast, basic HTML parsing)
 * Strategy 2: Playwright full page scrape (JS rendering)
 * Strategy 3: Screenshot + Vision analysis (for complex layouts)
 * Strategy 4: Accessibility snapshot (semantic structure)
 * Strategy 5: PDF extraction (for camps with PDF schedules)
 *
 * The pipeline:
 * 1. Tries each strategy in order of cost/speed
 * 2. Scores each result for data quality
 * 3. Merges best results from each strategy
 * 4. Validates against known patterns
 * 5. Compares with previous data for change detection
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PIPELINE_LOG = path.join(DATA_DIR, 'pipeline-log.json');
const CHANGE_LOG = path.join(DATA_DIR, 'change-log.json');

/**
 * Data quality scoring weights
 */
const QUALITY_WEIGHTS = {
  pricing: 25,         // Most valuable
  sessions: 20,        // Session dates
  hours: 15,           // Operating hours
  extended_care: 15,   // Before/after care
  ages: 10,            // Age requirements
  activities: 10,      // What they do
  registration: 5      // Registration status
};

/**
 * Score the quality of extracted data (comprehensive scoring)
 */
export function scoreDataQuality(extracted) {
  if (!extracted) return 0;

  let score = 0;

  // Pricing (30 points max) - most valuable
  if (extracted.pricing_tiers || extracted.pricing) {
    const pricing = extracted.pricing_tiers || extracted.pricing;
    // Base price found
    if (pricing.weekly || pricing.weekly_rate || pricing.session || pricing.perSession) {
      score += 15;
    }
    // Tier pricing (early bird, member, etc.)
    if (pricing.earlyBird || pricing.early_bird || pricing.member || pricing.member_rate) {
      score += 8;
    }
    // Half/full day options
    if (pricing.halfDay || pricing.fullDay || pricing.half_day_rate || pricing.daily) {
      score += 7;
    }
  }

  // Sessions (20 points max)
  if (extracted.sessions && Array.isArray(extracted.sessions)) {
    if (extracted.sessions.length > 0) score += 10;
    if (extracted.sessions.length >= 5) score += 5;
    // Bonus for 2026 dates
    if (extracted.sessions.some(s => {
      const dateStr = s.dates || s.raw || '';
      return dateStr.includes('2026');
    })) {
      score += 5;
    }
  }

  // Hours (15 points max)
  if (extracted.hours) {
    // Standard hours found
    if (typeof extracted.hours === 'string' && extracted.hours.includes('-')) {
      score += 10;
    } else if (extracted.hours.standard || extracted.hours.start) {
      score += 10;
    }
    // Drop-off/pick-up windows found
    if (extracted.hours_detail?.dropOff || extracted.hours_detail?.pickUp ||
        extracted.hours?.drop_off_window || extracted.hours?.pick_up_window) {
      score += 5;
    }
  }

  // Extended care (15 points max)
  if (extracted.has_extended_care !== undefined && extracted.has_extended_care !== null) {
    score += 8;
    // Extended care hours documented
    if (extracted.extended_care_hours || extracted.hours_detail?.extendedBefore ||
        extracted.hours_detail?.extendedAfter) {
      score += 4;
    }
    // Extended care cost documented
    if (extracted.extended_care_cost) {
      score += 3;
    }
  } else if (extracted.extended_care_details) {
    // Partial info about extended care
    score += 5;
  }

  // Ages (10 points max)
  if (extracted.age_groups && Array.isArray(extracted.age_groups) && extracted.age_groups.length > 0) {
    score += 10;
  } else if (extracted.min_age || extracted.max_age || extracted.ages?.min) {
    score += 7;
  }

  // Activities (10 points max)
  if (extracted.activities && Array.isArray(extracted.activities)) {
    if (extracted.activities.length > 0) score += 5;
    if (extracted.activities.length >= 5) score += 3;
    if (extracted.activities.length >= 10) score += 2;
  }

  // Registration (5 points max - bonus)
  if (extracted.registration || extracted.availability) {
    const reg = extracted.registration || extracted.availability;
    if (reg.status || reg.isOpen !== undefined) score += 3;
    if (reg.opens_date || reg.openingDate) score += 2;
  }

  return Math.min(100, score);
}

/**
 * Merge data from multiple extraction strategies
 * Prefers higher-confidence values
 */
export function mergeExtractions(results) {
  // Sort by quality score descending
  const sorted = results
    .filter(r => r && r.extracted)
    .sort((a, b) => (b.quality || 0) - (a.quality || 0));

  if (sorted.length === 0) return null;

  const merged = { ...sorted[0].extracted };
  merged._sources = {};
  merged._quality_scores = {};

  // Track where each field came from
  for (const result of sorted) {
    merged._quality_scores[result.strategy] = result.quality;
  }

  // Merge in data from other strategies if primary is missing
  for (const result of sorted.slice(1)) {
    const ext = result.extracted;

    // Merge pricing
    if (!hasPricing(merged) && hasPricing(ext)) {
      merged.pricing_tiers = ext.pricing_tiers || ext.pricing;
      merged._sources.pricing = result.strategy;
    }

    // Merge sessions
    if ((!merged.sessions || merged.sessions.length === 0) &&
        ext.sessions && ext.sessions.length > 0) {
      merged.sessions = ext.sessions;
      merged._sources.sessions = result.strategy;
    }

    // Merge hours
    if (!merged.hours && ext.hours) {
      merged.hours = ext.hours;
      merged._sources.hours = result.strategy;
    }

    // Merge extended care
    if (merged.has_extended_care === undefined && ext.has_extended_care !== undefined) {
      merged.has_extended_care = ext.has_extended_care;
      merged.extended_care_hours = ext.extended_care_hours;
      merged.extended_care_cost = ext.extended_care_cost;
      merged._sources.extended_care = result.strategy;
    }

    // Merge activities (combine unique)
    if (ext.activities && Array.isArray(ext.activities)) {
      const existingActivities = new Set(merged.activities || []);
      ext.activities.forEach(a => existingActivities.add(a));
      merged.activities = [...existingActivities];
    }

    // Merge age groups
    if ((!merged.age_groups || merged.age_groups.length === 0) &&
        ext.age_groups && ext.age_groups.length > 0) {
      merged.age_groups = ext.age_groups;
      merged._sources.age_groups = result.strategy;
    }
  }

  return merged;
}

/**
 * Check if extraction has pricing data
 */
function hasPricing(extracted) {
  if (!extracted) return false;
  const pricing = extracted.pricing_tiers || extracted.pricing;
  if (!pricing) return false;
  return Object.values(pricing).some(v => v !== null && v !== undefined);
}

/**
 * Detect changes between old and new data
 */
export function detectChanges(oldData, newData, campId) {
  const changes = [];

  // Price changes
  const oldPrice = oldData?.price_min || oldData?.extracted?.pricing_tiers?.weekly;
  const newPrice = newData?.price_min || newData?.extracted?.pricing_tiers?.weekly;
  if (oldPrice && newPrice && oldPrice !== newPrice) {
    changes.push({
      field: 'price',
      old: oldPrice,
      new: newPrice,
      significance: 'high'
    });
  }

  // Hours changes
  const oldHours = oldData?.hours;
  const newHours = newData?.hours;
  if (oldHours && newHours && oldHours !== newHours) {
    changes.push({
      field: 'hours',
      old: oldHours,
      new: newHours,
      significance: 'medium'
    });
  }

  // Extended care changes
  if (oldData?.has_extended_care !== newData?.has_extended_care) {
    changes.push({
      field: 'extended_care',
      old: oldData?.has_extended_care,
      new: newData?.has_extended_care,
      significance: 'high'
    });
  }

  // Session count changes
  const oldSessions = oldData?.extracted?.sessions?.length || 0;
  const newSessions = newData?.extracted?.sessions?.length || 0;
  if (oldSessions !== newSessions && (oldSessions > 0 || newSessions > 0)) {
    changes.push({
      field: 'session_count',
      old: oldSessions,
      new: newSessions,
      significance: 'medium'
    });
  }

  // Registration status changes
  const oldRegOpen = oldData?.extracted?.availability?.isOpen;
  const newRegOpen = newData?.extracted?.availability?.isOpen;
  if (oldRegOpen !== newRegOpen && newRegOpen !== undefined) {
    changes.push({
      field: 'registration_open',
      old: oldRegOpen,
      new: newRegOpen,
      significance: 'high'
    });
  }

  return {
    campId,
    hasChanges: changes.length > 0,
    changes,
    detectedAt: new Date().toISOString()
  };
}

/**
 * Log pipeline results
 */
export async function logPipelineRun(results) {
  let log = [];
  try {
    const existing = await fs.readFile(PIPELINE_LOG, 'utf-8');
    log = JSON.parse(existing);
  } catch {
    // File doesn't exist
  }

  // Keep last 30 days of logs
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  log = log.filter(entry => new Date(entry.timestamp).getTime() > thirtyDaysAgo);

  log.push({
    timestamp: new Date().toISOString(),
    ...results
  });

  await fs.writeFile(PIPELINE_LOG, JSON.stringify(log, null, 2));
}

/**
 * Log detected changes
 */
export async function logChanges(changes) {
  if (changes.length === 0) return;

  let log = [];
  try {
    const existing = await fs.readFile(CHANGE_LOG, 'utf-8');
    log = JSON.parse(existing);
  } catch {
    // File doesn't exist
  }

  // Keep last 90 days
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  log = log.filter(entry => new Date(entry.detectedAt).getTime() > ninetyDaysAgo);

  log.push(...changes.filter(c => c.hasChanges));

  await fs.writeFile(CHANGE_LOG, JSON.stringify(log, null, 2));
}

/**
 * Validate extracted data against known patterns
 */
export function validateExtraction(extracted, campConfig = null) {
  const issues = [];

  // Validate pricing makes sense
  if (extracted.pricing_tiers) {
    const prices = Object.values(extracted.pricing_tiers).filter(p => typeof p === 'number');
    if (prices.some(p => p < 50 || p > 2000)) {
      issues.push({
        field: 'pricing',
        issue: 'Price out of expected range ($50-$2000/week)',
        severity: 'warning'
      });
    }
  }

  // Validate ages make sense
  if (extracted.ages) {
    const minAge = extracted.ages.min || extracted.min_age;
    const maxAge = extracted.ages.max || extracted.max_age;
    if (minAge && (minAge < 3 || minAge > 14)) {
      issues.push({
        field: 'ages',
        issue: `Minimum age ${minAge} seems unusual`,
        severity: 'warning'
      });
    }
    if (maxAge && (maxAge < 8 || maxAge > 18)) {
      issues.push({
        field: 'ages',
        issue: `Maximum age ${maxAge} seems unusual`,
        severity: 'warning'
      });
    }
  }

  // Validate hours format
  if (extracted.hours && typeof extracted.hours === 'string') {
    if (!extracted.hours.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?\s*-\s*\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/i)) {
      issues.push({
        field: 'hours',
        issue: 'Hours format may be invalid',
        severity: 'info'
      });
    }
  }

  // Check against camp-specific config hints
  if (campConfig?.validation) {
    for (const [field, rule] of Object.entries(campConfig.validation)) {
      // Custom validation rules from config
      if (rule.required && !extracted[field]) {
        issues.push({
          field,
          issue: `Required field missing (per camp config)`,
          severity: 'error'
        });
      }
    }
  }

  return {
    isValid: !issues.some(i => i.severity === 'error'),
    issues
  };
}

/**
 * Generate weekly report
 */
export function generateWeeklyReport(results, changes) {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCamps: results.length,
      successfulExtractions: results.filter(r => r.quality >= 60).length,
      needsReview: results.filter(r => r.quality < 60 && r.quality > 0).length,
      failed: results.filter(r => r.quality === 0).length,
      avgQuality: Math.round(results.reduce((sum, r) => sum + (r.quality || 0), 0) / results.length)
    },
    changes: {
      total: changes.filter(c => c.hasChanges).length,
      priceChanges: changes.filter(c => c.changes?.some(ch => ch.field === 'price')).length,
      registrationChanges: changes.filter(c => c.changes?.some(ch => ch.field === 'registration_open')).length
    },
    strategyEffectiveness: {},
    campsNeedingAttention: results
      .filter(r => r.quality < 60)
      .sort((a, b) => (a.quality || 0) - (b.quality || 0))
      .slice(0, 10)
      .map(r => ({
        id: r.campId,
        name: r.campName,
        quality: r.quality,
        bestStrategy: r.bestStrategy
      }))
  };

  // Calculate strategy effectiveness
  const strategyStats = {};
  for (const result of results) {
    for (const [strategy, quality] of Object.entries(result.strategyQualities || {})) {
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { attempts: 0, totalQuality: 0 };
      }
      strategyStats[strategy].attempts++;
      strategyStats[strategy].totalQuality += quality;
    }
  }

  for (const [strategy, stats] of Object.entries(strategyStats)) {
    report.strategyEffectiveness[strategy] = {
      attempts: stats.attempts,
      avgQuality: Math.round(stats.totalQuality / stats.attempts)
    };
  }

  return report;
}

export default {
  scoreDataQuality,
  mergeExtractions,
  detectChanges,
  validateExtraction,
  logPipelineRun,
  logChanges,
  generateWeeklyReport
};
