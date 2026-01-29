import { createClient } from '@supabase/supabase-js';
import {
  validate,
  ReviewSchema,
  ChildSchema,
  ChildUpdateSchema,
  QuestionSchema,
  AnswerSchema,
  ScheduledCampSchema,
  ScheduledCampUpdateSchema,
  SquadSchema,
  SquadMembershipSchema,
  ComparisonListSchema,
  NotificationPreferencesSchema,
  FamilySchema,
  FamilyMemberSchema,
  FamilyInvitationSchema,
  ScheduleCommentSchema,
  CampSuggestionSchema,
  ApprovalRequestSchema,
  sanitizeString
} from './validation.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. User features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================================
// AUTH HELPERS
// ============================================================================

export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  // Use the current URL as redirect, this ensures proper OAuth callback
  const redirectTo = `${window.location.origin}/`;

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account', // Changed from 'consent' to allow easier sign-in
      },
    },
  });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================================================
// PROFILE HELPERS
// ============================================================================

export async function getProfile(userId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function updateProfile(updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Allowlist safe fields - NEVER include role or other sensitive fields
  const allowedFields = [
    'full_name',
    'avatar_url',
    'preferences',
    'preferred_categories',
    'onboarding_completed',
    'tour_completed',
    'last_active_at',
    'notification_preferences',
    // Phase 1: School dates and work hours
    'school_year_end',
    'school_year_start',
    'work_hours_start',
    'work_hours_end',
    'summer_budget'
  ];

  const safeUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  // Reject if trying to update forbidden fields
  const forbiddenFields = Object.keys(updates).filter(k => !allowedFields.includes(k));
  if (forbiddenFields.length > 0) {
    console.warn('Attempted to update forbidden profile fields:', forbiddenFields);
  }

  return supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', user.id)
    .select()
    .single();
}

export async function completeOnboarding() {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)
    .select()
    .single();
}

// ============================================================================
// CHILDREN HELPERS
// ============================================================================

export async function getChildren() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }
  return data;
}

export async function addChild(child) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ChildSchema, child);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('children')
    .insert({ ...validation.data, user_id: user.id })
    .select()
    .single();
}

export async function updateChild(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ChildUpdateSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('children')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteChild(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Ownership check - only delete own children
  return supabase
    .from('children')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}

// ============================================================================
// FAVORITES HELPERS
// ============================================================================

export async function getFavorites() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      *,
      children(name, color)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
  return data;
}

export async function addFavorite(campId, childId = null, notes = null) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      camp_id: campId,
      child_id: childId,
      notes
    })
    .select()
    .single();
}

export async function removeFavorite(campId, childId = null) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  let query = supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('camp_id', campId);

  if (childId) {
    query = query.eq('child_id', childId);
  } else {
    query = query.is('child_id', null);
  }

  return query;
}

export async function isFavorite(campId) {
  if (!supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('camp_id', campId)
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
}

// ============================================================================
// SCHEDULED CAMPS HELPERS
// ============================================================================

export async function getScheduledCamps() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('scheduled_camps')
    .select(`
      *,
      children(name, color)
    `)
    .order('start_date');

  if (error) {
    console.error('Error fetching scheduled camps:', error);
    return [];
  }
  return data;
}

export async function addScheduledCamp(schedule) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ScheduledCampSchema, schedule);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('scheduled_camps')
    .insert({ ...validation.data, user_id: user.id })
    .select()
    .single();
}

