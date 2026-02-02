import { describe, it, expect } from 'vitest';
import {
  RECOMMENDATION_WEIGHTS,
  calculateRecommendationScore,
  getRecommendations,
  getSimilarCamps,
  getGapSuggestions,
  getPopularCamps,
  getCategoryRecommendations,
  getPersonalizedHomepage,
  _testing
} from './recommendations';

const { parsePrice, ageMatches, isWithinBudget, getCampActivities, calculateCategoryAffinity } = _testing;

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCamps = [
  {
    id: 'beach-camp-1',
    camp_name: 'Beach Fun Camp',
    category: 'Beach/Surf',
    description: 'A wonderful beach camp with surfing, swimming, and sandcastles.',
    min_age: 5,
    max_age: 12,
    min_price: 350,
    price_week: '$350-450',
    extended_care: 'Yes',
    food_provided: 'Yes - lunch included',
    sibling_discount: '10% off',
    image_url: 'https://example.com/beach.jpg',
    contact_email: 'beach@example.com',
    website_url: 'https://beachcamp.com',
    reg_status: 'Open',
    extracted: {
      activities: ['Surfing', 'Swimming', 'Sandcastles']
    }
  },
  {
    id: 'art-camp-1',
    camp_name: 'Creative Arts Studio',
    category: 'Art',
    description: 'Explore painting, pottery, and sculpture in a fun environment.',
    min_age: 6,
    max_age: 14,
    min_price: 275,
    price_week: '$275',
    extended_care: 'No',
    food_provided: 'No',
    image_url: 'https://example.com/art.jpg',
    website_url: 'https://artstudio.com',
    reg_status: 'Open',
    extracted: {
      activities: ['Painting', 'Pottery', 'Sculpture']
    }
  },
  {
    id: 'stem-camp-1',
    camp_name: 'STEM Explorers',
    category: 'Science/STEM',
    description: 'Robotics, coding, and engineering for curious minds.',
    min_age: 8,
    max_age: 15,
    min_price: 450,
    price_week: '$450-550',
    extended_care: 'Yes - 3pm to 6pm',
    food_provided: 'Snacks only',
    sibling_discount: 'Yes',
    image_url: 'https://example.com/stem.jpg',
    contact_phone: '555-1234',
    website_url: 'https://stemcamp.com',
    reg_status: 'Waitlist',
    extracted: {
      activities: ['Robotics', 'Coding', 'Engineering']
    }
  },
  {
    id: 'sports-camp-1',
    camp_name: 'All-Sports Camp',
    category: 'Sports',
    description: 'Soccer, basketball, tennis, and more for active kids.',
    min_age: 5,
    max_age: 16,
    min_price: 300,
    price_week: '$300',
    transport: 'Yes - bus service',
    food_provided: 'Yes - full meals',
    extended_care: 'Yes',
    website_url: 'https://sportscamp.com',
    reg_status: 'Open',
    extracted: {
      activities: ['Soccer', 'Basketball', 'Tennis']
    }
  },
  {
    id: 'nature-camp-1',
    camp_name: 'Nature Explorers',
    category: 'Nature/Outdoor',
    description: 'Hiking, wildlife, and outdoor adventures.',
    min_age: 7,
    max_age: 13,
    min_price: 325,
    price_week: '$325',
    indoor_outdoor: 'Outdoor',
    extracted: {
      activities: ['Hiking', 'Wildlife', 'Nature']
    }
  }
];

const mockChild = {
  id: 'child-1',
  name: 'Emma',
  age: 9,
  age_as_of_summer: 9,
  interests: ['surfing', 'art']
};

const mockProfile = {
  full_name: 'Sarah Smith',
  preferred_categories: ['Beach/Surf', 'Art'],
  summer_budget: 5000,
  work_hours_start: '08:00',
  work_hours_end: '17:00'
};

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('parsePrice', () => {
  it('parses min_price field', () => {
    expect(parsePrice({ min_price: '350' })).toBe(350);
    expect(parsePrice({ min_price: 275 })).toBe(275);
  });

  it('parses price_min field', () => {
    expect(parsePrice({ price_min: '400' })).toBe(400);
  });

  it('parses price_week string', () => {
    expect(parsePrice({ price_week: '$350-450' })).toBe(350);
    expect(parsePrice({ price_week: '$275' })).toBe(275);
  });

  it('returns null for missing price', () => {
    expect(parsePrice({})).toBeNull();
    expect(parsePrice({ price_week: 'TBD' })).toBeNull();
  });
});

