import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceShort, formatAgeRange, formatCurrency, formatDate } from './formatters';

describe('formatPrice', () => {
  it('returns price range when min and max differ', () => {
    expect(formatPrice({ min_price: 300, max_price: 500 })).toBe('$300–500/wk');
  });

  it('returns single price when min equals max', () => {
    expect(formatPrice({ min_price: 350, max_price: 350 })).toBe('$350/wk');
  });

  it('returns single price when max is missing', () => {
    expect(formatPrice({ min_price: 400 })).toBe('$400/wk');
  });

  it('returns TBD when no prices', () => {
    expect(formatPrice({})).toBe('TBD');
  });

  it('returns TBD when min_price is 0', () => {
    expect(formatPrice({ min_price: 0 })).toBe('TBD');
  });

  it('returns TBD when min_price is "0"', () => {
    expect(formatPrice({ min_price: '0' })).toBe('TBD');
  });

  it('returns Free when price_week says free', () => {
    expect(formatPrice({ min_price: 0, price_week: 'Free' })).toBe('Free');
  });

  it('returns price_week when available and no min_price', () => {
    expect(formatPrice({ min_price: 0, price_week: '$200-400' })).toBe('$200-400');
  });

  it('returns TBD when price_week is $TBD', () => {
    expect(formatPrice({ min_price: 0, price_week: '$TBD' })).toBe('TBD');
  });

  it('uses price_min alias', () => {
    expect(formatPrice({ price_min: 250, price_max: 400 })).toBe('$250–400/wk');
  });

  it('handles string prices', () => {
    expect(formatPrice({ min_price: '300', max_price: '500' })).toBe('$300–500/wk');
  });

  it('returns price_week when min is NaN', () => {
    expect(formatPrice({ min_price: 'varies', price_week: '$200-400' })).toBe('$200-400');
  });

  it('returns TBD when min is NaN and no price_week', () => {
    expect(formatPrice({ min_price: 'varies' })).toBe('TBD');
  });
});

describe('formatPriceShort', () => {
  it('returns price range without /wk suffix', () => {
    expect(formatPriceShort({ min_price: 300, max_price: 500 })).toBe('$300–500');
  });

  it('returns single price without /wk suffix', () => {
    expect(formatPriceShort({ min_price: 350, max_price: 350 })).toBe('$350');
  });

  it('returns TBD when no prices', () => {
    expect(formatPriceShort({})).toBe('TBD');
  });

  it('returns Free when applicable', () => {
    expect(formatPriceShort({ min_price: 0, price_week: 'Free' })).toBe('Free');
  });
});

describe('formatAgeRange', () => {
  it('returns range when both ages present', () => {
    expect(formatAgeRange({ min_age: 5, max_age: 12 })).toBe('5-12');
  });

  it('returns "All ages" when neither age present', () => {
    expect(formatAgeRange({})).toBe('All ages');
    expect(formatAgeRange({ min_age: null, max_age: null })).toBe('All ages');
  });

  it('returns min+ when only min_age', () => {
    expect(formatAgeRange({ min_age: 5 })).toBe('5+');
  });

  it('returns "Up to X" when only max_age', () => {
    expect(formatAgeRange({ max_age: 12 })).toBe('Up to 12');
  });

  it('returns "Age X" when min equals max', () => {
    expect(formatAgeRange({ min_age: 10, max_age: 10 })).toBe('Age 10');
  });

  it('handles zero as falsy', () => {
    expect(formatAgeRange({ min_age: 0, max_age: 5 })).toBe('Up to 5');
  });
});

describe('formatCurrency', () => {
  it('formats integer amount', () => {
    expect(formatCurrency(2400)).toBe('$2,400');
  });

  it('formats decimal amount without cents', () => {
    expect(formatCurrency(350.99)).toBe('$351');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('returns TBD for null', () => {
    expect(formatCurrency(null)).toBe('TBD');
  });

  it('returns TBD for undefined', () => {
    expect(formatCurrency(undefined)).toBe('TBD');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(12500)).toBe('$12,500');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    // Use a full ISO datetime to avoid timezone ambiguity
    const result = formatDate('2026-06-15T12:00:00');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('accepts custom format options', () => {
    const result = formatDate('2026-06-15', { year: 'numeric', month: 'long', day: 'numeric' });
    expect(result).toContain('June');
    expect(result).toContain('2026');
  });
});
