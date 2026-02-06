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
 * Quality tier definitions
 * Tiers categorize camps by data quality for prioritized improvement
 */
export const QUALITY_TIERS = {
  GOLD: {
    name: 'Gold',
    minScore: 80,
    description: 'Complete data, high confidence',
    action: 'maintain',
    color: '#FFD700'
  },
  SILVER: {
    name: 'Silver',
    minScore: 60,
    description: 'Good data, some gaps',
    action: 'schedule_next_cycle',
    color: '#C0C0C0'
  },
  BRONZE: {
    name: 'Bronze',
    minScore: 40,
    description: 'Partial data, needs enrichment',
    action: 'flag_for_review',
    color: '#CD7F32'
  },
  NEEDS_WORK: {
    name: 'Needs Work',
    minScore: 0,
    description: 'Significant gaps, priority for Claude/manual',
    action: 'trigger_claude_extraction',
    color: '#FF6B6B'
  }
};

/**
 * Determine quality tier based on score
 * @param {number} score - Quality score (0-100)
 * @returns {Object} Tier information with name, description, action, and recommendations
 */
export function getQualityTier(score) {
  if (score >= QUALITY_TIERS.GOLD.minScore) {
    return {
      tier: 'gold',
      ...QUALITY_TIERS.GOLD,
      recommendations: [
        'Periodic verification (monthly)',
        'Monitor for price/availability changes',
        'No immediate action needed'
      ]
    };
  } else if (score >= QUALITY_TIERS.SILVER.minScore) {
    return {
      tier: 'silver',
      ...QUALITY_TIERS.SILVER,
      recommendations: [
        'Schedule for next scrape cycle',
        'Consider targeted page discovery for missing fields',
        'Check for PDF schedules or registration forms'
      ]
    };
  } else if (score >= QUALITY_TIERS.BRONZE.minScore) {
    return {
      tier: 'bronze',
      ...QUALITY_TIERS.BRONZE,
      recommendations: [
        'Flag for manual review',
        'Try alternate scraping strategies',
        'Check camp config for site-specific URLs',
        'Consider screenshot capture for vision analysis'
      ]
    };
  } else {
    return {
      tier: 'needs_work',
      ...QUALITY_TIERS.NEEDS_WORK,
      recommendations: [
        'Auto-trigger Claude extraction',
        'Priority for Claude session semantic extraction',
        'Manual data entry may be required',
        'Verify website URL is correct and active'
      ]
    };
  }
}

/**
 * Get tier-specific action recommendations
 * @param {string} tierName - Tier name (gold, silver, bronze, needs_work)
 * @param {Object} campData - Camp data for context-aware recommendations
 * @returns {Object} Action details with steps and priority
 */
export function getTierRecommendations(tierName, campData = {}) {
  const extracted = campData.extracted || {};
  const missingFields = [];

  // Identify specific missing fields
  if (!extracted.pricing_tiers || !hasPricingData(extracted.pricing_tiers)) {
    missingFields.push('pricing');
  }
  if (!extracted.sessions || extracted.sessions.length === 0) {
    missingFields.push('sessions');
  }
  if (!extracted.hours) {
    missingFields.push('hours');
  }
  if (extracted.has_extended_care === undefined || extracted.has_extended_care === null) {
    missingFields.push('extended_care');
  }
  if (!extracted.activities || extracted.activities.length === 0) {
    missingFields.push('activities');
  }

  const recommendations = {
    gold: {
      priority: 'low',
      action: 'maintain',
      schedule: 'monthly',
      steps: [
        'Verify data accuracy periodically',
        'Monitor for price changes',
        'Check registration status as summer approaches'
      ],
      automatable: true
    },
    silver: {
      priority: 'medium',
      action: 'enrich',
      schedule: 'next_cycle',
      steps: [
        `Fill gaps in: ${missingFields.join(', ') || 'minor details'}`,
        'Try Playwright strategy for JS-heavy pages',
        'Look for linked pricing/schedule pages'
      ],
      automatable: true
    },
    bronze: {
      priority: 'high',
      action: 'review',
      schedule: 'asap',
      steps: [
        'Manual review recommended',
        `Critical missing: ${missingFields.slice(0, 3).join(', ')}`,
        'Check if site blocks scrapers',
        'Try screenshot + Claude Vision analysis'
      ],
      automatable: false
    },
    needs_work: {
      priority: 'critical',
      action: 'claude_extraction',
      schedule: 'immediate',
      steps: [
        'Auto-trigger Claude API extraction',
        'If Claude unavailable, capture screenshots for manual analysis',
        'Verify website URL is correct',
        'Consider contacting camp directly for info'
      ],
      missingFields,
      automatable: isClaudeAutoTriggerEnabled()
    }
  };

  return recommendations[tierName] || recommendations.needs_work;
}

