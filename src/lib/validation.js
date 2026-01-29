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
// FAMILY COLLABORATION SCHEMAS
// ============================================================================

export const FamilySchema = z.object({
  name: shortText.max(100),
  settings: z.object({
    require_approval: z.boolean().optional(),
    notify_on_changes: z.boolean().optional(),
    notify_on_suggestions: z.boolean().optional(),
  }).optional(),
});

export const FamilyMemberSchema = z.object({
  nickname: shortText.max(50).optional().nullable(),
  can_edit_schedule: z.boolean().optional(),
  can_approve_camps: z.boolean().optional(),
  notify_schedule_changes: z.boolean().optional(),
  notify_comments: z.boolean().optional(),
  notify_suggestions: z.boolean().optional(),
});

export const FamilyInvitationSchema = z.object({
  invitee_email: email,
  message: safeText.max(500).optional(),
});

export const ScheduleCommentSchema = z.object({
  family_id: uuid,
  scheduled_camp_id: uuid.optional().nullable(),
  week_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  child_id: uuid.optional().nullable(),
  comment_text: safeText.min(1).max(2000),
  parent_comment_id: uuid.optional().nullable(),
});

export const CampSuggestionSchema = z.object({
  family_id: uuid,
  camp_id: z.string().min(1).max(200), // Camp IDs can vary in format
  suggested_to: uuid.optional().nullable(),
  child_id: uuid.optional().nullable(),
  week_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: safeText.max(500).optional(),
});

export const ApprovalRequestSchema = z.object({
  family_id: uuid,
  camp_id: z.string().min(1).max(200),
  child_id: uuid,
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  week_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requested_price: z.number().min(0).max(10000).optional().nullable(),
  note: safeText.max(500).optional(),
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationTypeSchema = z.enum([
  'registration_reminder',
  'registration_open',
  'registration_opening_alert',
  'new_session',
  'camp_update',
  'review_reply',
  'question_answered',
  'schedule_reminder',
  'price_drop',
  'early_bird_deadline',
  'spots_available',
  'waitlist_update',
  'new_camp_match',
  'schedule_conflict',
  'coverage_gap_reminder',
  'friend_activity',
  'friend_match',
  'squad_member_joined',
  'squad_schedule_change',
  'budget_alert',
  'camp_session_filling',
  'weekly_digest',
  'system'
]);

export const NotificationCategorySchema = z.enum([
  'registration',
  'pricing',
  'schedule',
  'social',
  'system',
  'general'
]);

export const NotificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const NotificationPreferencesSchema = z.object({
  // Global settings
  notifications_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),

  // Registration alerts
  registration_alerts_enabled: z.boolean().optional(),
  registration_alert_days: z.number().int().min(1).max(30).optional(),
  registration_opening_email: z.boolean().optional(),
  registration_opening_push: z.boolean().optional(),

  // Price notifications
  price_drop_enabled: z.boolean().optional(),
  price_drop_email: z.boolean().optional(),
  price_drop_threshold: z.number().int().min(1).max(100).optional(),
  early_bird_reminder_enabled: z.boolean().optional(),
  early_bird_days_before: z.number().int().min(1).max(14).optional(),

  // Waitlist notifications
  waitlist_updates_enabled: z.boolean().optional(),
  waitlist_email: z.boolean().optional(),
  waitlist_position_change: z.boolean().optional(),
  waitlist_spot_available: z.boolean().optional(),

  // New camp notifications
  new_camp_match_enabled: z.boolean().optional(),
  new_camp_email: z.boolean().optional(),
  match_by_category: z.boolean().optional(),
  match_by_age: z.boolean().optional(),
  match_by_price: z.boolean().optional(),

  // Schedule notifications
  schedule_conflict_enabled: z.boolean().optional(),
  schedule_conflict_email: z.boolean().optional(),
  coverage_gap_enabled: z.boolean().optional(),
  coverage_gap_email: z.boolean().optional(),
  coverage_reminder_day: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).optional(),

  // Friend/Squad notifications
  friend_activity_enabled: z.boolean().optional(),
  friend_activity_email: z.boolean().optional(),
  friend_match_enabled: z.boolean().optional(),
  friend_match_email: z.boolean().optional(),
  squad_updates_enabled: z.boolean().optional(),
  squad_email: z.boolean().optional(),

  // Digest settings
  weekly_digest_enabled: z.boolean().optional(),
  weekly_digest_day: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).optional(),
  weekly_digest_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  digest_include_recommendations: z.boolean().optional(),
  digest_include_price_changes: z.boolean().optional(),
  digest_include_registration_dates: z.boolean().optional(),
  digest_include_coverage_status: z.boolean().optional(),

  // Budget alerts
  budget_alerts_enabled: z.boolean().optional(),
  budget_warning_threshold: z.number().int().min(1).max(100).optional(),
  budget_exceeded_email: z.boolean().optional(),
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
  FamilySchema,
  FamilyMemberSchema,
  FamilyInvitationSchema,
  ScheduleCommentSchema,
  CampSuggestionSchema,
  ApprovalRequestSchema,
  NotificationTypeSchema,
  NotificationCategorySchema,
  NotificationPrioritySchema,
  NotificationPreferencesSchema,
  validate,
  sanitizeString,
};