export async function updateScheduledCamp(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ScheduledCampUpdateSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('scheduled_camps')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteScheduledCamp(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Ownership check - only delete own scheduled camps
  return supabase
    .from('scheduled_camps')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}

// Check for conflicts
export async function checkConflicts(childId, startDate, endDate, excludeId = null) {
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .rpc('check_schedule_conflict', {
      p_user_id: user.id,
      p_child_id: childId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_exclude_id: excludeId
    });

  if (error) {
    console.error('Error checking conflicts:', error);
    return [];
  }
  return data || [];
}

// ============================================================================
// REVIEWS HELPERS
// ============================================================================

export async function getReviews(campId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles(full_name, avatar_url)
    `)
    .eq('camp_id', campId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
  return data;
}

export async function getCampRatings(campId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('camp_ratings')
    .select('*')
    .eq('camp_id', campId)
    .single();

  if (error) {
    return null;
  }
  return data;
}

export async function addReview(review) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ReviewSchema, review);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  // SECURITY: Sanitize text fields
  const sanitizedReview = {
    ...validation.data,
    review_text: validation.data.review_text ? sanitizeString(validation.data.review_text) : undefined,
    pros: validation.data.pros ? sanitizeString(validation.data.pros) : undefined,
    cons: validation.data.cons ? sanitizeString(validation.data.cons) : undefined,
  };

  // SECURITY: Reviews should default to 'pending' status for moderation
  return supabase
    .from('reviews')
    .insert({ ...sanitizedReview, user_id: user.id, status: 'pending' })
    .select()
    .single();
}

export async function updateReview(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input - only allow review content fields
  const ReviewUpdateSchema = ReviewSchema.partial().omit({ camp_id: true });
  const validation = validate(ReviewUpdateSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  // SECURITY: Sanitize text fields
  const sanitizedUpdates = { ...validation.data };
  if (sanitizedUpdates.review_text) sanitizedUpdates.review_text = sanitizeString(sanitizedUpdates.review_text);
  if (sanitizedUpdates.pros) sanitizedUpdates.pros = sanitizeString(sanitizedUpdates.pros);
  if (sanitizedUpdates.cons) sanitizedUpdates.cons = sanitizeString(sanitizedUpdates.cons);

  // SECURITY: Ownership check - users can only update their own reviews
  return supabase
    .from('reviews')
    .update(sanitizedUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
}

export async function deleteReview(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('reviews')
    .delete()
    .eq('id', id);
}

export async function voteReviewHelpful(reviewId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('review_helpful_votes')
    .insert({ review_id: reviewId, user_id: user.id })
    .select()
    .single();
}

export async function removeReviewVote(reviewId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('review_helpful_votes')
    .delete()
    .eq('review_id', reviewId)
    .eq('user_id', user.id);
}

// ============================================================================
// NOTIFICATIONS HELPERS
// ============================================================================

export async function getNotifications(unreadOnly = false) {
  if (!supabase) return [];

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
}

export async function markNotificationRead(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markAllNotificationsRead() {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase.rpc('mark_all_notifications_read', { p_user_id: user.id });
}

export async function getUnreadNotificationCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  if (error) return 0;
  return count || 0;
}

// ============================================================================
// COMPARISON LISTS HELPERS
// ============================================================================

export async function getComparisonLists() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('comparison_lists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comparison lists:', error);
    return [];
  }
  return data;
}

export async function createComparisonList(name, campIds, childId = null) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('comparison_lists')
    .insert({
      user_id: user.id,
      name,
      camp_ids: campIds,
      child_id: childId
    })
    .select()
    .single();
}

export async function updateComparisonList(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input - only allow name, camp_ids, child_id
  const ComparisonListUpdateSchema = ComparisonListSchema.partial();
  const validation = validate(ComparisonListUpdateSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('comparison_lists')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteComparisonList(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('comparison_lists')
    .delete()
    .eq('id', id);
}

export async function shareComparisonList(id, expirationDays = 14) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Generate high-entropy share token (UUID + 32 random hex chars)
  // This provides ~256 bits of entropy, making enumeration attacks infeasible
  const uuid = crypto.randomUUID();
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const shareToken = `${uuid}-${randomHex}`;

  // SECURITY: Set expiration date (default 14 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return supabase
    .from('comparison_lists')
    .update({
      is_shared: true,
      share_token: shareToken,
      share_expires_at: expiresAt.toISOString()
    })
    .eq('id', id)
    .select()
    .single();
}

export async function getSharedComparisonList(shareToken) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('comparison_lists')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_shared', true)
    .single();

  if (error) return null;

  // SECURITY: Check if share token has expired
  if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
    console.warn('Share token has expired');
    return null;
  }

  return data;
}

// ============================================================================
// WATCHLIST HELPERS
// ============================================================================

export async function getWatchlist() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camp_watchlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
  return data;
}

export async function addToWatchlist(campId, options = {}) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Allowlist permitted options fields
  const safeOptions = {};
  if (options.notify_registration !== undefined) safeOptions.notify_registration = options.notify_registration;
  if (options.notify_price_change !== undefined) safeOptions.notify_price_change = options.notify_price_change;
  if (options.notes !== undefined) safeOptions.notes = options.notes;

  return supabase
    .from('camp_watchlist')
    .insert({
      ...safeOptions,
      camp_id: campId,
      // SECURITY: user_id placed AFTER spread so it cannot be overridden
      user_id: user.id,
    })
    .select()
    .single();
}

export async function removeFromWatchlist(campId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('camp_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('camp_id', campId);
}

// ============================================================================
// QUESTIONS & ANSWERS HELPERS
// ============================================================================

export async function getQuestions(campId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camp_questions')
    .select(`
      *,
      profiles(full_name, avatar_url),
      camp_answers(
        *,
        profiles(full_name, avatar_url)
      )
    `)
    .eq('camp_id', campId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  return data;
}

export async function askQuestion(campId, questionText) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(QuestionSchema, { camp_id: campId, question_text: questionText });
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('camp_questions')
    .insert({
      user_id: user.id,
      camp_id: validation.data.camp_id,
      question_text: sanitizeString(validation.data.question_text)
    })
    .select()
    .single();
}

export async function answerQuestion(questionId, answerText) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(AnswerSchema, { question_id: questionId, answer_text: answerText });
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('camp_answers')
    .insert({
      user_id: user.id,
      question_id: validation.data.question_id,
      answer_text: sanitizeString(validation.data.answer_text)
    })
    .select()
    .single();
}

// ============================================================================
// CAMP SESSIONS HELPERS
// ============================================================================

export async function getCampSessions(campId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camp_sessions')
    .select('*')
    .eq('camp_id', campId)
    .eq('is_available', true)
    .order('start_date');

  if (error) {
    console.error('Error fetching camp sessions:', error);
    return [];
  }
  return data;
}

export async function getAllSessions() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camp_sessions')
    .select('*')
    .eq('is_available', true)
    .order('start_date');

  if (error) {
    console.error('Error fetching all sessions:', error);
    return [];
  }
  return data;
}

// ============================================================================
// SUMMER WEEKS HELPER
// ============================================================================

// Default dates for Santa Barbara Unified School District 2026
export const DEFAULT_SCHOOL_END = '2026-06-05'; // Friday, last day of school
export const DEFAULT_SCHOOL_START = '2026-08-19'; // Wednesday, first day of school
export const DEFAULT_SUMMER_START = '2026-06-08'; // First Monday after school ends

/**
 * Get summer weeks based on school dates
 * @param {string} schoolEndDate - Last day of school (YYYY-MM-DD)
 * @param {string} schoolStartDate - First day of next school year (YYYY-MM-DD)
 * @returns {Array} Array of week objects
 */
export function getSummerWeeks(schoolEndDate = DEFAULT_SCHOOL_END, schoolStartDate = DEFAULT_SCHOOL_START) {
  const weeks = [];

  // Find the first Monday after school ends
  const schoolEnd = new Date(schoolEndDate);
  const summerStart = new Date(schoolEnd);
  summerStart.setDate(schoolEnd.getDate() + 1); // Day after school ends

  // Move to next Monday if not already Monday
  while (summerStart.getDay() !== 1) {
    summerStart.setDate(summerStart.getDate() + 1);
  }

  // Calculate end date (Friday before school starts)
  const schoolStart = new Date(schoolStartDate);

  let weekNum = 1;
  let currentWeekStart = new Date(summerStart);

  while (currentWeekStart < schoolStart) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 4); // Mon-Fri

    // Don't add partial weeks that extend past school start
    if (weekEnd >= schoolStart) {
      weekEnd.setTime(schoolStart.getTime());
      weekEnd.setDate(weekEnd.getDate() - 1);
    }

    // Only add if we have at least 1 day
    if (weekEnd >= currentWeekStart) {
      weeks.push({
        weekNum,
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        label: `Week ${weekNum}`,
        display: `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      });
      weekNum++;
    }

    // Move to next week
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return weeks;
}