/**
 * Check if Claude auto-trigger is enabled (API key available)
 */
function isClaudeAutoTriggerEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Check if pricing object has actual data
 */
function hasPricingData(pricing) {
  if (!pricing) return false;
  return Object.values(pricing).some(v => v !== null && v !== undefined && v !== 0);
}

/**
 * Apply confidence multiplier to a score component
 * Higher confidence extractions contribute more to the score
 * @param {number} baseScore - The base score for the field
 * @param {number} confidence - Confidence score (0-1)
 * @returns {number} Adjusted score
 */
function applyConfidenceMultiplier(baseScore, confidence) {
  if (!confidence || confidence <= 0) {
    // No confidence info - use base score (legacy behavior)
    return baseScore;
  }
  // Scale score by confidence: high confidence (0.9+) = full score, low (0.5) = 70% of score
  // Formula: score * (0.7 + 0.3 * confidence)
  const multiplier = 0.7 + 0.3 * confidence;
  return Math.round(baseScore * multiplier * 100) / 100;
}

/**
 * Score the quality of extracted data (comprehensive scoring)
 * Now factors in confidence scores when available for smarter quality assessment.
 * @param {Object} extracted - Extracted camp data
 * @param {boolean} includeTier - Whether to return tier information (default: false for backward compatibility)
 * @returns {number|Object} Score (0-100) or object with score and tier info
 */
