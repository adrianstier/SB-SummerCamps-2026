import { createClient } from '@supabase/supabase-js';

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

  return supabase
    .from('profiles')
    .update(updates)
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

  return supabase
    .from('children')
    .insert({ ...child, user_id: user.id })
    .select()
    .single();
}

export async function updateChild(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('children')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteChild(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('children')
    .delete()
    .eq('id', id);
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

  return supabase
    .from('scheduled_camps')
    .insert({ ...schedule, user_id: user.id })
    .select()
    .single();
}

export async function updateScheduledCamp(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('scheduled_camps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteScheduledCamp(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('scheduled_camps')
    .delete()
    .eq('id', id);
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

  return supabase
    .from('reviews')
    .insert({ ...review, user_id: user.id })
    .select()
    .single();
}

export async function updateReview(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
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

  return supabase
    .from('comparison_lists')
    .update(updates)
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

export async function shareComparisonList(id) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const shareToken = crypto.randomUUID();

  return supabase
    .from('comparison_lists')
    .update({ is_shared: true, share_token: shareToken })
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

  return supabase
    .from('camp_watchlist')
    .insert({
      user_id: user.id,
      camp_id: campId,
      ...options
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

  return supabase
    .from('camp_questions')
    .insert({
      user_id: user.id,
      camp_id: campId,
      question_text: questionText
    })
    .select()
    .single();
}

export async function answerQuestion(questionId, answerText) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('camp_answers')
    .insert({
      user_id: user.id,
      question_id: questionId,
      answer_text: answerText
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

export function getSummerWeeks2026() {
  const weeks = [];
  const startDate = new Date('2026-06-08'); // First Monday after school ends

  for (let i = 0; i < 11; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Mon-Fri

    weeks.push({
      weekNum: i + 1,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      label: `Week ${i + 1}`,
      display: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    });
  }

  return weeks;
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

  return supabase
    .from('squads')
    .update(updates)
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

  return supabase
    .from('squad_members')
    .update(updates)
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

  // Merge member info with interests
  return interests.map(interest => {
    const member = members.find(m => m.user_id === interest.user_id);
    return {
      ...interest,
      reveal_identity: member?.reveal_identity || false,
      member_name: member?.profiles?.full_name || 'A friend'
    };
  });
}

export async function updateCampInterest(id, updates) {
  if (!supabase) return { error: { message: 'Not authenticated' } };

  return supabase
    .from('camp_interests')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Delete sample children (CASCADE will delete associated scheduled_camps)
    const { error: childrenError } = await supabase
      .from('children')
      .delete()
      .eq('user_id', user.id)
      .eq('is_sample', true);

    if (childrenError) throw childrenError;

    // Also delete any orphaned sample scheduled_camps (shouldn't exist due to CASCADE, but just in case)
    const { error: campsError } = await supabase
      .from('scheduled_camps')
      .delete()
      .eq('user_id', user.id)
      .eq('is_sample', true);

    if (campsError) throw campsError;

    // Mark tour as completed
    await updateProfile({ tour_completed: true });

    return { success: true };
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
