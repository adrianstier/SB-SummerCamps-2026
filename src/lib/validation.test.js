import { describe, it, expect } from 'vitest';
import {
  validate,
  sanitizeString,
  ReviewSchema,
  ChildSchema,
  ChildUpdateSchema,
  QuestionSchema,
  AnswerSchema,
  ProfileUpdateSchema,
  ScheduledCampSchema,
  ScheduledCampUpdateSchema,
  FavoriteSchema,
  SquadSchema,
  SquadMembershipSchema,
  ComparisonListSchema,
} from './validation';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('validate helper', () => {
  it('returns success with validated data for valid input', () => {
    const result = validate(ChildSchema, { name: 'Emma' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Emma');
  });

  it('returns failure with error message for invalid input', () => {
    const result = validate(ChildSchema, { name: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns generic message for non-Zod errors', () => {
    // Pass non-object to force a different error path
    const result = validate(ChildSchema, null);
    expect(result.success).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('strips HTML tags', () => {
    expect(sanitizeString('<b>hello</b>')).toBe('hello');
    // Note: parentheses are also stripped as PostgREST chars
    expect(sanitizeString('<script>alert(1)</script>')).toBe('alert1');
  });

  it('removes null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld');
  });

  it('strips PostgREST special characters', () => {
    expect(sanitizeString('hello,world')).toBe('helloworld');
    expect(sanitizeString('test.value')).toBe('testvalue');
    expect(sanitizeString('fn(arg)')).toBe('fnarg');
    expect(sanitizeString('arr[0]')).toBe('arr0');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns non-string values unchanged', () => {
    expect(sanitizeString(123)).toBe(123);
    expect(sanitizeString(null)).toBe(null);
    expect(sanitizeString(undefined)).toBe(undefined);
  });

  it('handles combined dangerous input', () => {
    expect(sanitizeString('<div>test\0,()</div>')).toBe('test');
  });
});

describe('ReviewSchema', () => {
  it('validates a complete review', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 5,
      review_text: 'This camp was absolutely amazing for our kids!',
      pros: 'Great counselors',
      cons: 'Expensive',
      would_recommend: true,
      child_age_at_camp: 8,
      year_attended: 2025,
    });
    expect(result.success).toBe(true);
  });

  it('validates minimal review (only required fields)', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid camp ID format', () => {
    // Camp IDs are slugs (lowercase alphanumeric + hyphens), not UUIDs
    const result = validate(ReviewSchema, {
      camp_id: '-starts-with-hyphen',
      overall_rating: 3,
    });
    expect(result.success).toBe(false);

    const result2 = validate(ReviewSchema, {
      camp_id: 'Has Uppercase And Spaces',
      overall_rating: 3,
    });
    expect(result2.success).toBe(false);

    const result3 = validate(ReviewSchema, {
      camp_id: '',
      overall_rating: 3,
    });
    expect(result3.success).toBe(false);
  });

  it('rejects review text with script tags', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
      review_text: '<script>alert("xss")</script> nice camp',
    });
    expect(result.success).toBe(false);
  });

  it('rejects review text with javascript: protocol', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
      review_text: 'Check out javascript:alert(1) for more info',
    });
    expect(result.success).toBe(false);
  });

  it('rejects review text with event handlers', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
      review_text: '<img onerror=alert(1)> great camp',
    });
    expect(result.success).toBe(false);
  });

  it('rejects child_age_at_camp below 2', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
      child_age_at_camp: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects child_age_at_camp above 18', () => {
    const result = validate(ReviewSchema, {
      camp_id: validUuid,
      overall_rating: 3,
      child_age_at_camp: 19,
    });
    expect(result.success).toBe(false);
  });
});