export function scoreDataQuality(extracted, includeTier = false) {
  if (!extracted) {
    if (includeTier) {
      return { score: 0, tier: getQualityTier(0) };
    }
    return 0;
  }

  let score = 0;
  const confidence = extracted._confidence || {};

  // Pricing (30 points max) - most valuable
  if (extracted.pricing_tiers || extracted.pricing) {
    const pricing = extracted.pricing_tiers || extracted.pricing;
    const pricingConf = confidence.pricing || 1;

    // Base price found
    if (pricing.weekly || pricing.weekly_rate || pricing.session || pricing.perSession) {
      const weeklyConf = confidence.pricing_weekly || pricingConf;
      score += applyConfidenceMultiplier(15, weeklyConf);
    }
    // Tier pricing (early bird, member, etc.)
    if (pricing.earlyBird || pricing.early_bird || pricing.member || pricing.member_rate) {
      const tierConf = confidence.pricing_earlyBird || confidence.pricing_member || pricingConf;
      score += applyConfidenceMultiplier(8, tierConf);
    }
    // Half/full day options
    if (pricing.halfDay || pricing.fullDay || pricing.half_day_rate || pricing.daily) {
      const dayConf = confidence.pricing_halfDay || confidence.pricing_fullDay || pricingConf;
      score += applyConfidenceMultiplier(7, dayConf);
    }
  }

  // Sessions (20 points max)
  if (extracted.sessions && Array.isArray(extracted.sessions)) {
    const sessionsConf = confidence.sessions || 1;
    if (extracted.sessions.length > 0) {
      score += applyConfidenceMultiplier(10, sessionsConf);
    }
    if (extracted.sessions.length >= 5) {
      score += applyConfidenceMultiplier(5, sessionsConf);
    }
    // Bonus for 2026 dates
    if (extracted.sessions.some(s => {
      const dateStr = s.dates || s.raw || '';
      return dateStr.includes('2026');
    })) {
      score += applyConfidenceMultiplier(5, sessionsConf);
    }
  }

  // Hours (15 points max)
  if (extracted.hours || extracted.hours_found) {
    const hoursConf = confidence.hours || 1;
    const hours = extracted.hours || extracted.hours_found;
    // Standard hours found
    if (typeof hours === 'string' && hours.includes('-')) {
      score += applyConfidenceMultiplier(10, hoursConf);
    } else if (hours?.standard || hours?.start) {
      score += applyConfidenceMultiplier(10, hoursConf);
    } else if (hours) {
      // Some hours info found
      score += applyConfidenceMultiplier(8, hoursConf);
    }
    // Drop-off/pick-up windows found
    if (extracted.hours_detail?.dropOff || extracted.hours_detail?.pickUp ||
        extracted.drop_off_window || extracted.pick_up_window) {
      const windowConf = confidence.drop_off_window || confidence.pick_up_window || hoursConf;
      score += applyConfidenceMultiplier(5, windowConf);
    }
  }

  // Extended care (15 points max)
  if (extracted.has_extended_care !== undefined && extracted.has_extended_care !== null) {
    const ecConf = confidence.extended_care || 1;
    score += applyConfidenceMultiplier(8, ecConf);
    // Extended care hours documented
    if (extracted.extended_care_hours || extracted.hours_detail?.extendedBefore ||
        extracted.hours_detail?.extendedAfter) {
      const ecHoursConf = confidence.extended_care_hours || ecConf;
      score += applyConfidenceMultiplier(4, ecHoursConf);
    }
    // Extended care cost documented
    if (extracted.extended_care_cost) {
      const ecCostConf = confidence.extended_care_cost || ecConf;
      score += applyConfidenceMultiplier(3, ecCostConf);
    }
  } else if (extracted.extended_care_details) {
    // Partial info about extended care
    score += 5;
  }

  // Ages (10 points max)
  if (extracted.age_groups && Array.isArray(extracted.age_groups) && extracted.age_groups.length > 0) {
    score += 10;
  } else if (extracted.min_age || extracted.max_age || extracted.ages?.min) {
    const ageConf = confidence.min_age || confidence.max_age || 1;
    score += applyConfidenceMultiplier(7, ageConf);
  }

  // Activities (10 points max)
  if (extracted.activities && Array.isArray(extracted.activities)) {
    const actConf = confidence.activities || 1;
    if (extracted.activities.length > 0) {
      score += applyConfidenceMultiplier(5, actConf);
    }
    if (extracted.activities.length >= 5) {
      score += applyConfidenceMultiplier(3, actConf);
    }
    if (extracted.activities.length >= 10) {
      score += applyConfidenceMultiplier(2, actConf);
    }
  }

  // Registration (5 points max - bonus)
  if (extracted.registration || extracted.availability) {
    const reg = extracted.registration || extracted.availability;
    if (reg.status || reg.isOpen !== undefined) score += 3;
    if (reg.opens_date || reg.openingDate) score += 2;
  }

  const finalScore = Math.min(100, Math.round(score));

  if (includeTier) {
    return {
      score: finalScore,
      tier: getQualityTier(finalScore)
    };
  }

  return finalScore;
}

/**
 * Get comprehensive quality assessment for a camp
 * Includes score, tier, breakdown, and recommendations
 * @param {Object} extracted - Extracted camp data
 * @param {Object} campData - Full camp data for context
 * @returns {Object} Complete quality assessment
 */