// Legacy function for backward compatibility
export function getSummerWeeks2026() {
  return getSummerWeeks(DEFAULT_SCHOOL_END, DEFAULT_SCHOOL_START);
}

/**
 * Get pre-school gap (days between school end and summer camp start)
 * @param {string} schoolEndDate - Last day of school
 * @returns {Object} Gap info with dates and count
 */
export function getPreSchoolGap(schoolEndDate = DEFAULT_SCHOOL_END) {
  const schoolEnd = new Date(schoolEndDate);
  const weeks = getSummerWeeks(schoolEndDate);

  if (weeks.length === 0) return null;

  const summerStart = new Date(weeks[0].startDate);
  const gapDays = Math.floor((summerStart - schoolEnd) / (1000 * 60 * 60 * 24)) - 1;

  if (gapDays <= 0) return null;

  return {
    startDate: new Date(schoolEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(summerStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: gapDays,
    label: 'Before Camps Start'
  };
}

/**
 * Get post-summer gap (days between last camp week and school start)
 * @param {string} schoolStartDate - First day of school
 * @param {string} schoolEndDate - Last day of previous school year (for week calculation)
 * @returns {Object} Gap info with dates and count
 */
export function getPostSummerGap(schoolStartDate = DEFAULT_SCHOOL_START, schoolEndDate = DEFAULT_SCHOOL_END) {
  const schoolStart = new Date(schoolStartDate);
  const weeks = getSummerWeeks(schoolEndDate, schoolStartDate);

  if (weeks.length === 0) return null;

  const lastWeekEnd = new Date(weeks[weeks.length - 1].endDate);
  const gapDays = Math.floor((schoolStart - lastWeekEnd) / (1000 * 60 * 60 * 24)) - 1;

  if (gapDays <= 0) return null;

  return {
    startDate: new Date(lastWeekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(schoolStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: gapDays,
    label: 'Before School Starts'
  };
}

// ============================================================================
// SQUADS HELPERS
// ============================================================================

export async function getSquads() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('squads')
    .select(`
      *,
      squad_members(
        id,
        user_id,
        role,
        reveal_identity,
        share_schedule,
        joined_at,
        profiles(id, full_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching squads:', error);
    return [];
  }
  return data;
}

export async function createSquad(name, revealIdentity = false) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // Create the squad
  const { data: squad, error: squadError } = await supabase
    .from('squads')
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (squadError) return { error: squadError };

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from('squad_members')
    .insert({
      squad_id: squad.id,
      user_id: user.id,
      role: 'owner',
      reveal_identity: revealIdentity,
      share_schedule: true
    });

  if (memberError) return { error: memberError };

  return { data: squad };
}

export async function updateSquad(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input - only allow 'name' field
  const validation = validate(SquadSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('squads')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteSquad(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squads')
    .delete()
    .eq('id', id);
}

export async function regenerateInviteCode(squadId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // Generate a new random code
  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return supabase
    .from('squads')
    .update({ invite_code: newCode })
    .eq('id', squadId)
    .select()
    .single();
}

export async function getSquadByInviteCode(code) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc('get_squad_by_invite_code', { code });

  if (error) {
    console.error('Error fetching squad by invite code:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function joinSquad(squadId, revealIdentity = false, shareSchedule = true) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squad_members')
    .insert({
      squad_id: squadId,
      user_id: user.id,
      role: 'member',
      reveal_identity: revealIdentity,
      share_schedule: shareSchedule
    })
    .select()
    .single();
}

export async function leaveSquad(squadId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squad_members')
    .delete()
    .eq('squad_id', squadId)
    .eq('user_id', user.id);
}

export async function updateSquadMembership(squadId, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input - only allow reveal_identity, share_schedule
  const validation = validate(SquadMembershipSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('squad_members')
    .update(validation.data)
    .eq('squad_id', squadId)
    .eq('user_id', user.id)
    .select()
    .single();
}

export async function removeSquadMember(squadId, memberId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squad_members')
    .delete()
    .eq('squad_id', squadId)
    .eq('user_id', memberId);
}

// ============================================================================
// CAMP INTERESTS HELPERS
// ============================================================================

export async function getCampInterests() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camp_interests')
    .select(`
      *,
      children(name, color)
    `)
    .order('week_number');

  if (error) {
    console.error('Error fetching camp interests:', error);
    return [];
  }
  return data;
}

export async function getSquadCampInterests(squadId) {
  if (!supabase) return [];

  // Get all members of the squad who share their schedule
  const { data: members, error: membersError } = await supabase
    .from('squad_members')
    .select('user_id, reveal_identity, profiles(id, full_name)')
    .eq('squad_id', squadId)
    .eq('share_schedule', true);

  if (membersError) {
    console.error('Error fetching squad members:', membersError);
    return [];
  }

  const memberIds = members.map(m => m.user_id);

  // Get all camp interests for those members
  const { data: interests, error: interestsError } = await supabase
    .from('camp_interests')
    .select(`
      *,
      children(name, color)
    `)
    .in('user_id', memberIds)
    .order('week_number');

  if (interestsError) {
    console.error('Error fetching squad interests:', interestsError);
    return [];
  }

  // SECURITY: Filter data based on reveal_identity flag
  // Members who haven't revealed identity should not have their profile data exposed
  return interests.map(interest => {
    const member = members.find(m => m.user_id === interest.user_id);
    const revealIdentity = member?.reveal_identity || false;

    return {
      // Only include non-identifying fields from interest
      id: interest.id,
      camp_id: interest.camp_id,
      week_number: interest.week_number,
      looking_for_friends: interest.looking_for_friends,
      created_at: interest.created_at,
      // SECURITY: Only reveal child info if identity is revealed
      children: revealIdentity ? interest.children : null,
      // SECURITY: Only reveal profile info if identity is revealed
      reveal_identity: revealIdentity,
      member_name: revealIdentity ? (member?.profiles?.full_name || 'A friend') : 'A friend',
      // SECURITY: Never expose user_id of anonymous members
      user_id: revealIdentity ? interest.user_id : null,
    };
  });
}

export async function updateCampInterest(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Only allow looking_for_friends field
  const safeUpdates = {};
  if (updates.looking_for_friends !== undefined) {
    if (typeof updates.looking_for_friends !== 'boolean') {
      return { error: { message: 'looking_for_friends must be a boolean' } };
    }
    safeUpdates.looking_for_friends = updates.looking_for_friends;
  }

  return supabase
    .from('camp_interests')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function toggleLookingForFriends(campId, childId, weekNumber, lookingForFriends) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // Upsert the camp interest
  return supabase
    .from('camp_interests')
    .upsert({
      user_id: user.id,
      child_id: childId,
      camp_id: campId,
      week_number: weekNumber,
      looking_for_friends: lookingForFriends,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,child_id,camp_id,week_number'
    })
    .select()
    .single();
}

// Get friend interest counts for camp cards
export async function getFriendInterestCounts() {
  if (!supabase) return {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  // Get squads the user is in
  const { data: squadMemberships } = await supabase
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id);

  if (!squadMemberships?.length) return {};

  const squadIds = squadMemberships.map(m => m.squad_id);

  // Get all members of those squads (excluding current user)
  const { data: squadMembers } = await supabase
    .from('squad_members')
    .select('user_id')
    .in('squad_id', squadIds)
    .eq('share_schedule', true)
    .neq('user_id', user.id);

  if (!squadMembers?.length) return {};

  const memberIds = squadMembers.map(m => m.user_id);

  // Get interests grouped by camp_id and week
  const { data: interests } = await supabase
    .from('camp_interests')
    .select('camp_id, week_number')
    .in('user_id', memberIds);

  if (!interests?.length) return {};

  // Count by camp_id
  const counts = {};
  interests.forEach(i => {
    const key = `${i.camp_id}-${i.week_number}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

// ============================================================================
// SQUAD NOTIFICATIONS HELPERS
// ============================================================================

export async function getSquadNotifications(unreadOnly = false) {
  if (!supabase) return [];

  let query = supabase
    .from('squad_notifications')
    .select(`
      *,
      squads(name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching squad notifications:', error);
    return [];
  }
  return data;
}

export async function markSquadNotificationRead(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squad_notifications')
    .update({ read: true })
    .eq('id', id);
}

export async function markAllSquadNotificationsRead() {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('squad_notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
}

export async function getUnreadSquadNotificationCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('squad_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  if (error) return 0;
  return count || 0;
}

// ============================================================================
// SAMPLE DATA HELPERS (for guided tour)
// ============================================================================

/**
 * Clear all sample data (children and scheduled camps) for current user
 * Used when user finishes guided tour
 */
export async function clearSampleData() {
  if (!supabase) throw new Error('Supabase not configured');

  try {
    // Use RPC function for atomic deletion (prevents race conditions)
    const { data, error } = await supabase.rpc('clear_sample_data');

    if (error) throw error;

    return data || { success: true };
  } catch (error) {
    console.error('Error clearing sample data:', error);
    throw error;
  }
}

/**
 * Check if user has any sample data
 * @returns {Promise<boolean>} True if user has sample children or camps
 */
export async function hasSampleData() {
  if (!supabase) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check for sample children
    const { data: sampleChildren, error: childrenError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_sample', true)
      .limit(1);

    if (childrenError) throw childrenError;

    return sampleChildren && sampleChildren.length > 0;
  } catch (error) {
    console.error('Error checking sample data:', error);
    return false;
  }
}

// ============================================================================
// PHASE 1: REGISTRATION & WORK SCHEDULE HELPERS
// ============================================================================

/**
 * Parse time string to minutes since midnight for comparison
 * @param {string} timeStr - Time string like "9:00am", "9am", "09:00", etc.
 * @returns {number|null} Minutes since midnight, or null if unparseable
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;

  const normalized = timeStr.toLowerCase().trim();

  // Handle HH:MM format
  let match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Handle Xam/Xpm format
  match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const period = match[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Format minutes to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Formatted time like "9:00am"
 */
export function formatMinutesToTime(minutes) {
  if (minutes == null) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return mins === 0 ? `${displayHours}${period}` : `${displayHours}:${mins.toString().padStart(2, '0')}${period}`;
}

/**
 * Check if a camp's hours cover the user's work schedule
 * @param {Object} camp - Camp object with drop_off, pick_up, extended care fields
 * @param {string} workStart - Work start time (e.g., "8:00am" or "08:00")
 * @param {string} workEnd - Work end time (e.g., "5:30pm" or "17:30")
 * @returns {Object} { covers: boolean, needsExtendedCare: boolean, dropOff: string, pickUp: string }
 */
export function checkWorkScheduleCoverage(camp, workStart, workEnd) {
  const workStartMins = parseTimeToMinutes(workStart) || 8 * 60; // Default 8am
  const workEndMins = parseTimeToMinutes(workEnd) || 17 * 60 + 30; // Default 5:30pm

  // Parse camp times
  const campDropOff = parseTimeToMinutes(camp.drop_off) || parseTimeToMinutes(camp.hours?.split('-')[0]);
  const campPickUp = parseTimeToMinutes(camp.pick_up) || parseTimeToMinutes(camp.hours?.split('-')[1]);

  // Parse extended care times if available
  let extDropOff = null;
  let extPickUp = null;

  if (camp.extended_care && typeof camp.extended_care === 'string') {
    // Try to extract times from extended_care text
    const extMatch = camp.extended_care.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (extMatch) {
      extDropOff = parseTimeToMinutes(extMatch[1]);
      extPickUp = parseTimeToMinutes(extMatch[2]);
    }
  }

  // Check basic coverage
  const basicCovers = campDropOff && campPickUp &&
    campDropOff <= workStartMins && campPickUp >= workEndMins;

  // Check extended care coverage
  const extCovers = (extDropOff || campDropOff) && (extPickUp || campPickUp) &&
    (extDropOff || campDropOff) <= workStartMins &&
    (extPickUp || campPickUp) >= workEndMins;

  const needsExtendedCare = !basicCovers && extCovers;

  return {
    covers: basicCovers || extCovers,
    needsExtendedCare,
    dropOff: formatMinutesToTime(campDropOff),
    pickUp: formatMinutesToTime(campPickUp),
    extendedDropOff: formatMinutesToTime(extDropOff),
    extendedPickUp: formatMinutesToTime(extPickUp)
  };
}

/**
 * Get registration status for a camp
 * @param {Object} camp - Camp object with registration_opens, reg_status, reg_date_2026
 * @returns {Object} { status, daysUntil, isOpen, label, color }
 */
export function getRegistrationStatus(camp) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If we have a parsed registration_opens date
  if (camp.registration_opens) {
    const regDate = new Date(camp.registration_opens);
    regDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((regDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil > 0) {
      return {
        status: 'upcoming',
        daysUntil,
        isOpen: false,
        label: daysUntil === 1 ? 'Opens tomorrow' : `Opens in ${daysUntil}d`,
        color: daysUntil <= 7 ? '#f59e0b' : '#6b7280' // amber if soon, gray otherwise
      };
    }
  }

  // Check reg_status field
  const status = (camp.reg_status || '').toLowerCase();

  if (status.includes('open') || status.includes('now')) {
    return {
      status: 'open',
      daysUntil: 0,
      isOpen: true,
      label: 'Register Now',
      color: '#10b981' // green
    };
  }

  if (status.includes('waitlist')) {
    return {
      status: 'waitlist',
      daysUntil: null,
      isOpen: false,
      label: 'Waitlist Only',
      color: '#f59e0b' // amber
    };
  }

  if (status.includes('closed') || status.includes('full')) {
    return {
      status: 'closed',
      daysUntil: null,
      isOpen: false,
      label: 'Closed',
      color: '#ef4444' // red
    };
  }

  // Try to parse reg_date_2026 text field
  if (camp.reg_date_2026) {
    const regText = camp.reg_date_2026.toLowerCase();

    // Check for month names
    const monthMatch = regText.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})?/i);
    if (monthMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.findIndex(m => monthMatch[1].toLowerCase().startsWith(m));
      const day = parseInt(monthMatch[2]) || 1;
      const year = today.getFullYear() + (monthIndex < today.getMonth() ? 1 : 0);

      const regDate = new Date(year, monthIndex, day);
      const daysUntil = Math.ceil((regDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0) {
        return {
          status: 'upcoming',
          daysUntil,
          isOpen: false,
          label: daysUntil <= 7 ? `Opens in ${daysUntil}d` : `Opens ${monthMatch[0]}`,
          color: daysUntil <= 7 ? '#f59e0b' : '#6b7280'
        };
      } else {
        return {
          status: 'open',
          daysUntil: 0,
          isOpen: true,
          label: 'Register Now',
          color: '#10b981'
        };
      }
    }
  }

  // Unknown
  return {
    status: 'unknown',
    daysUntil: null,
    isOpen: null,
    label: 'Check Website',
    color: '#6b7280'
  };
}

/**
 * Update favorite with notes and priority
 */
export async function updateFavorite(campId, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const allowedUpdates = {};
  if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;
  if (updates.priority !== undefined) allowedUpdates.priority = updates.priority;
  if (updates.child_id !== undefined) allowedUpdates.child_id = updates.child_id;

  return supabase
    .from('favorites')
    .update(allowedUpdates)
    .eq('user_id', user.id)
    .eq('camp_id', campId)
    .select()
    .single();
}

// ============================================================================
// FAMILY COLLABORATION HELPERS
// ============================================================================

/**
 * Get all families the user belongs to
 */
export async function getFamilies() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('families')
    .select(`
      *,
      family_members(
        id,
        user_id,
        role,
        status,
        nickname,
        can_edit_schedule,
        can_approve_camps,
        profiles(id, full_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching families:', error);
    return [];
  }
  return data;
}

/**
 * Create a new family workspace
 */
export async function createFamily(name) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(FamilySchema, { name });
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  // Create the family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name: sanitizeString(validation.data.name),
      created_by: user.id
    })
    .select()
    .single();

  if (familyError) return { error: familyError };

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: user.id,
      role: 'owner',
      can_edit_schedule: true,
      can_approve_camps: true
    });

  if (memberError) return { error: memberError };

  return { data: family };
}

/**
 * Update family settings
 */
export async function updateFamily(familyId, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Only allow name and settings fields
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = sanitizeString(updates.name);
  if (updates.settings !== undefined) allowedUpdates.settings = updates.settings;

  return supabase
    .from('families')
    .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
    .eq('id', familyId)
    .select()
    .single();
}

/**
 * Delete a family (owner only)
 */
export async function deleteFamily(familyId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('families')
    .delete()
    .eq('id', familyId);
}

/**
 * Get family by invite code
 */
export async function getFamilyByInviteCode(code) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc('get_family_by_invite_code', { p_code: code });

  if (error) {
    console.error('Error fetching family by invite code:', error);
    return null;
  }
  return data?.[0] || null;
}

/**
 * Join a family using invite code
 */
export async function joinFamily(familyId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: user.id,
      role: 'member',
      can_edit_schedule: true,
      can_approve_camps: false
    })
    .select()
    .single();
}

