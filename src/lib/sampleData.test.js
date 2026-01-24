import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({
  getSummerWeeks2026: vi.fn(() => [
    { startDate: '2026-06-08', endDate: '2026-06-12' },
    { startDate: '2026-06-15', endDate: '2026-06-19' },
    { startDate: '2026-06-22', endDate: '2026-06-26' },
    { startDate: '2026-06-29', endDate: '2026-07-03' },
    { startDate: '2026-07-06', endDate: '2026-07-10' },
    { startDate: '2026-07-13', endDate: '2026-07-17' },
  ]),
}));

import { generateSampleChildren, generateSampleSchedule, calculateSampleCost } from './sampleData';

describe('generateSampleChildren', () => {
  it('returns two sample children', () => {
    const children = generateSampleChildren();
    expect(children).toHaveLength(2);
  });

  it('first child is Emma with correct attributes', () => {
    const children = generateSampleChildren();
    const emma = children[0];
    expect(emma.name).toBe('Emma (sample)');
    expect(emma.age_as_of_summer).toBe(8);
    expect(emma.color).toBe('#ec4899');
    expect(emma.is_sample).toBe(true);
    expect(emma.interests).toContain('Art');
    expect(emma.interests).toContain('Beach/Surf');
  });

  it('second child is Jake with correct attributes', () => {
    const children = generateSampleChildren();
    const jake = children[1];
    expect(jake.name).toBe('Jake (sample)');
    expect(jake.age_as_of_summer).toBe(10);
    expect(jake.color).toBe('#3b82f6');
    expect(jake.is_sample).toBe(true);
    expect(jake.interests).toContain('Sports');
    expect(jake.interests).toContain('Science/STEM');
  });

  it('children have valid birth_date strings', () => {
    const children = generateSampleChildren();
    children.forEach(child => {
      expect(child.birth_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('children have avatar_emoji', () => {
    const children = generateSampleChildren();
    expect(children[0].avatar_emoji).toBe('👧');
    expect(children[1].avatar_emoji).toBe('👦');
  });
});

describe('generateSampleSchedule', () => {
  const mockChildren = [
    { id: 'child-1', name: 'Emma (sample)', age_as_of_summer: 8 },
    { id: 'child-2', name: 'Jake (sample)', age_as_of_summer: 10 },
  ];

  const mockCamps = [
    { id: 'art-1', category: 'Art', ages: '5-12', min_price: 300 },
    { id: 'beach-1', category: 'Beach/Surf', ages: '6-14', min_price: 400 },
    { id: 'sports-1', category: 'Sports', ages: '7-14', min_price: 425 },
    { id: 'science-1', category: 'Science/STEM', ages: '8-14', min_price: 475 },
  ];

  it('returns empty array when children is null', () => {
    expect(generateSampleSchedule(null, mockCamps)).toEqual([]);
  });

  it('returns empty array when children has fewer than 2', () => {
    expect(generateSampleSchedule([mockChildren[0]], mockCamps)).toEqual([]);
  });

  it('returns empty array when camps is null', () => {
    expect(generateSampleSchedule(mockChildren, null)).toEqual([]);
  });

  it('returns empty array when camps is empty', () => {
    expect(generateSampleSchedule(mockChildren, [])).toEqual([]);
  });

  it('returns empty array when named children not found', () => {
    const otherChildren = [
      { id: 'c1', name: 'Alice' },
      { id: 'c2', name: 'Bob' },
    ];
    expect(generateSampleSchedule(otherChildren, mockCamps)).toEqual([]);
  });

  it('generates schedule for Emma with art and beach camps', () => {
    const schedule = generateSampleSchedule(mockChildren, mockCamps);
    const emmaCamps = schedule.filter(s => s.child_id === 'child-1');
    expect(emmaCamps.length).toBeGreaterThanOrEqual(2);
    expect(emmaCamps.every(s => s.is_sample)).toBe(true);
  });

  it('generates schedule for Jake with sports and science camps', () => {
    const schedule = generateSampleSchedule(mockChildren, mockCamps);
    const jakeCamps = schedule.filter(s => s.child_id === 'child-2');
    expect(jakeCamps.length).toBeGreaterThanOrEqual(2);
    expect(jakeCamps.every(s => s.is_sample)).toBe(true);
  });

  it('all scheduled camps have required fields', () => {
    const schedule = generateSampleSchedule(mockChildren, mockCamps);
    schedule.forEach(item => {
      expect(item.camp_id).toBeDefined();
      expect(item.child_id).toBeDefined();
      expect(item.start_date).toBeDefined();
      expect(item.end_date).toBeDefined();
      expect(item.price).toBeGreaterThan(0);
      expect(item.status).toBeDefined();
      expect(item.is_sample).toBe(true);
    });
  });

  it('uses camp min_price for price', () => {
    const schedule = generateSampleSchedule(mockChildren, mockCamps);
    const artSchedule = schedule.find(s => s.camp_id === 'art-1');
    if (artSchedule) {
      expect(artSchedule.price).toBe(300);
    }
  });

  it('uses fallback price when camp has no min_price', () => {
    const campsNoPrice = [
      { id: 'art-1', category: 'Art', ages: '5-12' },
      { id: 'beach-1', category: 'Beach/Surf', ages: '6-14' },
      { id: 'sports-1', category: 'Sports', ages: '7-14' },
      { id: 'science-1', category: 'Science/STEM', ages: '8-14' },
    ];
    const schedule = generateSampleSchedule(mockChildren, campsNoPrice);
    schedule.forEach(item => {
      expect(item.price).toBeGreaterThan(0);
    });
  });

  it('uses fallback when no matching category camps exist', () => {
    const genericCamps = [
      { id: 'camp-a', category: 'Other', ages: '5-15', min_price: 200 },
      { id: 'camp-b', category: 'General', ages: '5-15', min_price: 250 },
    ];
    const schedule = generateSampleSchedule(mockChildren, genericCamps);
    // Should use fallback logic - at least 2 camps scheduled
    expect(schedule.length).toBeGreaterThanOrEqual(2);
  });

  it('respects age appropriateness for camps', () => {
    const campsWrongAge = [
      { id: 'fallback-1', category: 'General', ages: '5-18', min_price: 200 },
      { id: 'fallback-2', category: 'Other', ages: '5-18', min_price: 250 },
      { id: 'art-1', category: 'Art', ages: '14-18', min_price: 300 },
      { id: 'beach-1', category: 'Beach/Surf', ages: '14-18', min_price: 400 },
      { id: 'sports-1', category: 'Sports', ages: '14-18', min_price: 425 },
      { id: 'science-1', category: 'Science/STEM', ages: '14-18', min_price: 475 },
    ];
    const schedule = generateSampleSchedule(mockChildren, campsWrongAge);
    // Category-specific camps with ages 14-18 shouldn't match 8/10 year olds
    // Fallback logic uses camps[0] and camps[1] which are the General/Other camps
    const artMatch = schedule.find(s => s.camp_id === 'art-1');
    expect(artMatch).toBeUndefined();
  });

  it('assigns valid statuses', () => {
    const schedule = generateSampleSchedule(mockChildren, mockCamps);
    const validStatuses = ['registered', 'confirmed', 'planned', 'waitlisted'];
    schedule.forEach(item => {
      expect(validStatuses).toContain(item.status);
    });
  });
});

describe('calculateSampleCost', () => {
  it('sums prices of all scheduled camps', () => {
    const camps = [
      { price: 300 },
      { price: 400 },
      { price: 500 },
    ];
    expect(calculateSampleCost(camps)).toBe(1200);
  });

  it('returns 0 for empty array', () => {
    expect(calculateSampleCost([])).toBe(0);
  });

  it('treats missing price as 0', () => {
    const camps = [
      { price: 300 },
      { status: 'planned' },
      { price: 400 },
    ];
    expect(calculateSampleCost(camps)).toBe(700);
  });

  it('handles null price', () => {
    const camps = [
      { price: null },
      { price: 200 },
    ];
    expect(calculateSampleCost(camps)).toBe(200);
  });
});