export function getQualityAssessment(extracted, campData = {}) {
  const scoreResult = scoreDataQuality(extracted, true);

  // Calculate score breakdown
  const breakdown = {
    pricing: 0,
    sessions: 0,
    hours: 0,
    extended_care: 0,
    ages: 0,
    activities: 0,
    registration: 0
  };

  if (extracted) {
    // Pricing breakdown
    if (extracted.pricing_tiers || extracted.pricing) {
      const pricing = extracted.pricing_tiers || extracted.pricing;
      if (pricing.weekly || pricing.weekly_rate || pricing.session || pricing.perSession) {
        breakdown.pricing += 15;
      }
      if (pricing.earlyBird || pricing.early_bird || pricing.member || pricing.member_rate) {
        breakdown.pricing += 8;
      }
      if (pricing.halfDay || pricing.fullDay || pricing.half_day_rate || pricing.daily) {
        breakdown.pricing += 7;
      }
    }

    // Sessions breakdown
    if (extracted.sessions && Array.isArray(extracted.sessions)) {
      if (extracted.sessions.length > 0) breakdown.sessions += 10;
      if (extracted.sessions.length >= 5) breakdown.sessions += 5;
      if (extracted.sessions.some(s => (s.dates || s.raw || '').includes('2026'))) {
        breakdown.sessions += 5;
      }
    }

    // Hours breakdown
    if (extracted.hours) {
      if (typeof extracted.hours === 'string' && extracted.hours.includes('-')) {
        breakdown.hours += 10;
      } else if (extracted.hours.standard || extracted.hours.start) {
        breakdown.hours += 10;
      }
      if (extracted.hours_detail?.dropOff || extracted.hours_detail?.pickUp) {
        breakdown.hours += 5;
      }
    }

    // Extended care breakdown
    if (extracted.has_extended_care !== undefined && extracted.has_extended_care !== null) {
      breakdown.extended_care += 8;
      if (extracted.extended_care_hours || extracted.hours_detail?.extendedBefore) {
        breakdown.extended_care += 4;
      }
      if (extracted.extended_care_cost) {
        breakdown.extended_care += 3;
      }
    }

    // Ages breakdown
    if (extracted.age_groups && Array.isArray(extracted.age_groups) && extracted.age_groups.length > 0) {
      breakdown.ages = 10;
    } else if (extracted.min_age || extracted.max_age) {
      breakdown.ages = 7;
    }

    // Activities breakdown
    if (extracted.activities && Array.isArray(extracted.activities)) {
      if (extracted.activities.length > 0) breakdown.activities += 5;
      if (extracted.activities.length >= 5) breakdown.activities += 3;
      if (extracted.activities.length >= 10) breakdown.activities += 2;
    }

    // Registration breakdown
    if (extracted.registration || extracted.availability) {
      const reg = extracted.registration || extracted.availability;
      if (reg.status || reg.isOpen !== undefined) breakdown.registration += 3;
      if (reg.opens_date || reg.openingDate) breakdown.registration += 2;
    }
  }

  // Get recommendations
  const recommendations = getTierRecommendations(scoreResult.tier.tier, campData);

  return {
    score: scoreResult.score,
    tier: scoreResult.tier.tier,
    tierName: scoreResult.tier.name,
    tierDescription: scoreResult.tier.description,
    tierColor: scoreResult.tier.color,
    action: scoreResult.tier.action,
    breakdown,
    recommendations: scoreResult.tier.recommendations,
    actionPlan: recommendations
  };
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
 * Generate weekly report with tier-based grouping
 */
export function generateWeeklyReport(results, changes) {
  // Group results by tier
  const tierGroups = {
    gold: [],
    silver: [],
    bronze: [],
    needs_work: []
  };

  for (const result of results) {
    const tier = getQualityTier(result.quality || 0);
    tierGroups[tier.tier].push({
      id: result.campId,
      name: result.campName,
      quality: result.quality || 0,
      bestStrategy: result.bestStrategy,
      url: result.url
    });
  }

  // Sort each tier by quality (descending for gold/silver, ascending for bronze/needs_work)
  tierGroups.gold.sort((a, b) => b.quality - a.quality);
  tierGroups.silver.sort((a, b) => b.quality - a.quality);
  tierGroups.bronze.sort((a, b) => a.quality - b.quality);
  tierGroups.needs_work.sort((a, b) => a.quality - b.quality);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCamps: results.length,
      successfulExtractions: results.filter(r => r.quality >= 60).length,
      needsReview: results.filter(r => r.quality < 60 && r.quality > 0).length,
      failed: results.filter(r => r.quality === 0).length,
      avgQuality: Math.round(results.reduce((sum, r) => sum + (r.quality || 0), 0) / results.length)
    },
    tierSummary: {
      gold: {
        count: tierGroups.gold.length,
        percentage: Math.round((tierGroups.gold.length / results.length) * 100),
        description: QUALITY_TIERS.GOLD.description,
        action: 'Maintain with periodic verification'
      },
      silver: {
        count: tierGroups.silver.length,
        percentage: Math.round((tierGroups.silver.length / results.length) * 100),
        description: QUALITY_TIERS.SILVER.description,
        action: 'Schedule for next scrape cycle'
      },
      bronze: {
        count: tierGroups.bronze.length,
        percentage: Math.round((tierGroups.bronze.length / results.length) * 100),
        description: QUALITY_TIERS.BRONZE.description,
        action: 'Flag for manual review'
      },
      needs_work: {
        count: tierGroups.needs_work.length,
        percentage: Math.round((tierGroups.needs_work.length / results.length) * 100),
        description: QUALITY_TIERS.NEEDS_WORK.description,
        action: 'Auto-trigger Claude extraction'
      }
    },
    tierDetails: {
      gold: {
        camps: tierGroups.gold,
        recommendations: [
          'No immediate action required',
          'Schedule monthly verification checks',
          'Monitor for price/availability changes'
        ]
      },
      silver: {
        camps: tierGroups.silver,
        recommendations: [
          'Include in next weekly scrape',
          'Try additional page discovery for missing data',
          'Check for PDF schedules or registration forms'
        ]
      },
      bronze: {
        camps: tierGroups.bronze,
        recommendations: [
          'Manual review recommended',
          'Try screenshot + Claude Vision analysis',
          'Verify camp website URLs are correct',
          'Check camp config files for site-specific hints'
        ]
      },
      needs_work: {
        camps: tierGroups.needs_work,
        recommendations: [
          'Priority: Run Claude semantic extraction',
          'Capture screenshots for vision analysis',
          'Consider contacting camp directly',
          'Manual data entry may be required'
        ],
        autoTriggerEnabled: !!process.env.ANTHROPIC_API_KEY
      }
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
        tier: getQualityTier(r.quality || 0).tier,
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

/**
 * Generate tier summary for console output
 * @param {Object} tierSummary - Tier summary from report
 * @returns {string} Formatted tier summary for console
 */
export function formatTierSummary(tierSummary) {
  const lines = [
    '',
    '  QUALITY TIERS',
    '  ' + '-'.repeat(50),
    `  Gold (80+):       ${tierSummary.gold.count.toString().padStart(3)} camps (${tierSummary.gold.percentage}%) - ${tierSummary.gold.action}`,
    `  Silver (60-79):   ${tierSummary.silver.count.toString().padStart(3)} camps (${tierSummary.silver.percentage}%) - ${tierSummary.silver.action}`,
    `  Bronze (40-59):   ${tierSummary.bronze.count.toString().padStart(3)} camps (${tierSummary.bronze.percentage}%) - ${tierSummary.bronze.action}`,
    `  Needs Work (<40): ${tierSummary.needs_work.count.toString().padStart(3)} camps (${tierSummary.needs_work.percentage}%) - ${tierSummary.needs_work.action}`,
    ''
  ];
  return lines.join('\n');
}

export default {
  scoreDataQuality,
  mergeExtractions,
  detectChanges,
  validateExtraction,
  logPipelineRun,
  logChanges,
  generateWeeklyReport,
  // Quality tiering exports
  QUALITY_TIERS,
  getQualityTier,
  getTierRecommendations,
  getQualityAssessment,
  formatTierSummary
};
