import React, { createContext, useContext, useEffect, useState } from 'react';
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
      console.log('Initial session:', session ? 'User logged in' : 'No session');
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'User present' : 'No user');
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

  async function refreshProfile() {
    if (user) {
      const data = await getProfile(user.id);
      setProfile(data);
    }
  }

  async function refreshFavorites() {
    const data = await getFavorites();
    setFavorites(data);
  }

  async function refreshSchedule() {
    const data = await getScheduledCamps();
    setScheduledCamps(data);
  }

  async function refreshChildren() {
    const data = await getChildren();
    setFamilyChildren(data);
  }

  async function refreshNotifications() {
    const [notificationsData, unreadCountData] = await Promise.all([
      getNotifications(),
      getUnreadNotificationCount()
    ]);
    setNotifications(notificationsData);
    setUnreadCount(unreadCountData);
  }

  async function refreshSquads() {
    const data = await getSquads();
    setSquads(data);
  }

  async function refreshSquadNotifications() {
    const [notificationsData, unreadCountData] = await Promise.all([
      getSquadNotifications(),
      getUnreadSquadNotificationCount()
    ]);
    setSquadNotifications(notificationsData);
    setSquadUnreadCount(unreadCountData);
  }

  async function refreshCampInterests() {
    const [interestsData, countsData] = await Promise.all([
      getCampInterests(),
      getFriendInterestCounts()
    ]);
    setCampInterests(interestsData);
    setFriendInterestCounts(countsData);
  }

  async function signIn() {
    return signInWithGoogle();
  }

  async function signOut() {
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
  }

  function completeOnboarding() {
    setShowOnboarding(false);
    refreshProfile();
    refreshChildren();
  }

  // Check if a camp is favorited
  function isFavorited(campId) {
    return favorites.some(f => f.camp_id === campId);
  }

  // Get scheduled camps for a specific week
  function getScheduleForWeek(startDate, endDate) {
    return scheduledCamps.filter(sc => {
      const scStart = new Date(sc.start_date);
      const scEnd = new Date(sc.end_date);
      const weekStart = new Date(startDate);
      const weekEnd = new Date(endDate);

      return (scStart <= weekEnd && scEnd >= weekStart);
    });
  }

  // Calculate total cost
  function getTotalCost() {
    return scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
      .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
  }

  // Get coverage gaps
  function getCoverageGaps(childId, summerWeeks) {
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
  }

  // Get recommended camps based on preferences and children
  function getRecommendationScores(camps) {
    if (!profile || familyChildren.length === 0) return [];

    const preferredCategories = profile.preferred_categories || [];
    const childAges = familyChildren.map(c => c.age_as_of_summer).filter(Boolean);
    const childInterests = familyChildren.flatMap(c => c.interests || []);

    return camps.map(camp => {
      let score = 0;

      // Category match (high weight)
      if (preferredCategories.includes(camp.category)) {
        score += 30;
      }

      // Age match
      if (childAges.length > 0) {
        const campMinAge = parseInt(camp.min_age) || 0;
        const campMaxAge = parseInt(camp.max_age) || 18;
        const hasMatchingAge = childAges.some(age => age >= campMinAge && age <= campMaxAge);
        if (hasMatchingAge) {
          score += 25;
        }
      }

      // Already favorited (boost)
      if (favorites.some(f => f.camp_id === camp.id)) {
        score += 15;
      }

      // Has good data (boost)
      if (camp.description && camp.description.length > 100) score += 5;
      if (camp.contact_email || camp.contact_phone) score += 5;
      if (camp.website_url && camp.website_url !== 'N/A') score += 5;

      // Features boost
      if (camp.has_extended_care) score += 5;
      if (camp.food_included) score += 3;

      return { camp, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  }

  // Get dashboard stats
  function getDashboardStats() {
    const totalScheduled = scheduledCamps.filter(sc => sc.status !== 'cancelled').length;
    const totalCost = getTotalCost();
    const weeksWithCamps = new Set(scheduledCamps.map(sc => sc.start_date)).size;
    const favoritesCount = favorites.length;

    return {
      totalScheduled,
      totalCost,
      weeksWithCamps,
      favoritesCount,
      childrenCount: familyChildren.length
    };
  }

  const value = {
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
    // Recommendations
    getRecommendationScores,
    getDashboardStats
  };

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