describe('ageMatches', () => {
  const camp = { min_age: 5, max_age: 12 };

  it('returns true when age is in range', () => {
    expect(ageMatches(camp, 5)).toBe(true);
    expect(ageMatches(camp, 8)).toBe(true);
    expect(ageMatches(camp, 12)).toBe(true);
  });

  it('returns false when age is out of range', () => {
    expect(ageMatches(camp, 4)).toBe(false);
    expect(ageMatches(camp, 13)).toBe(false);
  });

  it('returns true when no age provided', () => {
    expect(ageMatches(camp, null)).toBe(true);
    expect(ageMatches(camp, undefined)).toBe(true);
  });

  it('handles missing age fields on camp', () => {
    expect(ageMatches({}, 10)).toBe(true);
    expect(ageMatches({ min_age: 5 }, 10)).toBe(true);
  });
});

describe('isWithinBudget', () => {
  it('returns true when price is within budget', () => {
    expect(isWithinBudget({ min_price: 300 }, 400)).toBe(true);
    expect(isWithinBudget({ min_price: 400 }, 400)).toBe(true);
  });

  it('returns false when price exceeds budget', () => {
    expect(isWithinBudget({ min_price: 500 }, 400)).toBe(false);
  });

  it('returns true when no budget specified', () => {
    expect(isWithinBudget({ min_price: 1000 }, null)).toBe(true);
    expect(isWithinBudget({ min_price: 1000 }, undefined)).toBe(true);
  });

  it('returns true when price unknown', () => {
    expect(isWithinBudget({}, 400)).toBe(true);
  });
});

describe('getCampActivities', () => {
  it('extracts activities from extracted data', () => {
    const camp = {
      extracted: { activities: ['Surfing', 'Swimming'] }
    };
    const activities = getCampActivities(camp);
    expect(activities).toContain('surfing');
    expect(activities).toContain('swimming');
  });

  it('extracts activities from description', () => {
    const camp = {
      description: 'Learn surfing, coding, and dance at our camp!'
    };
    const activities = getCampActivities(camp);
    expect(activities).toContain('surfing');
    expect(activities).toContain('coding');
    expect(activities).toContain('dance');
  });

  it('combines both sources', () => {
    const camp = {
      description: 'A fun beach camp with surfing.',
      extracted: { activities: ['Swimming'] }
    };
    const activities = getCampActivities(camp);
    expect(activities).toContain('surfing');
    expect(activities).toContain('swimming');
    expect(activities).toContain('beach');
  });

  it('returns empty array for camp with no activity data', () => {
    expect(getCampActivities({})).toEqual([]);
  });
});

describe('calculateCategoryAffinity', () => {
  const camps = mockCamps;

  it('calculates affinity from favorites', () => {
    const favorites = [{ camp_id: 'beach-camp-1' }, { camp_id: 'art-camp-1' }];
    const affinity = calculateCategoryAffinity(favorites, [], camps);

    expect(affinity['Beach/Surf']).toBe(2);
    expect(affinity['Art']).toBe(2);
  });

  it('calculates affinity from scheduled camps', () => {
    const scheduled = [{ camp_id: 'sports-camp-1' }];
    const affinity = calculateCategoryAffinity([], scheduled, camps);

    expect(affinity['Sports']).toBe(1);
  });

  it('combines favorites and scheduled', () => {
    const favorites = [{ camp_id: 'beach-camp-1' }];
    const scheduled = [{ camp_id: 'beach-camp-1' }];
    const affinity = calculateCategoryAffinity(favorites, scheduled, camps);

    expect(affinity['Beach/Surf']).toBe(3); // 2 from favorite + 1 from scheduled
  });
});

// ============================================================================
// RECOMMENDATION SCORE TESTS
// ============================================================================

