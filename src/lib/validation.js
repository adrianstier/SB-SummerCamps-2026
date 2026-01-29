/**
 * Input validation schemas using Zod
 * SECURITY: All user inputs must be validated before database operations
 */
import { z } from 'zod';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

// UUID validator
const uuid = z.string().uuid();

// Camp ID validator - accepts slug-format IDs (e.g. "ucsb-day-camp")
const campId = z.string().min(1).max(200).regex(/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/, 'Invalid camp ID format');

// Safe text - no script tags or SQL injection attempts
const safeText = z.string()
  .max(10000)
  .refine(
    (val) => !/<(script|iframe|object|embed|form|input|button|textarea|select|style|link|meta|base)\b/i.test(val) &&
             !/\b(javascript|vbscript|data):/i.test(val) &&
             !/on(load|error|click|mouse|focus|blur|key|submit|change|input|drag|drop|touch|pointer|animation|transition)\s*=/i.test(val),
    { message: 'Text contains potentially unsafe content' }
  );

// Short text for names, titles
const shortText = z.string().min(1).max(200).trim();

// Email
const email = z.string().email().max(254);

// URL
const url = z.string().url().max(2000).optional().or(z.literal(''));

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const ReviewSchema = z.object({
  camp_id: campId,
  overall_rating: z.number().int().min(1).max(5),
  review_text: safeText.min(10).max(5000).optional(),
  pros: safeText.max(1000).optional(),
  cons: safeText.max(1000).optional(),
  would_recommend: z.boolean().optional(),
  child_age_at_camp: z.number().int().min(2).max(18).optional(),
  year_attended: z.number().int().min(2020).max(2030).optional(),
});

// ============================================================================
// CHILD SCHEMAS
// ============================================================================

export const ChildSchema = z.object({
  name: shortText,
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  age: z.number().int().min(0).max(18).optional(),
  age_as_of_summer: z.number().int().min(0).max(18).optional(),
  grade: z.string().max(20).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  notes: safeText.max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_sample: z.boolean().optional(),
});

export const ChildUpdateSchema = ChildSchema.partial();

// ============================================================================
// QUESTION SCHEMAS
// ============================================================================

export const QuestionSchema = z.object({
  camp_id: campId,
  question_text: safeText.min(5).max(1000),
});

export const AnswerSchema = z.object({
  question_id: uuid,
  answer_text: safeText.min(5).max(2000),
});

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const ProfileUpdateSchema = z.object({
  full_name: shortText.optional(),
  avatar_url: url.optional(),
  preferences: z.record(z.unknown()).optional(),
  preferred_categories: z.array(z.string().max(50)).max(20).optional(),
  onboarding_completed: z.boolean().optional(),
  tour_completed: z.boolean().optional(),
  last_active_at: z.string().datetime().optional(),
  notification_preferences: z.record(z.unknown()).optional(),
});

// ============================================================================
// SCHEDULED CAMP SCHEMAS
// ============================================================================

export const ScheduledCampSchema = z.object({
  camp_id: campId,
  child_id: uuid,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  camp_name: shortText,
  price: z.number().min(0).max(10000).optional().nullable(),
  status: z.enum(['tentative', 'confirmed', 'registered', 'paid', 'cancelled', 'planned']).optional(),
  notes: safeText.max(2000).optional(),
  is_sample: z.boolean().optional(),
});

// Schema for updating scheduled camps (all fields optional)
export const ScheduledCampUpdateSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  price: z.number().min(0).max(10000).optional().nullable(),
  status: z.enum(['tentative', 'confirmed', 'registered', 'paid', 'cancelled', 'planned']).optional(),
  notes: safeText.max(2000).optional(),
});

// ============================================================================
// FAVORITES SCHEMAS
// ============================================================================

export const FavoriteSchema = z.object({
  camp_id: campId,
  child_id: uuid.optional().nullable(),
  notes: safeText.max(1000).optional(),
});

// ============================================================================
// SQUAD SCHEMAS
// ============================================================================

export const SquadSchema = z.object({
  name: shortText.max(100),
});

export const SquadMembershipSchema = z.object({
  reveal_identity: z.boolean().optional(),
  share_schedule: z.boolean().optional(),
});

// ============================================================================
// COMPARISON LIST SCHEMAS
// ============================================================================

export const ComparisonListSchema = z.object({
  name: shortText.max(100),
  camp_ids: z.array(campId).min(1).max(20),
  child_id: uuid.optional().nullable(),
});

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {unknown} data - The data to validate
 * @returns {{ success: true, data: T } | { success: false, error: string }}
 */
export function validate(schema, data) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.warn('Validation failed:', messages);
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Sanitize string to prevent XSS - strips HTML tags
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Strip HTML tags
  str = str.replace(/<[^>]*>/g, '');
  // Remove null bytes
  str = str.replace(/\0/g, '');
  // Escape PostgREST special characters that could manipulate filter expressions
  str = str.replace(/[,.()\[\]]/g, '');
  return str.trim();
}

export default {
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
  validate,
  sanitizeString,
};
