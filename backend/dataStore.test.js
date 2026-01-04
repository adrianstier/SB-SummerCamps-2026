import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterCamps } from './dataStore.js';

// Helper to create test camp data
const createCamp = (overrides = {}) => ({
  id: 'test-camp',
  camp_name: 'Test Camp',
  category: 'Sports',
  description: 'A test camp for testing',
  notes: '',
  min_age: 5,
  max_age: 12,
  min_price: 300,
  max_price: 500,
  has_extended_care: false,
  has_transport: false,
  has_sibling_discount: false,
  food_included: false,
  is_closed: false,
  keywords: ['sports', 'outdoor'],
  ...overrides
});

describe('filterCamps', () => {
  describe('closed camps filter', () => {
    it('excludes closed camps by default', () => {
      const camps = [
        createCamp({ id: 'open', is_closed: false }),
        createCamp({ id: 'closed', is_closed: true })
      ];

      const result = filterCamps(camps, {});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('open');
    });

    it('includes closed camps when includeClosed is true', () => {
      const camps = [
        createCamp({ id: 'open', is_closed: false }),
        createCamp({ id: 'closed', is_closed: true })
      ];

      const result = filterCamps(camps, { includeClosed: true });

      expect(result).toHaveLength(2);
    });
  });

  describe('age filter', () => {
    it('filters by specific age', () => {
      const camps = [
        createCamp({ id: 'young', min_age: 5, max_age: 8 }),
        createCamp({ id: 'old', min_age: 10, max_age: 15 }),
        createCamp({ id: 'wide', min_age: 5, max_age: 15 })
      ];

      const result = filterCamps(camps, { age: '7' });

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['young', 'wide']);
    });

    it('handles camps with null ages', () => {
      const camps = [
        createCamp({ id: 'null-age', min_age: null, max_age: null }),
        createCamp({ id: 'has-age', min_age: 5, max_age: 10 })
      ];

      const result = filterCamps(camps, { age: '7' });

      expect(result).toHaveLength(2); // null ages pass through
    });

    it('filters by minAge', () => {
      const camps = [
        createCamp({ id: 'young', min_age: 5, max_age: 8 }),
        createCamp({ id: 'old', min_age: 10, max_age: 15 })
      ];

      const result = filterCamps(camps, { minAge: '9' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('old');
    });

    it('filters by maxAge', () => {
      const camps = [
        createCamp({ id: 'young', min_age: 5, max_age: 8 }),
        createCamp({ id: 'old', min_age: 10, max_age: 15 })
      ];

      const result = filterCamps(camps, { maxAge: '9' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('young');
    });
  });

  describe('category filter', () => {
    it('filters by category', () => {
      const camps = [
        createCamp({ id: 'sports', category: 'Sports' }),
        createCamp({ id: 'art', category: 'Art' }),
        createCamp({ id: 'science', category: 'Science/STEM' })
      ];

      const result = filterCamps(camps, { category: 'Art' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('art');
    });

    it('returns all when category is "All"', () => {
      const camps = [
        createCamp({ id: 'sports', category: 'Sports' }),
        createCamp({ id: 'art', category: 'Art' })
      ];

      const result = filterCamps(camps, { category: 'All' });

      expect(result).toHaveLength(2);
    });
  });

  describe('price filter', () => {
    it('filters by maxPrice', () => {
      const camps = [
        createCamp({ id: 'cheap', min_price: 100, max_price: 200 }),
        createCamp({ id: 'mid', min_price: 300, max_price: 400 }),
        createCamp({ id: 'expensive', min_price: 500, max_price: 700 })
      ];

      const result = filterCamps(camps, { maxPrice: '350' });

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['cheap', 'mid']);
    });

    it('handles camps with null prices', () => {
      const camps = [
        createCamp({ id: 'null-price', min_price: null, max_price: null }),
        createCamp({ id: 'has-price', min_price: 300, max_price: 400 })
      ];

      const result = filterCamps(camps, { maxPrice: '350' });

      expect(result).toHaveLength(2); // null prices pass through
    });
  });

  describe('keywords filter', () => {
    it('filters by single keyword', () => {
      const camps = [
        createCamp({ id: 'outdoor-sports', keywords: ['sports', 'outdoor'] }),
        createCamp({ id: 'indoor-art', keywords: ['art', 'indoor'] }),
        createCamp({ id: 'outdoor-nature', keywords: ['nature', 'outdoor'] })
      ];

      const result = filterCamps(camps, { keywords: ['art'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('indoor-art');
    });

    it('filters by multiple keywords (OR logic)', () => {
      const camps = [
        createCamp({ id: 'outdoor-sports', keywords: ['sports', 'outdoor'] }),
        createCamp({ id: 'indoor-art', keywords: ['art', 'indoor'] }),
        createCamp({ id: 'outdoor-nature', keywords: ['nature', 'outdoor'] })
      ];

      const result = filterCamps(camps, { keywords: ['art', 'sports'] });

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['outdoor-sports', 'indoor-art']);
    });

    it('handles camps with no keywords', () => {
      const camps = [
        createCamp({ id: 'no-keywords', keywords: undefined }),
        createCamp({ id: 'has-keywords', keywords: ['sports'] })
      ];

      const result = filterCamps(camps, { keywords: ['sports'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('has-keywords');
    });
  });

  describe('search filter', () => {
    it('searches camp name', () => {
      const camps = [
        createCamp({ id: 'surf', camp_name: 'Beach Surf Camp' }),
        createCamp({ id: 'art', camp_name: 'Creative Art Studio' })
      ];

      const result = filterCamps(camps, { search: 'surf' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('surf');
    });

    it('searches description', () => {
      const camps = [
        createCamp({ id: 'swim', description: 'Learn swimming and diving' }),
        createCamp({ id: 'art', description: 'Explore painting and drawing' })
      ];

      const result = filterCamps(camps, { search: 'swimming' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('swim');
    });

    it('searches notes', () => {
      const camps = [
        createCamp({ id: 'scholarship', notes: 'Scholarships available' }),
        createCamp({ id: 'regular', notes: 'Regular pricing' })
      ];

      const result = filterCamps(camps, { search: 'scholarship' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('scholarship');
    });

    it('searches category', () => {
      const camps = [
        createCamp({ id: 'stem', category: 'Science/STEM' }),
        createCamp({ id: 'art', category: 'Art' })
      ];

      const result = filterCamps(camps, { search: 'STEM' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stem');
    });

    it('is case insensitive', () => {
      const camps = [
        createCamp({ id: 'surf', camp_name: 'SURF Camp' })
      ];

      const result = filterCamps(camps, { search: 'surf' });

      expect(result).toHaveLength(1);
    });
  });

  describe('feature filters', () => {
    it('filters by hasExtendedCare', () => {
      const camps = [
        createCamp({ id: 'with-care', has_extended_care: true }),
        createCamp({ id: 'no-care', has_extended_care: false })
      ];

      const result = filterCamps(camps, { hasExtendedCare: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('with-care');
    });

    it('filters by hasTransport', () => {
      const camps = [
        createCamp({ id: 'with-transport', has_transport: true }),
        createCamp({ id: 'no-transport', has_transport: false })
      ];

      const result = filterCamps(camps, { hasTransport: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('with-transport');
    });

    it('filters by hasSiblingDiscount', () => {
      const camps = [
        createCamp({ id: 'with-discount', has_sibling_discount: true }),
        createCamp({ id: 'no-discount', has_sibling_discount: false })
      ];

      const result = filterCamps(camps, { hasSiblingDiscount: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('with-discount');
    });

    it('filters by foodIncluded', () => {
      const camps = [
        createCamp({ id: 'with-food', food_included: true }),
        createCamp({ id: 'no-food', food_included: false })
      ];

      const result = filterCamps(camps, { foodIncluded: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('with-food');
    });
  });

  describe('combined filters', () => {
    it('applies multiple filters together', () => {
      const camps = [
        createCamp({
          id: 'perfect',
          category: 'Sports',
          min_age: 8,
          max_age: 14,
          min_price: 300,
          has_extended_care: true
        }),
        createCamp({
          id: 'wrong-category',
          category: 'Art',
          min_age: 8,
          max_age: 14,
          min_price: 300,
          has_extended_care: true
        }),
        createCamp({
          id: 'wrong-age',
          category: 'Sports',
          min_age: 15,
          max_age: 18,
          min_price: 300,
          has_extended_care: true
        }),
        createCamp({
          id: 'no-care',
          category: 'Sports',
          min_age: 8,
          max_age: 14,
          min_price: 300,
          has_extended_care: false
        })
      ];

      const result = filterCamps(camps, {
        category: 'Sports',
        age: '10',
        hasExtendedCare: true
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('perfect');
    });
  });

  describe('edge cases', () => {
    it('returns all camps when no filters applied', () => {
      const camps = [
        createCamp({ id: 'camp-1' }),
        createCamp({ id: 'camp-2' }),
        createCamp({ id: 'camp-3' })
      ];

      const result = filterCamps(camps, {});

      expect(result).toHaveLength(3);
    });

    it('returns empty array when no camps match', () => {
      const camps = [
        createCamp({ id: 'camp-1', category: 'Sports' })
      ];

      const result = filterCamps(camps, { category: 'Art' });

      expect(result).toHaveLength(0);
    });

    it('handles empty camps array', () => {
      const result = filterCamps([], { category: 'Sports' });

      expect(result).toHaveLength(0);
    });

    it('does not modify original camps array', () => {
      const camps = [
        createCamp({ id: 'camp-1' }),
        createCamp({ id: 'camp-2' })
      ];
      const originalLength = camps.length;

      filterCamps(camps, { category: 'Art' });

      expect(camps.length).toBe(originalLength);
    });
  });
});