describe('ChildSchema', () => {
  it('validates a complete child', () => {
    const result = validate(ChildSchema, {
      name: 'Emma',
      birth_date: '2018-05-15',
      age: 8,
      age_as_of_summer: 8,
      grade: '3rd',
      interests: ['swimming', 'art'],
      notes: 'Loves outdoor activities',
      color: '#ff5733',
      is_sample: false,
    });
    expect(result.success).toBe(true);
  });

  it('validates minimal child (name only)', () => {
    const result = validate(ChildSchema, { name: 'Jake' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = validate(ChildSchema, { name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    const result = validate(ChildSchema, { name: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid birth_date format', () => {
    const result = validate(ChildSchema, { name: 'Emma', birth_date: '05/15/2018' });
    expect(result.success).toBe(false);
  });

  it('rejects age over 18', () => {
    const result = validate(ChildSchema, { name: 'Emma', age: 19 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color format', () => {
    const result = validate(ChildSchema, { name: 'Emma', color: 'red' });
    expect(result.success).toBe(false);
  });

  it('accepts valid hex color', () => {
    const result = validate(ChildSchema, { name: 'Emma', color: '#aaBB11' });
    expect(result.success).toBe(true);
  });

  it('rejects interests array over 20 items', () => {
    const result = validate(ChildSchema, {
      name: 'Emma',
      interests: Array(21).fill('hobby'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes with unsafe content', () => {
    const result = validate(ChildSchema, {
      name: 'Emma',
      notes: '<iframe src="evil.com"></iframe>',
    });
    expect(result.success).toBe(false);
  });
});

describe('ChildUpdateSchema', () => {
  it('allows partial updates', () => {
    const result = validate(ChildUpdateSchema, { age: 9 });
    expect(result.success).toBe(true);
  });

  it('allows empty object', () => {
    const result = validate(ChildUpdateSchema, {});
    expect(result.success).toBe(true);
  });
});

describe('ScheduledCampSchema', () => {
  it('validates a complete scheduled camp', () => {
    const result = validate(ScheduledCampSchema, {
      camp_id: validUuid,
      child_id: validUuid,
      start_date: '2026-06-15',
      end_date: '2026-06-19',
      camp_name: 'Beach Surf Camp',
      price: 350,
      status: 'confirmed',
      notes: 'Week 2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = validate(ScheduledCampSchema, {
      camp_id: validUuid,
      child_id: validUuid,
      start_date: 'June 15 2026',
      end_date: '2026-06-19',
      camp_name: 'Camp',
    });
    expect(result.success).toBe(false);
  });

  it('rejects price over 10000', () => {
    const result = validate(ScheduledCampSchema, {
      camp_id: validUuid,
      child_id: validUuid,
      start_date: '2026-06-15',
      end_date: '2026-06-19',
      camp_name: 'Camp',
      price: 15000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = validate(ScheduledCampSchema, {
      camp_id: validUuid,
      child_id: validUuid,
      start_date: '2026-06-15',
      end_date: '2026-06-19',
      camp_name: 'Camp',
      status: 'invalid-status',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid statuses', () => {
    const statuses = ['tentative', 'confirmed', 'registered', 'paid', 'cancelled', 'planned'];
    for (const status of statuses) {
      const result = validate(ScheduledCampSchema, {
        camp_id: validUuid,
        child_id: validUuid,
        start_date: '2026-06-15',
        end_date: '2026-06-19',
        camp_name: 'Camp',
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('allows nullable price', () => {
    const result = validate(ScheduledCampSchema, {
      camp_id: validUuid,
      child_id: validUuid,
      start_date: '2026-06-15',
      end_date: '2026-06-19',
      camp_name: 'Camp',
      price: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('ProfileUpdateSchema', () => {
  it('validates profile update with preferences', () => {
    const result = validate(ProfileUpdateSchema, {
      full_name: 'Jane Doe',
      preferred_categories: ['Sports', 'Art'],
      onboarding_completed: true,
    });
    expect(result.success).toBe(true);
  });

  it('validates last_active_at as ISO datetime', () => {
    const result = validate(ProfileUpdateSchema, {
      last_active_at: '2026-01-15T10:30:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid datetime format', () => {
    const result = validate(ProfileUpdateSchema, {
      last_active_at: 'January 15 2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects categories over 20 items', () => {
    const result = validate(ProfileUpdateSchema, {
      preferred_categories: Array(21).fill('Category'),
    });
    expect(result.success).toBe(false);
  });
});

describe('FavoriteSchema', () => {
  it('validates a favorite with camp_id', () => {
    const result = validate(FavoriteSchema, { camp_id: validUuid });
    expect(result.success).toBe(true);
  });

  it('allows nullable child_id', () => {
    const result = validate(FavoriteSchema, { camp_id: validUuid, child_id: null });
    expect(result.success).toBe(true);
  });
});

describe('SquadSchema', () => {
  it('validates a squad name', () => {
    const result = validate(SquadSchema, { name: 'Beach Moms 2026' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = validate(SquadSchema, { name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = validate(SquadSchema, { name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('ComparisonListSchema', () => {
  it('validates a comparison list', () => {
    const result = validate(ComparisonListSchema, {
      name: 'Art Camps',
      camp_ids: [validUuid],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty camp_ids', () => {
    const result = validate(ComparisonListSchema, {
      name: 'Art Camps',
      camp_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 20 camp_ids', () => {
    const result = validate(ComparisonListSchema, {
      name: 'Too Many',
      camp_ids: Array(21).fill(validUuid),
    });
    expect(result.success).toBe(false);
  });
});

describe('safeText XSS prevention', () => {
  const testWithSafeText = (text) =>
    validate(QuestionSchema, { camp_id: validUuid, question_text: text });

  it('allows normal text', () => {
    expect(testWithSafeText('What time does camp start?').success).toBe(true);
  });

  it('rejects script tags', () => {
    expect(testWithSafeText('<script>alert(1)</script>').success).toBe(false);
  });

  it('rejects iframe tags', () => {
    expect(testWithSafeText('<iframe src="evil.com"></iframe>').success).toBe(false);
  });

  it('rejects object tags', () => {
    expect(testWithSafeText('<object data="evil.swf"></object>').success).toBe(false);
  });

  it('rejects embed tags', () => {
    expect(testWithSafeText('<embed src="evil.swf">').success).toBe(false);
  });

  it('rejects form tags', () => {
    expect(testWithSafeText('<form action="evil.com">test</form>').success).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(testWithSafeText('click javascript:alert(1)').success).toBe(false);
  });

  it('rejects vbscript: protocol', () => {
    expect(testWithSafeText('try vbscript:msgbox').success).toBe(false);
  });

  it('rejects data: protocol', () => {
    expect(testWithSafeText('see data:text/html,test').success).toBe(false);
  });

  it('rejects onclick handler', () => {
    expect(testWithSafeText('<div onclick=alert(1)>test</div>').success).toBe(false);
  });

  it('rejects onerror handler', () => {
    expect(testWithSafeText('<img onerror =alert(1)>').success).toBe(false);
  });

  it('rejects onload handler', () => {
    expect(testWithSafeText('<body onload =init()>').success).toBe(false);
  });

  it('allows safe HTML-like text that is not a tag', () => {
    expect(testWithSafeText('Use < and > in math class').success).toBe(true);
  });

  it('rejects text exceeding 10000 chars', () => {
    expect(testWithSafeText('a'.repeat(10001)).success).toBe(false);
  });
});