/**
 * Leave a family
 */
export async function leaveFamily(familyId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', user.id);
}

/**
 * Update family member settings
 */
export async function updateFamilyMember(familyId, memberId, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(FamilyMemberSchema, updates);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('family_members')
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq('family_id', familyId)
    .eq('user_id', memberId)
    .select()
    .single();
}

/**
 * Remove a family member (admin only)
 */
export async function removeFamilyMember(familyId, memberId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', memberId);
}

/**
 * Regenerate family invite code
 */
export async function regenerateFamilyInviteCode(familyId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  // Generate new random code
  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return supabase
    .from('families')
    .update({ invite_code: newCode })
    .eq('id', familyId)
    .select()
    .single();
}

/**
 * Invite someone to family by email
 */
export async function inviteToFamily(familyId, inviteeEmail, message = null) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(FamilyInvitationSchema, { invitee_email: inviteeEmail, message });
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  return supabase
    .from('family_invitations')
    .insert({
      family_id: familyId,
      inviter_id: user.id,
      invitee_email: validation.data.invitee_email,
      message: message ? sanitizeString(message) : null
    })
    .select()
    .single();
}

/**
 * Get pending invitations for current user
 */
export async function getMyInvitations() {
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('family_invitations')
    .select(`
      *,
      families(name),
      profiles:inviter_id(full_name, avatar_url)
    `)
    .eq('invitee_email', user.email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
  return data;
}

/**
 * Respond to family invitation
 */
export async function respondToInvitation(invitationId, accept) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // Update invitation status
  const { data: invitation, error: updateError } = await supabase
    .from('family_invitations')
    .update({
      status: accept ? 'accepted' : 'declined',
      invitee_user_id: user.id,
      responded_at: new Date().toISOString()
    })
    .eq('id', invitationId)
    .select('family_id')
    .single();

  if (updateError) return { error: updateError };

  // If accepted, join the family
  if (accept && invitation) {
    return joinFamily(invitation.family_id);
  }

  return { data: { success: true } };
}

