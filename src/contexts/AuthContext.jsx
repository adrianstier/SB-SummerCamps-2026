import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  supabase,
  signInWithGoogle,
  signOut as supabaseSignOut,
  onAuthStateChange,
  getProfile,
  getChildren,
  getFavorites,
  getScheduledCamps,
  getNotifications,
  getUnreadNotificationCount,
  updateProfile,
  getSquads,
  getSquadNotifications,
  getUnreadSquadNotificationCount,
  getCampInterests,
  getFriendInterestCounts
} from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyChildren, setFamilyChildren] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [scheduledCamps, setScheduledCamps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Squads state
  const [squads, setSquads] = useState([]);
  const [squadNotifications, setSquadNotifications] = useState([]);
  const [squadUnreadCount, setSquadUnreadCount] = useState(0);
  const [campInterests, setCampInterests] = useState([]);
  const [friendInterestCounts, setFriendInterestCounts] = useState({});

  // Check if Supabase is configured
  const isConfigured = !!supabase;

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Check for OAuth errors in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    const error = hashParams.get('error');
    if (error || errorDescription) {
      console.error('OAuth error:', error, errorDescription);
      alert(`Sign in failed: ${errorDescription || error}`);
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setFamilyChildren([]);
        setFavorites([]);
        setScheduledCamps([]);
        setNotifications([]);
        setUnreadCount(0);
        setSquads([]);
        setSquadNotifications([]);
        setSquadUnreadCount(0);
        setCampInterests([]);
        setFriendInterestCounts({});
        setShowOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  async function loadUserData(userId) {
    try {
      const [
        profileData,
        childrenData,
        favoritesData,
        scheduledData,
        notificationsData,
        unreadCountData,
        squadsData,
        squadNotificationsData,
        squadUnreadCountData,
        campInterestsData,
        friendInterestCountsData
      ] = await Promise.all([
        getProfile(userId),
        getChildren(),
        getFavorites(),
        getScheduledCamps(),
        getNotifications(),
        getUnreadNotificationCount(),
        getSquads(),
        getSquadNotifications(),
        getUnreadSquadNotificationCount(),
        getCampInterests(),
        getFriendInterestCounts()
      ]);

      setProfile(profileData);
      setFamilyChildren(childrenData);
      setFavorites(favoritesData);
      setScheduledCamps(scheduledData);
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
      setSquads(squadsData);
      setSquadNotifications(squadNotificationsData);
      setSquadUnreadCount(squadUnreadCountData);
      setCampInterests(campInterestsData);
      setFriendInterestCounts(friendInterestCountsData);

      // Check if user needs onboarding
      // Only show for truly new users (created within last 10 minutes) to avoid re-triggering
      const isNewUser = profileData &&
        !profileData.onboarding_completed &&
        childrenData.length === 0 &&
        new Date(profileData.created_at) > new Date(Date.now() - 10 * 60 * 1000);

      if (isNewUser) {
        setShowOnboarding(true);
      }

      // Update last active timestamp
      updateProfile({ last_active_at: new Date().toISOString() });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  const refreshProfile = useCallback(async function refreshProfile() {
    if (user) {
      try {
        const data = await getProfile(user.id);
        setProfile(data || null);
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    }
  }, [user]);

  const refreshFavorites = useCallback(async function refreshFavorites() {
    try {
      const data = await getFavorites();
      setFavorites(data || []);
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
    }
  }, []);

  const refreshSchedule = useCallback(async function refreshSchedule() {
    try {
      const data = await getScheduledCamps();
      setScheduledCamps(data || []);
    } catch (error) {
      console.error('Failed to refresh schedule:', error);
    }
  }, []);

  const refreshChildren = useCallback(async function refreshChildren() {
    try {
      const data = await getChildren();
      setFamilyChildren(data || []);
    } catch (error) {
      console.error('Failed to refresh children:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async function refreshNotifications() {
    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount()
      ]);
      setNotifications(notificationsData || []);
      setUnreadCount(unreadCountData || 0);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, []);

  const refreshSquads = useCallback(async function refreshSquads() {
    try {
      const data = await getSquads();
      setSquads(data || []);
    } catch (error) {
      console.error('Failed to refresh squads:', error);
    }
  }, []);

  const refreshSquadNotifications = useCallback(async function refreshSquadNotifications() {
    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getSquadNotifications(),
        getUnreadSquadNotificationCount()
      ]);
      setSquadNotifications(notificationsData || []);
      setSquadUnreadCount(unreadCountData || 0);
    } catch (error) {
      console.error('Failed to refresh squad notifications:', error);
    }
  }, []);

  const refreshCampInterests = useCallback(async function refreshCampInterests() {
    try {
      const [interestsData, countsData] = await Promise.all([
        getCampInterests(),
        getFriendInterestCounts()
      ]);
      setCampInterests(interestsData || []);
      setFriendInterestCounts(countsData || {});
    } catch (error) {
      console.error('Failed to refresh camp interests:', error);
    }
  }, []);

  const refreshFriendInterests = useCallback(async function refreshFriendInterests() {
    try {
      const data = await getFriendInterestCounts();
      setFriendInterestCounts(data || {});
    } catch (error) {
      console.error('Failed to refresh friend interests:', error);
    }
  }, []);

  const signIn = useCallback(async function signIn() {
    return signInWithGoogle();
  }, []);

  const signOut = useCallback(async function signOut() {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
    setFamilyChildren([]);
    setFavorites([]);
    setScheduledCamps([]);
    setNotifications([]);
    setUnreadCount(0);
    setSquads([]);
    setSquadNotifications([]);
    setSquadUnreadCount(0);
    setCampInterests([]);
    setFriendInterestCounts({});
    setShowOnboarding(false);
  }, []);

  const completeOnboarding = useCallback(function completeOnboarding() {
    setShowOnboarding(false);
    refreshProfile();
    refreshChildren();
  }, [refreshProfile, refreshChildren]);

  // Check if a camp is favorited
  const isFavorited = useCallback(function isFavorited(campId) {
    return favorites.some(f => f.camp_id === campId);
  }, [favorites]);

  // Get scheduled camps for a specific week
  const getScheduleForWeek = useCallback(function getScheduleForWeek(startDate, endDate) {
    return scheduledCamps.filter(sc => {
      const scStart = new Date(sc.start_date);
      const scEnd = new Date(sc.end_date);
      const weekStart = new Date(startDate);
      const weekEnd = new Date(endDate);

      return (scStart <= weekEnd && scEnd >= weekStart);
    });
  }, [scheduledCamps]);

  // Calculate total cost
  const getTotalCost = useCallback(function getTotalCost() {
    return scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
      .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
  }, [scheduledCamps]);

  // Get coverage gaps
  const getCoverageGaps = useCallback(function getCoverageGaps(childId, summerWeeks) {
    const childSchedule = scheduledCamps.filter(
      sc => sc.child_id === childId && sc.status !== 'cancelled'
    );

    return summerWeeks.filter(week => {
      const weekStart = new Date(week.startDate);
      const weekEnd = new Date(week.endDate);

      return !childSchedule.some(sc => {
        const scStart = new Date(sc.start_date);
        const scEnd = new Date(sc.end_date);
        return (scStart <= weekEnd && scEnd >= weekStart);
      });
    });
  }, [scheduledCamps]);

  // Recommendation scoring weights
  const SCORE_WEIGHTS = {
    CATEGORY_MATCH: 30,
    AGE_MATCH: 25,
    FAVORITED: 15,
    HAS_DESCRIPTION: 5,
    HAS_CONTACT: 5,
    HAS_WEBSITE: 5,
    HAS_EXTENDED_CARE: 5,
    FOOD_INCLUDED: 3,
  };

  // Get recommended camps based on preferences and children
  const getRecommendationScores = useCallback(function getRecommendationScores(camps) {
    if (!profile || familyChildren.length === 0) return [];

    const preferredCategories = profile.preferred_categories || [];
    const childAges = familyChildren.map(c => c.age_as_of_summer).filter(Boolean);

    return camps.map(camp => {
      let score = 0;

      // Category match (high weight)
      if (preferredCategories.includes(camp.category)) {
        score += SCORE_WEIGHTS.CATEGORY_MATCH;
      }

      // Age match
      if (childAges.length > 0) {
        const campMinAge = parseInt(camp.min_age) || 0;
        const campMaxAge = parseInt(camp.max_age) || 18;
        const hasMatchingAge = childAges.some(age => age >= campMinAge && age <= campMaxAge);
        if (hasMatchingAge) {
          score += SCORE_WEIGHTS.AGE_MATCH;
        }
      }

      // Already favorited (boost)
      if (favorites.some(f => f.camp_id === camp.id)) {
        score += SCORE_WEIGHTS.FAVORITED;
      }

      // Has good data (boost)
      if (camp.description && camp.description.length > 100) score += SCORE_WEIGHTS.HAS_DESCRIPTION;
      if (camp.contact_email || camp.contact_phone) score += SCORE_WEIGHTS.HAS_CONTACT;
      if (camp.website_url && camp.website_url !== 'N/A') score += SCORE_WEIGHTS.HAS_WEBSITE;

      // Features boost
      if (camp.has_extended_care) score += SCORE_WEIGHTS.HAS_EXTENDED_CARE;
      if (camp.food_included) score += SCORE_WEIGHTS.FOOD_INCLUDED;

      return { camp, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  }, [profile, familyChildren, favorites]);

  // Get dashboard stats
  const getDashboardStats = useCallback(function getDashboardStats() {
    const totalScheduled = scheduledCamps.filter(sc => sc.status !== 'cancelled').length;
    const totalCost = scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
      .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
    const weeksWithCamps = new Set(scheduledCamps.map(sc => sc.start_date)).size;
    const favoritesCount = favorites.length;

    return {
      totalScheduled,
      totalCost,
      weeksWithCamps,
      favoritesCount,
      childrenCount: familyChildren.length
    };
  }, [scheduledCamps, favorites, familyChildren]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isConfigured,
    signIn,
    signOut,
    // Onboarding
    showOnboarding,
    completeOnboarding,
    // Profile
    refreshProfile,
    // Family
    children: familyChildren,
    refreshChildren,
    // Favorites
    favorites,
    refreshFavorites,
    isFavorited,
    // Schedule
    scheduledCamps,
    refreshSchedule,
    getScheduleForWeek,
    getTotalCost,
    getCoverageGaps,
    // Notifications
    notifications,
    unreadCount,
    refreshNotifications,
    // Squads
    squads,
    squadNotifications,
    squadUnreadCount,
    campInterests,
    friendInterestCounts,
    refreshSquads,
    refreshSquadNotifications,
    refreshCampInterests,
    refreshFriendInterests,
    // Recommendations
    getRecommendationScores,
    getDashboardStats
  }), [
    user,
    profile,
    loading,
    isConfigured,
    signIn,
    signOut,
    showOnboarding,
    completeOnboarding,
    refreshProfile,
    familyChildren,
    refreshChildren,
    favorites,
    refreshFavorites,
    isFavorited,
    scheduledCamps,
    refreshSchedule,
    getScheduleForWeek,
    getTotalCost,
    getCoverageGaps,
    notifications,
    unreadCount,
    refreshNotifications,
    squads,
    squadNotifications,
    squadUnreadCount,
    campInterests,
    friendInterestCounts,
    refreshSquads,
    refreshSquadNotifications,
    refreshCampInterests,
    refreshFriendInterests,
    getRecommendationScores,
    getDashboardStats
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