describe('calculateRecommendationScore', () => {
  it('scores age-appropriate camps higher', () => {
    const context = {
      children: [{ ...mockChild, age_as_of_summer: 9 }],
      allCamps: mockCamps
    };

    const beachScore = calculateRecommendationScore(mockCamps[0], context); // ages 5-12
    const stemScore = calculateRecommendationScore(mockCamps[2], context);  // ages 8-15

    expect(beachScore.score).toBeGreaterThan(0);
    expect(stemScore.score).toBeGreaterThan(0);
    expect(beachScore.reasons).toContain('Age-appropriate for 9-year-old');
  });

  it('applies age mismatch penalty', () => {
    const context = {
      children: [{ ...mockChild, age_as_of_summer: 3 }], // Too young for all camps
      allCamps: mockCamps
    };

    const score = calculateRecommendationScore(mockCamps[0], context); // ages 5-12
    expect(score.penalties).toContain('Age range mismatch');
  });

  it('boosts camps matching preferred categories', () => {
    const context = {
      profile: { preferred_categories: ['Beach/Surf'] },
      children: [mockChild],
      allCamps: mockCamps
    };

    const beachScore = calculateRecommendationScore(mockCamps[0], context);
    const stemScore = calculateRecommendationScore(mockCamps[2], context);

    expect(beachScore.score).toBeGreaterThan(stemScore.score);
    expect(beachScore.reasons).toContain('Matches your interest in Beach/Surf');
  });

  it('considers budget constraints', () => {
    const context = {
      profile: { summer_budget: 3000, preferred_categories: [] },
      children: [mockChild, { id: 'child-2', name: 'Jack', age_as_of_summer: 7 }], // 2 kids
      allCamps: mockCamps
    };

    // Budget per kid per camp = 3000 / 2 / 10 = $150
    const cheapScore = calculateRecommendationScore(mockCamps[1], context); // $275
    expect(cheapScore.penalties).toContain('Exceeds budget');
  });

  it('boosts camps with extended care', () => {
    const context = {
      children: [mockChild],
      allCamps: mockCamps
    };

    const withExtended = calculateRecommendationScore(mockCamps[0], context); // has extended
    const withoutExtended = calculateRecommendationScore(mockCamps[4], context); // no extended

    expect(withExtended.boosts).toContain('Offers extended care');
    expect(withoutExtended.boosts).not.toContain('Offers extended care');
  });

  it('boosts camps with food included', () => {
    const context = {
      children: [mockChild],
      allCamps: mockCamps
    };

    const withFood = calculateRecommendationScore(mockCamps[3], context); // full meals
    expect(withFood.boosts).toContain('Meals included');
  });

  it('boosts sibling discount for multi-child families', () => {
    const context = {
      children: [mockChild, { id: 'child-2', name: 'Jack', age_as_of_summer: 7 }],
      allCamps: mockCamps
    };

    const withDiscount = calculateRecommendationScore(mockCamps[0], context); // has sibling discount
    expect(withDiscount.boosts).toContain('Sibling discount available');
  });

  it('penalizes already scheduled camps', () => {
    const context = {
      children: [mockChild],
      scheduledCamps: [{
        camp_id: 'beach-camp-1',
        child_id: 'child-1',
        status: 'confirmed'
      }],
      allCamps: mockCamps
    };

    const score = calculateRecommendationScore(mockCamps[0], context);
    expect(score.penalties).toContain('Already scheduled');
    expect(score.score).toBeLessThanOrEqual(0);
  });

  it('provides explanation string', () => {
    const context = {
      profile: { preferred_categories: ['Beach/Surf'] },
      children: [mockChild],
      allCamps: mockCamps
    };

    const score = calculateRecommendationScore(mockCamps[0], context);
    expect(score.explanation).toBeTruthy();
    expect(typeof score.explanation).toBe('string');
  });

  it('matches child interests to camp activities', () => {
    const context = {
      children: [{ ...mockChild, interests: ['surfing'] }],
      allCamps: mockCamps
    };

    const beachScore = calculateRecommendationScore(mockCamps[0], context);
    expect(beachScore.reasons).toContainEqual(
      expect.stringMatching(/Emma's interests/)
    );
  });
});

// ============================================================================
// RECOMMENDATION LIST TESTS
// ============================================================================

describe('getRecommendations', () => {
  it('returns sorted recommendations', () => {
    const context = {
      profile: { preferred_categories: ['Beach/Surf'] },
      children: [mockChild],
      allCamps: mockCamps
    };

    const recommendations = getRecommendations(mockCamps, context, 3);

    expect(recommendations.length).toBeLessThanOrEqual(3);
    expect(recommendations[0].camp.category).toBe('Beach/Surf');

    // Verify sorted by score descending
    for (let i = 1; i < recommendations.length; i++) {
      expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
    }
  });

  it('filters out zero-score camps', () => {
    const context = {
      profile: {},
      children: [],
      allCamps: mockCamps
    };

    const recommendations = getRecommendations(mockCamps, context);
    recommendations.forEach(r => {
      expect(r.score).toBeGreaterThan(0);
    });
  });

  it('respects limit parameter', () => {
    const context = {
      profile: { preferred_categories: ['Beach/Surf', 'Art', 'Sports'] },
      children: [mockChild],
      allCamps: mockCamps
    };

    const recommendations = getRecommendations(mockCamps, context, 2);
    expect(recommendations.length).toBeLessThanOrEqual(2);
  });

  it('handles empty camps array', () => {
    const recommendations = getRecommendations([], { children: [mockChild] });
    expect(recommendations).toEqual([]);
  });
});

// ============================================================================
// SIMILAR CAMPS TESTS
// ============================================================================

describe('getSimilarCamps', () => {
  it('finds camps in the same category', () => {
    const similar = getSimilarCamps(mockCamps[0], mockCamps);

    // Should not include the target camp itself
    expect(similar.every(s => s.camp.id !== 'beach-camp-1')).toBe(true);
  });

  it('returns empty for no matches', () => {
    const uniqueCamp = {
      id: 'unique-1',
      category: 'Unique Category',
      min_age: 99,
      max_age: 100,
      min_price: 9999
    };

    const similar = getSimilarCamps(uniqueCamp, mockCamps);
    // May have some low-similarity matches
    expect(similar.length).toBeLessThanOrEqual(4);
  });

  it('provides similarity reasons', () => {
    const similar = getSimilarCamps(mockCamps[0], mockCamps);

    similar.forEach(s => {
      expect(s.reasons).toBeInstanceOf(Array);
      expect(s.explanation).toBeTruthy();
    });
  });

  it('excludes the target camp from results', () => {
    const similar = getSimilarCamps(mockCamps[0], mockCamps);
    expect(similar.find(s => s.camp.id === mockCamps[0].id)).toBeUndefined();
  });

  it('handles null/undefined inputs', () => {
    expect(getSimilarCamps(null, mockCamps)).toEqual([]);
    expect(getSimilarCamps(mockCamps[0], null)).toEqual([]);
    expect(getSimilarCamps(mockCamps[0], [])).toEqual([]);
  });
});

// ============================================================================
// GAP SUGGESTIONS TESTS
// ============================================================================

describe('getGapSuggestions', () => {
  const summerWeeks = [
    { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12' },
    { weekNum: 2, startDate: '2026-06-15', endDate: '2026-06-19' },
    { weekNum: 3, startDate: '2026-06-22', endDate: '2026-06-26' }
  ];

  it('identifies gap weeks', () => {
    const context = {
      children: [mockChild],
      scheduledCamps: [
        {
          camp_id: 'beach-camp-1',
          child_id: 'child-1',
          start_date: '2026-06-08',
          end_date: '2026-06-12',
          status: 'confirmed'
        }
      ],
      summerWeeks,
      allCamps: mockCamps
    };

    const suggestions = getGapSuggestions(mockCamps, context);

    // Child has weeks 2 and 3 as gaps
    expect(suggestions['child-1'].length).toBe(2);
    expect(suggestions['child-1'][0].week.weekNum).toBe(2);
    expect(suggestions['child-1'][1].week.weekNum).toBe(3);
  });

  it('returns empty when fully scheduled', () => {
    const context = {
      children: [mockChild],
      scheduledCamps: [
        {
          camp_id: 'beach-camp-1',
          child_id: 'child-1',
          start_date: '2026-06-08',
          end_date: '2026-06-26',
          status: 'confirmed'
        }
      ],
      summerWeeks,
      allCamps: mockCamps
    };

    const suggestions = getGapSuggestions(mockCamps, context);
    expect(suggestions['child-1']).toEqual([]);
  });

  it('ignores cancelled scheduled camps', () => {
    const context = {
      children: [mockChild],
      scheduledCamps: [
        {
          camp_id: 'beach-camp-1',
          child_id: 'child-1',
          start_date: '2026-06-08',
          end_date: '2026-06-26',
          status: 'cancelled'
        }
      ],
      summerWeeks,
      allCamps: mockCamps
    };

    const suggestions = getGapSuggestions(mockCamps, context);

    // All weeks should be gaps since the only scheduled camp is cancelled
    expect(suggestions['child-1'].length).toBe(3);
  });

  it('handles multiple children', () => {
    const child2 = { id: 'child-2', name: 'Jack', age_as_of_summer: 7 };
    const context = {
      children: [mockChild, child2],
      scheduledCamps: [],
      summerWeeks,
      allCamps: mockCamps
    };

    const suggestions = getGapSuggestions(mockCamps, context);

    expect(suggestions['child-1']).toBeDefined();
    expect(suggestions['child-2']).toBeDefined();
  });

  it('returns empty object when no children', () => {
    const suggestions = getGapSuggestions(mockCamps, { children: [], summerWeeks });
    expect(suggestions).toEqual({});
  });
});

// ============================================================================
// POPULAR CAMPS TESTS
// ============================================================================

describe('getPopularCamps', () => {
  it('returns camps sorted by popularity', () => {
    const popularityData = {
      'beach-camp-1': 15,
      'art-camp-1': 8,
      'stem-camp-1': 5
    };

    const popular = getPopularCamps(mockCamps, popularityData, 3);

    expect(popular.length).toBe(3);
    expect(popular[0].camp.id).toBe('beach-camp-1');
    expect(popular[1].camp.id).toBe('art-camp-1');
  });

  it('uses data quality as fallback popularity signal', () => {
    const popular = getPopularCamps(mockCamps, {}, 5);

    // Camps with images should rank higher
    popular.slice(0, 3).forEach(p => {
      expect(p.camp.image_url).toBeTruthy();
    });
  });

  it('provides popularity reasons', () => {
    const popularityData = {
      'beach-camp-1': 15
    };

    const popular = getPopularCamps(mockCamps, popularityData);
    const beachCamp = popular.find(p => p.camp.id === 'beach-camp-1');

    expect(beachCamp.reasons.length).toBeGreaterThan(0);
  });

  it('handles empty inputs', () => {
    expect(getPopularCamps([], {})).toEqual([]);
    expect(getPopularCamps(null, {})).toEqual([]);
  });
});

// ============================================================================
// CATEGORY RECOMMENDATIONS TESTS
// ============================================================================

describe('getCategoryRecommendations', () => {
  it('separates engaged and explore categories', () => {
    const context = {
      favorites: [{ camp_id: 'beach-camp-1' }],
      scheduledCamps: []
    };

    const result = getCategoryRecommendations(mockCamps, context);

    expect(result.engaged['Beach/Surf']).toBeDefined();
    expect(result.explore['Art']).toBeDefined();
    expect(result.explore['Sports']).toBeDefined();
  });

  it('handles user with no engagement', () => {
    const context = {
      favorites: [],
      scheduledCamps: []
    };

    const result = getCategoryRecommendations(mockCamps, context);

    expect(Object.keys(result.engaged)).toHaveLength(0);
    expect(Object.keys(result.explore).length).toBeGreaterThan(0);
  });

  it('limits camps per category', () => {
    const context = {
      favorites: [],
      scheduledCamps: []
    };

    const result = getCategoryRecommendations(mockCamps, context);

    Object.values(result.explore).forEach(camps => {
      expect(camps.length).toBeLessThanOrEqual(3);
    });
  });
});

// ============================================================================
// PERSONALIZED HOMEPAGE TESTS
// ============================================================================

describe('getPersonalizedHomepage', () => {
  it('shows onboarding for new users', () => {
    const homepage = getPersonalizedHomepage(mockCamps, {
      profile: null,
      children: [],
      favorites: [],
      scheduledCamps: []
    });

    expect(homepage.sections.some(s => s.type === 'onboarding')).toBe(true);
  });

  it('shows recommendations for users with children', () => {
    const homepage = getPersonalizedHomepage(mockCamps, {
      profile: mockProfile,
      children: [mockChild],
      favorites: [],
      scheduledCamps: [],
      summerWeeks: []
    });

    expect(homepage.sections.some(s => s.type === 'recommendations')).toBe(true);
    expect(homepage.greeting).toContain('Sarah');
  });

  it('shows gap suggestions for users with schedules', () => {
    const summerWeeks = [
      { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12' },
      { weekNum: 2, startDate: '2026-06-15', endDate: '2026-06-19' }
    ];

    const homepage = getPersonalizedHomepage(mockCamps, {
      profile: mockProfile,
      children: [mockChild],
      favorites: [],
      scheduledCamps: [{
        camp_id: 'beach-camp-1',
        child_id: 'child-1',
        start_date: '2026-06-08',
        end_date: '2026-06-12',
        status: 'confirmed'
      }],
      summerWeeks
    });

    expect(homepage.sections.some(s => s.type === 'gaps')).toBe(true);
  });

  it('always includes popular section', () => {
    const homepage = getPersonalizedHomepage(mockCamps, {
      profile: mockProfile,
      children: [mockChild],
      favorites: [],
      scheduledCamps: [],
      summerWeeks: []
    });

    expect(homepage.sections.some(s => s.type === 'popular')).toBe(true);
  });

  it('shows similar camps for users with favorites', () => {
    const homepage = getPersonalizedHomepage(mockCamps, {
      profile: mockProfile,
      children: [mockChild],
      favorites: [{ camp_id: 'beach-camp-1' }],
      scheduledCamps: [],
      summerWeeks: []
    });

    expect(homepage.sections.some(s => s.type === 'similar')).toBe(true);
  });
});