// ============================================================================
// SCHEDULE COMMENTS HELPERS
// ============================================================================

/**
 * Get comments for a family's schedule
 */
export async function getScheduleComments(familyId, filters = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('schedule_comments')
    .select(`
      *,
      profiles:user_id(full_name, avatar_url),
      replies:schedule_comments(
        id,
        comment_text,
        created_at,
        profiles:user_id(full_name, avatar_url)
      )
    `)
    .eq('family_id', familyId)
    .is('parent_comment_id', null) // Only top-level comments
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.scheduled_camp_id) {
    query = query.eq('scheduled_camp_id', filters.scheduled_camp_id);
  }
  if (filters.week_date) {
    query = query.eq('week_date', filters.week_date);
  }
  if (filters.child_id) {
    query = query.eq('child_id', filters.child_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data;
}

/**
 * Add a comment to the schedule
 */
export async function addScheduleComment(comment) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ScheduleCommentSchema, comment);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  const { data, error } = await supabase
    .from('schedule_comments')
    .insert({
      ...validation.data,
      user_id: user.id,
      comment_text: sanitizeString(validation.data.comment_text)
    })
    .select(`
      *,
      profiles:user_id(full_name, avatar_url)
    `)
    .single();

  if (error) return { error };

  // Record activity
  if (data) {
    await supabase.from('family_activity_feed').insert({
      family_id: validation.data.family_id,
      user_id: user.id,
      activity_type: validation.data.parent_comment_id ? 'comment_reply' : 'comment_added',
      target_type: 'comment',
      target_id: data.id,
      child_id: validation.data.child_id,
      week_date: validation.data.week_date
    });
  }

  return { data };
}

