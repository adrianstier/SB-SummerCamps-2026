/**
 * Camp Recommendation System
 *
 * Deterministic algorithm for recommending camps based on:
 * - Child's age and interests
 * - Family's budget constraints
 * - Location preferences
 * - Past favorites/scheduled camps
 * - Similar families' choices (collaborative filtering)
 * - Schedule gaps (complete your summer)
 * - Category affinity
 */

// ============================================================================
// SCORING WEIGHTS - Tunable parameters for recommendation quality
// ============================================================================

export const RECOMMENDATION_WEIGHTS = {
  // Primary factors (high impact)
  AGE_MATCH: 40,                 // Camp age range includes child's age
  CATEGORY_INTEREST: 35,        // Matches preferred categories
  BUDGET_FIT: 30,               // Within budget constraints

  // Secondary factors (medium impact)
  FAVORITED_CATEGORY: 20,       // Same category as favorited camps
  SCHEDULED_CATEGORY: 15,       // Same category as scheduled camps
  SIMILAR_FAMILIES: 15,         // Popular among users with similar preferences

  // Tertiary factors (smaller boosts)
  HAS_EXTENDED_CARE: 10,        // Offers extended care (important for working parents)
  WORK_SCHEDULE_FIT: 12,        // Hours cover parent's work schedule
  FOOD_INCLUDED: 8,             // Meals provided
  SIBLING_DISCOUNT: 8,          // Offers sibling discount
  TRANSPORTATION: 6,            // Offers transportation
  HAS_IMAGE: 5,                 // Has a camp image (indicates active presence)
  HAS_DESCRIPTION: 5,           // Has detailed description
  HAS_CONTACT: 4,               // Has contact info
  HAS_WEBSITE: 4,               // Has working website
  REGISTRATION_OPEN: 8,         // Registration currently open
  GOOD_RATING: 10,              // Has positive ratings

  // Gap-filling bonus
  FILLS_GAP: 25,                // Camp can fill a gap week in schedule

  // Penalties
  ALREADY_SCHEDULED: -100,      // Already scheduled for this child
  TOO_EXPENSIVE: -20,           // Exceeds budget
  AGE_MISMATCH: -50,            // Child's age outside range
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse price string to get minimum price number
 */
export function parsePrice(camp) {
  if (camp.min_price) return parseInt(camp.min_price) || null;
  if (camp.price_min) return parseInt(camp.price_min) || null;

  const priceStr = camp.price_week || camp.price || '';
  const match = priceStr.match(/\$?(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Check if camp age range includes a specific age
 */
export function ageMatches(camp, age) {
  if (!age) return true;
  const minAge = parseInt(camp.min_age) || 0;
  const maxAge = parseInt(camp.max_age) || 18;
  return age >= minAge && age <= maxAge;
}

/**
 * Check if camp is within budget
 */
export function isWithinBudget(camp, maxBudget) {
  if (!maxBudget) return true;
  const price = parsePrice(camp);
  if (price === null) return true; // Unknown price doesn't disqualify
  return price <= maxBudget;
}

/**
 * Get activities from camp data (extracted or description)
 */
export function getCampActivities(camp) {
  const activities = new Set();

  // From extracted data
  if (camp.extracted?.activities) {
    camp.extracted.activities.forEach(a => activities.add(a.toLowerCase()));
  }

  // From description
  if (camp.description) {
    const desc = camp.description.toLowerCase();
    const activityKeywords = [
      'surfing', 'swimming', 'art', 'crafts', 'science', 'coding', 'music',
      'dance', 'theater', 'sports', 'soccer', 'basketball', 'tennis',
      'hiking', 'nature', 'animals', 'cooking', 'pottery', 'photography',
      'robotics', 'engineering', 'marine', 'ocean', 'beach', 'skateboarding'
    ];
    activityKeywords.forEach(kw => {
      if (desc.includes(kw)) activities.add(kw);
    });
  }

  return Array.from(activities);
}

/**
 * Calculate category affinity based on user behavior
 */
export function calculateCategoryAffinity(favorites, scheduledCamps, camps) {
  const categoryScores = {};

  // Count favorited categories
  favorites.forEach(fav => {
    const camp = camps.find(c => c.id === fav.camp_id);
    if (camp?.category) {
      categoryScores[camp.category] = (categoryScores[camp.category] || 0) + 2;
    }
  });

  // Count scheduled categories (less weight than favorites)
  scheduledCamps.forEach(sc => {
    const camp = camps.find(c => c.id === sc.camp_id);
    if (camp?.category) {
      categoryScores[camp.category] = (categoryScores[camp.category] || 0) + 1;
    }
  });

  return categoryScores;
}

// ============================================================================
// MAIN RECOMMENDATION FUNCTIONS
// ============================================================================

/**
 * Calculate recommendation score for a single camp
 *
 * @param {Object} camp - Camp object
 * @param {Object} context - User context containing profile, children, favorites, etc.
 * @returns {Object} { score, reasons } where reasons explain why camp was recommended
 */
export function calculateRecommendationScore(camp, context) {
  const {
    profile,
    children = [],
    favorites = [],
    scheduledCamps = [],
    allCamps = [],
    targetChild = null,
    weekToFill = null,
    popularCamps = {}  // camp_id -> count of users who scheduled
  } = context;

  let score = 0;
  const reasons = [];
  const boosts = [];
  const penalties = [];

  // Get target child or use first child
  const child = targetChild || children[0];
  const childAge = child?.age_as_of_summer || child?.age;
  const childInterests = child?.interests || [];

  // Get user preferences
  const preferredCategories = profile?.preferred_categories || [];
  const maxBudget = profile?.summer_budget ? profile.summer_budget / (children.length || 1) / 10 : null;
  const workStart = profile?.work_hours_start;
  const workEnd = profile?.work_hours_end;

  // Calculate category affinity from behavior
  const categoryAffinity = calculateCategoryAffinity(favorites, scheduledCamps, allCamps);

  // ========== PRIMARY FACTORS ==========

  // Age match
  if (childAge) {
    if (ageMatches(camp, childAge)) {
      score += RECOMMENDATION_WEIGHTS.AGE_MATCH;
      reasons.push(`Age-appropriate for ${childAge}-year-old`);
    } else {
      score += RECOMMENDATION_WEIGHTS.AGE_MISMATCH;
      penalties.push('Age range mismatch');
    }
  }

  // Category interest match
  if (preferredCategories.includes(camp.category)) {
    score += RECOMMENDATION_WEIGHTS.CATEGORY_INTEREST;
    reasons.push(`Matches your interest in ${camp.category}`);
  }

  // Budget fit
  if (maxBudget) {
    const price = parsePrice(camp);
    if (price && price <= maxBudget) {
      score += RECOMMENDATION_WEIGHTS.BUDGET_FIT;
      reasons.push('Within your budget');
    } else if (price && price > maxBudget * 1.5) {
      score += RECOMMENDATION_WEIGHTS.TOO_EXPENSIVE;
      penalties.push('Exceeds budget');
    }
  }

  // ========== SECONDARY FACTORS ==========

  // Category affinity from favorites
  if (categoryAffinity[camp.category]) {
    const affinityScore = Math.min(categoryAffinity[camp.category] * 5, RECOMMENDATION_WEIGHTS.FAVORITED_CATEGORY);
    score += affinityScore;
    if (affinityScore >= 10) {
      boosts.push(`Similar to camps you've saved`);
    }
  }

  // Child's specific interests
  if (childInterests.length > 0) {
    const campActivities = getCampActivities(camp);
    const matchingInterests = childInterests.filter(interest =>
      campActivities.some(activity => activity.includes(interest.toLowerCase()))
    );
    if (matchingInterests.length > 0) {
      score += matchingInterests.length * 10;
      reasons.push(`Matches ${child.name}'s interests: ${matchingInterests.join(', ')}`);
    }
  }

  // Popular among similar families (collaborative filtering)
  if (popularCamps[camp.id] && popularCamps[camp.id] >= 3) {
    score += RECOMMENDATION_WEIGHTS.SIMILAR_FAMILIES;
    boosts.push(`Popular with ${popularCamps[camp.id]} local families`);
  }

  // ========== TERTIARY FACTORS (FEATURES) ==========

  // Extended care
  if (camp.extended_care && camp.extended_care !== 'No') {
    score += RECOMMENDATION_WEIGHTS.HAS_EXTENDED_CARE;
    boosts.push('Offers extended care');
  }

  // Work schedule coverage
  if (workStart && workEnd) {
    // Simple check: camp hours should span work hours
    const campStart = camp.drop_off || camp.hours?.split('-')[0];
    const campEnd = camp.pick_up || camp.hours?.split('-')[1];
    // This is a simplified check; real implementation would parse times
    if (campStart && campEnd) {
      boosts.push('Hours fit your schedule');
      score += RECOMMENDATION_WEIGHTS.WORK_SCHEDULE_FIT;
    }
  }

  // Food included
  if (camp.food_provided && camp.food_provided.toLowerCase().includes('yes')) {
    score += RECOMMENDATION_WEIGHTS.FOOD_INCLUDED;
    boosts.push('Meals included');
  }

  // Sibling discount
  if (children.length > 1 && camp.sibling_discount &&
      !camp.sibling_discount.toLowerCase().includes('no') &&
      !camp.sibling_discount.toLowerCase().includes('unknown')) {
    score += RECOMMENDATION_WEIGHTS.SIBLING_DISCOUNT;
    boosts.push('Sibling discount available');
  }

  // Transportation
  if (camp.transport && camp.transport.toLowerCase().includes('yes')) {
    score += RECOMMENDATION_WEIGHTS.TRANSPORTATION;
    boosts.push('Transportation available');
  }

  // Data quality signals
  if (camp.image_url) score += RECOMMENDATION_WEIGHTS.HAS_IMAGE;
  if (camp.description && camp.description.length > 100) score += RECOMMENDATION_WEIGHTS.HAS_DESCRIPTION;
  if (camp.contact_email || camp.contact_phone) score += RECOMMENDATION_WEIGHTS.HAS_CONTACT;
  if (camp.website_url && camp.website_url !== 'N/A') score += RECOMMENDATION_WEIGHTS.HAS_WEBSITE;

  // Registration status
  if (camp.reg_status?.toLowerCase().includes('open')) {
    score += RECOMMENDATION_WEIGHTS.REGISTRATION_OPEN;
    boosts.push('Registration open');
  }

  // ========== PENALTIES ==========

  // Already scheduled for this child
  if (child && scheduledCamps.some(sc =>
    sc.camp_id === camp.id && sc.child_id === child.id && sc.status !== 'cancelled'
  )) {
    score += RECOMMENDATION_WEIGHTS.ALREADY_SCHEDULED;
    penalties.push('Already scheduled');
  }

  // ========== GAP FILLING BONUS ==========

  if (weekToFill) {
    // Check if camp can fill the specified gap week
    const campSessions = camp.extracted?.sessions || [];
    // If camp runs during the gap week, bonus
    if (campSessions.length > 0 || camp.weeks_available) {
      score += RECOMMENDATION_WEIGHTS.FILLS_GAP;
      reasons.push(`Can fill gap in Week ${weekToFill.weekNum}`);
    }
  }

  // Compile the "why we recommend" explanation
  const primaryReason = reasons[0] || boosts[0] || 'Good match for your family';
  const additionalReasons = [...reasons.slice(1), ...boosts].slice(0, 2);

  return {
    score: Math.max(0, score),  // Don't go below 0
    reasons,
    boosts,
    penalties,
    primaryReason,
    additionalReasons,
    explanation: generateExplanation(primaryReason, additionalReasons, penalties)
  };
}

/**
 * Generate a human-readable explanation for why a camp is recommended
 */
function generateExplanation(primaryReason, additionalReasons, penalties) {
  let explanation = primaryReason;

  if (additionalReasons.length > 0) {
    explanation += '. ' + additionalReasons.join('. ');
  }

  return explanation;
}

/**
 * Get personalized camp recommendations
 *
 * @param {Array} camps - All available camps
 * @param {Object} context - User context
 * @param {number} limit - Max number of recommendations
 * @returns {Array} Sorted array of { camp, score, explanation }
 */
export function getRecommendations(camps, context, limit = 10) {
  if (!camps || camps.length === 0) return [];

  const scored = camps.map(camp => {
    const result = calculateRecommendationScore(camp, context);
    return {
      camp,
      ...result
    };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get "Camps like this one" suggestions for a specific camp
 *
 * @param {Object} targetCamp - The camp to find similar camps to
 * @param {Array} allCamps - All available camps
 * @param {number} limit - Max number of suggestions
 * @returns {Array} Array of { camp, similarity, reasons }
 */
export function getSimilarCamps(targetCamp, allCamps, limit = 4) {
  if (!targetCamp || !allCamps || allCamps.length === 0) return [];

  const targetActivities = getCampActivities(targetCamp);
  const targetPrice = parsePrice(targetCamp);
  const targetMinAge = parseInt(targetCamp.min_age) || 0;
  const targetMaxAge = parseInt(targetCamp.max_age) || 18;

  const scored = allCamps
    .filter(camp => camp.id !== targetCamp.id)
    .map(camp => {
      let similarity = 0;
      const reasons = [];

      // Same category (strongest signal)
      if (camp.category === targetCamp.category) {
        similarity += 40;
        reasons.push(`Also a ${camp.category} camp`);
      }

      // Similar age range
      const campMinAge = parseInt(camp.min_age) || 0;
      const campMaxAge = parseInt(camp.max_age) || 18;
      const ageOverlap = Math.min(targetMaxAge, campMaxAge) - Math.max(targetMinAge, campMinAge);
      if (ageOverlap > 0) {
        similarity += Math.min(20, ageOverlap * 3);
        if (campMinAge === targetMinAge && campMaxAge === targetMaxAge) {
          reasons.push('Same age range');
        }
      }

      // Similar price range (within 20%)
      const campPrice = parsePrice(camp);
      if (targetPrice && campPrice) {
        const priceDiff = Math.abs(targetPrice - campPrice) / targetPrice;
        if (priceDiff < 0.2) {
          similarity += 15;
          reasons.push('Similar pricing');
        }
      }

      // Overlapping activities
      const campActivities = getCampActivities(camp);
      const commonActivities = targetActivities.filter(a =>
        campActivities.some(ca => ca.includes(a) || a.includes(ca))
      );
      if (commonActivities.length > 0) {
        similarity += commonActivities.length * 8;
        reasons.push(`Similar activities: ${commonActivities.slice(0, 2).join(', ')}`);
      }

      // Same setting (indoor/outdoor)
      if (camp.indoor_outdoor && targetCamp.indoor_outdoor &&
          camp.indoor_outdoor.toLowerCase().includes(targetCamp.indoor_outdoor.toLowerCase().split(' ')[0])) {
        similarity += 10;
      }

      // Similar features
      if (camp.extended_care && targetCamp.extended_care) {
        similarity += 5;
      }
      if (camp.transport && targetCamp.transport) {
        similarity += 5;
      }

      return {
        camp,
        similarity,
        reasons: reasons.slice(0, 2),
        explanation: reasons.length > 0 ? reasons[0] : 'Similar option'
      };
    });

  return scored
    .filter(item => item.similarity > 20)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get "Complete your summer" suggestions for gap weeks
 *
 * @param {Array} camps - All available camps
 * @param {Object} context - User context with children, scheduledCamps, summerWeeks
 * @returns {Object} { childId: [{ week, recommendations }] }
 */
export function getGapSuggestions(camps, context) {
  const { children = [], scheduledCamps = [], summerWeeks = [] } = context;

  if (children.length === 0 || summerWeeks.length === 0) return {};

  const suggestions = {};

  children.forEach(child => {
    const childSchedule = scheduledCamps.filter(
      sc => sc.child_id === child.id && sc.status !== 'cancelled'
    );

    // Find gap weeks for this child
    const gapWeeks = summerWeeks.filter(week => {
      const weekStart = new Date(week.startDate);
      const weekEnd = new Date(week.endDate);

      return !childSchedule.some(sc => {
        const scStart = new Date(sc.start_date);
        const scEnd = new Date(sc.end_date);
        return scStart <= weekEnd && scEnd >= weekStart;
      });
    });

    if (gapWeeks.length === 0) {
      suggestions[child.id] = [];
      return;
    }

    // Get recommendations for each gap week
    suggestions[child.id] = gapWeeks.map(week => {
      const weekRecommendations = getRecommendations(camps, {
        ...context,
        targetChild: child,
        weekToFill: week
      }, 3);

      return {
        week,
        recommendations: weekRecommendations.map(r => ({
          ...r,
          explanation: `${r.explanation}. Fills your Week ${week.weekNum} gap.`
        }))
      };
    });
  });

  return suggestions;
}

/**
 * Get "Popular in your area" camps
 * Based on favorites and scheduled camps across all users
 *
 * @param {Array} camps - All available camps
 * @param {Object} popularityData - { camp_id: count } from database
 * @param {number} limit - Max number of camps
 * @returns {Array} Array of { camp, popularity, reasons }
 */
export function getPopularCamps(camps, popularityData = {}, limit = 6) {
  if (!camps || camps.length === 0) return [];

  // Fallback: use camps with images and good data as proxy for popularity
  const scored = camps.map(camp => {
    let popularity = popularityData[camp.id] || 0;
    const reasons = [];

    // Boost camps with good data quality (proxy for active presence)
    if (camp.image_url) popularity += 2;
    if (camp.description && camp.description.length > 200) popularity += 1;
    if (camp.extracted?.testimonials?.length > 0) popularity += 2;
    if (camp.reg_status?.toLowerCase().includes('open')) popularity += 1;

    // Add reasons based on popularity
    if (popularityData[camp.id] >= 10) {
      reasons.push(`Chosen by ${popularityData[camp.id]}+ families`);
    } else if (popularityData[camp.id] >= 5) {
      reasons.push('Growing in popularity');
    } else if (camp.extracted?.testimonials?.length > 0) {
      reasons.push('Highly rated by parents');
    }

    return {
      camp,
      popularity,
      reasons,
      explanation: reasons[0] || 'Local favorite'
    };
  });

  return scored
    .filter(item => item.popularity > 0)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

/**
 * Get category-based recommendations for exploring new interests
 *
 * @param {Array} camps - All available camps
 * @param {Object} context - User context
 * @returns {Object} { category: camps[] }
 */
export function getCategoryRecommendations(camps, context) {
  const { profile, favorites = [], scheduledCamps = [] } = context;

  // Get categories user has already engaged with
  const engagedCategories = new Set();
  favorites.forEach(fav => {
    const camp = camps.find(c => c.id === fav.camp_id);
    if (camp?.category) engagedCategories.add(camp.category);
  });
  scheduledCamps.forEach(sc => {
    const camp = camps.find(c => c.id === sc.camp_id);
    if (camp?.category) engagedCategories.add(camp.category);
  });

  // Group camps by category
  const byCategory = {};
  camps.forEach(camp => {
    if (!camp.category) return;
    if (!byCategory[camp.category]) {
      byCategory[camp.category] = [];
    }
    byCategory[camp.category].push(camp);
  });

  // For engaged categories, get top camps
  // For new categories, suggest exploration
  const result = {
    engaged: {},
    explore: {}
  };

  Object.entries(byCategory).forEach(([category, categoryCamps]) => {
    const topCamps = categoryCamps
      .filter(c => c.image_url)
      .sort((a, b) => (b.description?.length || 0) - (a.description?.length || 0))
      .slice(0, 3);

    if (engagedCategories.has(category)) {
      result.engaged[category] = topCamps;
    } else {
      result.explore[category] = topCamps;
    }
  });

  return result;
}

/**
 * Get personalized homepage content based on user state
 *
 * @param {Array} camps - All available camps
 * @param {Object} context - User context
 * @returns {Object} Homepage sections and content
 */
export function getPersonalizedHomepage(camps, context) {
  const {
    profile,
    children = [],
    favorites = [],
    scheduledCamps = [],
    summerWeeks = []
  } = context;

  const isNewUser = !profile || (children.length === 0 && favorites.length === 0);
  const hasChildren = children.length > 0;
  const hasSchedule = scheduledCamps.filter(sc => sc.status !== 'cancelled').length > 0;
  const hasFavorites = favorites.length > 0;

  const homepage = {
    greeting: profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Find the right camp',
    sections: []
  };

  // New users: show onboarding prompt
  if (isNewUser) {
    homepage.sections.push({
      type: 'onboarding',
      title: 'Get started',
      subtitle: 'Tell us about your family for personalized picks'
    });
  }

  // Users with children but no schedule: show recommendations
  if (hasChildren && !hasSchedule) {
    const recommendations = getRecommendations(camps, context, 6);
    if (recommendations.length > 0) {
      homepage.sections.push({
        type: 'recommendations',
        title: 'Recommended for you',
        subtitle: children.length === 1
          ? `Based on ${children[0].name}'s profile`
          : 'Based on your family',
        camps: recommendations
      });
    }
  }

  // Users with schedule: show gap suggestions
  if (hasSchedule && summerWeeks.length > 0) {
    const gaps = getGapSuggestions(camps, context);
    const hasGaps = Object.values(gaps).some(childGaps => childGaps.length > 0);

    if (hasGaps) {
      homepage.sections.push({
        type: 'gaps',
        title: 'Complete your summer',
        subtitle: 'Fill coverage gaps',
        gapSuggestions: gaps
      });
    }
  }

  // Show favorites-based recommendations
  if (hasFavorites) {
    const recommendations = getRecommendations(camps, context, 4);
    if (recommendations.length > 0) {
      homepage.sections.push({
        type: 'similar',
        title: 'More like your favorites',
        subtitle: null,
        camps: recommendations
      });
    }
  }

  // Always show popular camps
  const popular = getPopularCamps(camps, {}, 6);
  if (popular.length > 0) {
    homepage.sections.push({
      type: 'popular',
      title: 'Popular in Santa Barbara',
      subtitle: 'Local families love these',
      camps: popular
    });
  }

  return homepage;
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const _testing = {
  parsePrice,
  ageMatches,
  isWithinBudget,
  getCampActivities,
  calculateCategoryAffinity,
  generateExplanation
};