/**
 * Update a comment
 */
export async function updateScheduleComment(commentId, text) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('schedule_comments')
    .update({
      comment_text: sanitizeString(text),
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select()
    .single();
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteScheduleComment(commentId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('schedule_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
}

/**
 * Pin/unpin a comment
 */
export async function toggleCommentPin(commentId, isPinned) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('schedule_comments')
    .update({ is_pinned: isPinned })
    .eq('id', commentId)
    .select()
    .single();
}

// ============================================================================
// CAMP SUGGESTIONS HELPERS
// ============================================================================

/**
 * Get camp suggestions for a family
 */
export async function getCampSuggestions(familyId, status = null) {
  if (!supabase) return [];

  let query = supabase
    .from('camp_suggestions')
    .select(`
      *,
      suggested_by_profile:profiles!camp_suggestions_suggested_by_fkey(full_name, avatar_url),
      suggested_to_profile:profiles!camp_suggestions_suggested_to_fkey(full_name, avatar_url),
      children(name, color)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
  return data;
}

/**
 * Suggest a camp to family member(s)
 */
export async function suggestCamp(suggestion) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(CampSuggestionSchema, suggestion);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  const { data, error } = await supabase
    .from('camp_suggestions')
    .insert({
      ...validation.data,
      suggested_by: user.id,
      note: validation.data.note ? sanitizeString(validation.data.note) : null
    })
    .select()
    .single();

  if (error) return { error };

  // Record activity
  if (data) {
    await supabase.from('family_activity_feed').insert({
      family_id: validation.data.family_id,
      user_id: user.id,
      activity_type: 'suggestion_sent',
      target_type: 'suggestion',
      target_id: data.id,
      camp_id: validation.data.camp_id,
      child_id: validation.data.child_id,
      week_date: validation.data.week_date
    });
  }

  return { data };
}

/**
 * Respond to a camp suggestion
 */
export async function respondToSuggestion(suggestionId, accept) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const { data, error } = await supabase
    .from('camp_suggestions')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_by: user.id,
      responded_at: new Date().toISOString()
    })
    .eq('id', suggestionId)
    .select('family_id, camp_id, child_id, week_date')
    .single();

  if (error) return { error };

  // Record activity
  if (data) {
    await supabase.from('family_activity_feed').insert({
      family_id: data.family_id,
      user_id: user.id,
      activity_type: accept ? 'suggestion_accepted' : 'suggestion_declined',
      target_type: 'suggestion',
      target_id: suggestionId,
      camp_id: data.camp_id,
      child_id: data.child_id,
      week_date: data.week_date
    });
  }

  return { data };
}

// ============================================================================
// APPROVAL REQUESTS HELPERS
// ============================================================================

/**
 * Get approval requests for a family
 */
export async function getApprovalRequests(familyId, status = null) {
  if (!supabase) return [];

  let query = supabase
    .from('approval_requests')
    .select(`
      *,
      requested_by_profile:profiles!approval_requests_requested_by_fkey(full_name, avatar_url),
      decided_by_profile:profiles!approval_requests_decided_by_fkey(full_name, avatar_url),
      children(name, color)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching approval requests:', error);
    return [];
  }
  return data;
}

/**
 * Request approval to add a camp
 */
export async function requestApproval(request) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(ApprovalRequestSchema, request);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      ...validation.data,
      requested_by: user.id,
      note: validation.data.note ? sanitizeString(validation.data.note) : null
    })
    .select()
    .single();

  if (error) return { error };

  // Record activity
  if (data) {
    await supabase.from('family_activity_feed').insert({
      family_id: validation.data.family_id,
      user_id: user.id,
      activity_type: 'approval_requested',
      target_type: 'approval',
      target_id: data.id,
      camp_id: validation.data.camp_id,
      child_id: validation.data.child_id,
      week_date: validation.data.week_start
    });
  }

  return { data };
}

/**
 * Respond to an approval request
 */
export async function respondToApproval(requestId, approve, decisionNote = null) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const { data, error } = await supabase
    .from('approval_requests')
    .update({
      status: approve ? 'approved' : 'denied',
      decided_by: user.id,
      decision_note: decisionNote ? sanitizeString(decisionNote) : null,
      decided_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select('family_id, camp_id, child_id, week_start, week_end, requested_price')
    .single();

  if (error) return { error };

  // Record activity
  if (data) {
    await supabase.from('family_activity_feed').insert({
      family_id: data.family_id,
      user_id: user.id,
      activity_type: approve ? 'approval_approved' : 'approval_denied',
      target_type: 'approval',
      target_id: requestId,
      camp_id: data.camp_id,
      child_id: data.child_id,
      week_date: data.week_start
    });
  }

  return { data };
}

// ============================================================================
// FAMILY ACTIVITY FEED HELPERS
// ============================================================================

/**
 * Get activity feed for a family
 */
export async function getFamilyActivityFeed(familyId, limit = 50, offset = 0) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('family_activity_feed')
    .select(`
      *,
      profiles:user_id(full_name, avatar_url),
      children(name, color)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
  return data;
}

// ============================================================================
// FAMILY NOTIFICATIONS HELPERS
// ============================================================================

/**
 * Get family notifications for current user
 */
export async function getFamilyNotifications(unreadOnly = false) {
  if (!supabase) return [];

  let query = supabase
    .from('family_notifications')
    .select(`
      *,
      families(name),
      from_user:profiles!family_notifications_from_user_id_fkey(full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching family notifications:', error);
    return [];
  }
  return data;
}

/**
 * Mark a family notification as read
 */
export async function markFamilyNotificationRead(notificationId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('family_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * Mark all family notifications as read
 */
export async function markAllFamilyNotificationsRead() {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase.rpc('mark_all_family_notifications_read', { p_user_id: user.id });
}

/**
 * Get unread family notification count
 */
export async function getUnreadFamilyNotificationCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('family_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  if (error) return 0;
  return count || 0;
}

// ============================================================================
// REAL-TIME SUBSCRIPTION HELPERS
// ============================================================================

/**
 * Subscribe to family notifications
 */
export function subscribeFamilyNotifications(userId, callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const subscription = supabase
    .channel(`family-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'family_notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

/**
 * Subscribe to family activity feed
 */
export function subscribeFamilyActivity(familyId, callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const subscription = supabase
    .channel(`family-activity-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'family_activity_feed',
        filter: `family_id=eq.${familyId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

/**
 * Subscribe to schedule comments
 */
export function subscribeScheduleComments(familyId, callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const subscription = supabase
    .channel(`schedule-comments-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schedule_comments',
        filter: `family_id=eq.${familyId}`
      },
      (payload) => {
        callback(payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

/**
 * Subscribe to camp suggestions
 */
export function subscribeCampSuggestions(familyId, callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const subscription = supabase
    .channel(`camp-suggestions-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'camp_suggestions',
        filter: `family_id=eq.${familyId}`
      },
      (payload) => {
        callback(payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

/**
 * Subscribe to approval requests
 */
export function subscribeApprovalRequests(familyId, callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const subscription = supabase
    .channel(`approval-requests-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'approval_requests',
        filter: `family_id=eq.${familyId}`
      },
      (payload) => {
        callback(payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

// ============================================================================
// ENHANCED NOTIFICATIONS HELPERS
// ============================================================================

/**
 * Get all notifications with optional filters
 * @param {Object} options - Filter options
 * @param {boolean} options.unreadOnly - Only return unread notifications
 * @param {string} options.category - Filter by category
 * @param {number} options.limit - Maximum notifications to return
 * @returns {Promise<Array>} Array of notifications
 */
export async function getNotificationsEnhanced(options = {}) {
  if (!supabase) return [];

  const { unreadOnly = false, category = null, limit = 50 } = options;

  let query = supabase
    .from('notifications')
    .select(`
      *,
      children(name, color)
    `)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  if (category) {
    query = query.eq('category', category);
  }

  // Filter out expired notifications
  query = query.or('expires_at.is.null,expires_at.gt.now()');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
}

/**
 * Get notification counts by category
 * @returns {Promise<Object>} Object with category counts
 */
export async function getNotificationCounts() {
  if (!supabase) return {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase.rpc('get_notification_counts', { p_user_id: user.id });

  if (error) {
    console.error('Error fetching notification counts:', error);
    return {};
  }

  // Convert array to object
  const counts = {};
  (data || []).forEach(row => {
    counts[row.category] = parseInt(row.count);
  });
  return counts;
}

/**
 * Dismiss a notification (soft delete)
 * @param {string} id - Notification ID
 */
export async function dismissNotification(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('notifications')
    .update({ dismissed: true })
    .eq('id', id);
}

/**
 * Dismiss all notifications
 */
export async function dismissAllNotifications() {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('notifications')
    .update({ dismissed: true })
    .eq('user_id', user.id)
    .eq('dismissed', false);
}

/**
 * Delete a notification permanently
 * @param {string} id - Notification ID
 */
export async function deleteNotification(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}

// ============================================================================
// NOTIFICATION PREFERENCES HELPERS
// ============================================================================

/**
 * Get user's notification preferences
 * @returns {Promise<Object|null>} Notification preferences object
 */
export async function getNotificationPreferences() {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If no preferences exist, return defaults
    if (error.code === 'PGRST116') {
      return getDefaultNotificationPreferences();
    }
    console.error('Error fetching notification preferences:', error);
    return null;
  }
  return data;
}

/**
 * Update user's notification preferences
 * @param {Object} preferences - Notification preferences to update
 */
export async function updateNotificationPreferences(preferences) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // SECURITY: Validate input
  const validation = validate(NotificationPreferencesSchema, preferences);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  // Upsert to handle case where preferences don't exist yet
  return supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      ...validation.data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();
}

/**
 * Get default notification preferences
 * @returns {Object} Default preferences
 */
export function getDefaultNotificationPreferences() {
  return {
    // Global settings
    notifications_enabled: true,
    email_enabled: true,
    push_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,

    // Registration alerts
    registration_alerts_enabled: true,
    registration_alert_days: 7,
    registration_opening_email: true,
    registration_opening_push: true,

    // Price notifications
    price_drop_enabled: true,
    price_drop_email: true,
    price_drop_threshold: 10,
    early_bird_reminder_enabled: true,
    early_bird_days_before: 3,

    // Waitlist notifications
    waitlist_updates_enabled: true,
    waitlist_email: true,
    waitlist_position_change: true,
    waitlist_spot_available: true,

    // New camp notifications
    new_camp_match_enabled: true,
    new_camp_email: false,
    match_by_category: true,
    match_by_age: true,
    match_by_price: true,

    // Schedule notifications
    schedule_conflict_enabled: true,
    schedule_conflict_email: false,
    coverage_gap_enabled: true,
    coverage_gap_email: false,
    coverage_reminder_day: 'monday',

    // Friend/Squad notifications
    friend_activity_enabled: true,
    friend_activity_email: false,
    friend_match_enabled: true,
    friend_match_email: true,
    squad_updates_enabled: true,
    squad_email: false,

    // Digest settings
    weekly_digest_enabled: true,
    weekly_digest_day: 'sunday',
    weekly_digest_time: '09:00',
    digest_include_recommendations: true,
    digest_include_price_changes: true,
    digest_include_registration_dates: true,
    digest_include_coverage_status: true,

    // Budget alerts
    budget_alerts_enabled: true,
    budget_warning_threshold: 80,
    budget_exceeded_email: true,
  };
}

// ============================================================================
// NOTIFICATION SUBSCRIPTIONS HELPERS
// ============================================================================

/**
 * Subscribe to notifications for a specific camp
 * @param {string} campId - Camp ID to watch
 * @param {Object} options - Subscription options
 */
export async function subscribeTocamp(campId, options = {}) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const subscription = {
    user_id: user.id,
    camp_id: campId,
    watch_registration: options.watchRegistration ?? true,
    watch_price: options.watchPrice ?? true,
    watch_availability: options.watchAvailability ?? true,
    watch_friends: options.watchFriends ?? false,
    target_price: options.targetPrice ?? null,
    child_id: options.childId ?? null,
    week_number: options.weekNumber ?? null,
  };

  return supabase
    .from('notification_subscriptions')
    .upsert(subscription, {
      onConflict: 'user_id,camp_id,child_id,week_number'
    })
    .select()
    .single();
}

/**
 * Unsubscribe from camp notifications
 * @param {string} campId - Camp ID
 */
export async function unsubscribeFromCamp(campId) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('notification_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('camp_id', campId);
}

/**
 * Get all notification subscriptions
 */
export async function getNotificationSubscriptions() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
  return data;
}

/**
 * Create a notification (client-side, for immediate in-app notifications)
 * Note: Most notifications should be created server-side via triggers/functions
 */
export async function createClientNotification(type, title, message, options = {}) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  // Use the database function to respect user preferences
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: user.id,
    p_type: type,
    p_title: title,
    p_message: message,
    p_category: options.category || 'general',
    p_priority: options.priority || 'normal',
    p_camp_id: options.campId || null,
    p_child_id: options.childId || null,
    p_squad_id: options.squadId || null,
    p_scheduled_camp_id: options.scheduledCampId || null,
    p_data: options.data || {},
    p_action_url: options.actionUrl || null,
    p_expires_at: options.expiresAt || null,
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { error };
  }

  return { data: { id: data } };
}
