import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getSummerWeeks2026 } from '../lib/supabase';

const AchievementsContext = createContext(null);

// Achievement definitions - each has criteria, icon, and celebration message
export const ACHIEVEMENTS = {
  FIRST_CAMP: {
    id: 'first_camp',
    title: 'First Steps',
    description: 'Schedule your first camp',
    icon: '🏕️',
    celebration: 'You scheduled your first camp!',
    category: 'milestone'
  },
  WEEK_COVERED: {
    id: 'week_covered',
    title: 'Week Warrior',
    description: 'Fill your first week',
    icon: '📅',
    celebration: 'First week covered!',
    category: 'milestone'
  },
  HALF_SUMMER: {
    id: 'half_summer',
    title: 'Halfway There',
    description: 'Cover half your summer',
    icon: '☀️',
    celebration: 'Halfway through your summer plan!',
    category: 'milestone'
  },
  FULL_SUMMER: {
    id: 'full_summer',
    title: 'Summer Sorted',
    description: 'Cover your entire summer',
    icon: '🏆',
    celebration: 'Your summer is fully planned!',
    category: 'milestone',
    isLegendary: true
  },
  MULTI_CHILD: {
    id: 'multi_child',
    title: 'Family Planner',
    description: 'Schedule camps for multiple children',
    icon: '👨‍👩‍👧‍👦',
    celebration: 'Managing schedules like a pro!',
    category: 'planning'
  },
  VARIETY_SEEKER: {
    id: 'variety_seeker',
    title: 'Variety Pack',
    description: 'Schedule 3+ different categories',
    icon: '🎨',
    celebration: 'What a diverse summer lineup!',
    category: 'planning'
  },
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Plan before March 1st',
    icon: '🐦',
    celebration: 'Ahead of the game!',
    category: 'timing'
  },
  BUDGET_PRO: {
    id: 'budget_pro',
    title: 'Budget Boss',
    description: 'Stay under your summer budget',
    icon: '💰',
    celebration: 'Smart spending!',
    category: 'planning'
  },
  FAVORITE_FIVE: {
    id: 'favorite_five',
    title: 'Camp Collector',
    description: 'Save 5+ camps to favorites',
    icon: '❤️',
    celebration: 'Building your dream list!',
    category: 'engagement'
  },
  COMPARE_MASTER: {
    id: 'compare_master',
    title: 'Comparison Pro',
    description: 'Compare camps side-by-side',
    icon: '⚖️',
    celebration: 'Making informed decisions!',
    category: 'engagement'
  },
  STREAK_3: {
    id: 'streak_3',
    title: 'On a Roll',
    description: '3-day planning streak',
    icon: '🔥',
    celebration: 'Three days strong!',
    category: 'streak'
  },
  STREAK_7: {
    id: 'streak_7',
    title: 'Week Warrior',
    description: '7-day planning streak',
    icon: '⚡',
    celebration: 'A whole week of planning!',
    category: 'streak'
  },
  SQUAD_JOINER: {
    id: 'squad_joiner',
    title: 'Squad Goals',
    description: 'Join a friend squad',
    icon: '👥',
    celebration: 'Better together!',
    category: 'social'
  },
  EXPLORER: {
    id: 'explorer',
    title: 'Explorer',
    description: 'View 10+ camp details',
    icon: '🔍',
    celebration: 'Thorough researcher!',
    category: 'engagement'
  }
};

// Planning tips that appear contextually
export const PLANNING_TIPS = [
  {
    id: 'start_early',
    condition: (stats) => stats.scheduledCount === 0,
    tip: 'Popular camps fill fast. Start scheduling early to get your first choice.',
    icon: '💡'
  },
  {
    id: 'check_gaps',
    condition: (stats) => stats.gapCount > 0 && stats.scheduledCount > 0,
    tip: `You have ${stats.gapCount} ${stats.gapCount === 1 ? 'gap' : 'gaps'} in your schedule. Consider filling them to avoid last-minute scrambling.`,
    icon: '📋'
  },
  {
    id: 'variety',
    condition: (stats) => stats.categoryCount === 1 && stats.scheduledCount >= 3,
    tip: 'Mix it up! Kids often enjoy variety across different camp types.',
    icon: '🎯'
  },
  {
    id: 'budget_warning',
    condition: (stats) => stats.budget && stats.totalCost > stats.budget * 0.8,
    tip: 'Approaching your budget limit. Consider more affordable options for remaining weeks.',
    icon: '💵'
  },
  {
    id: 'extended_care',
    condition: (stats) => stats.hasWorkSchedule && !stats.hasExtendedCare,
    tip: 'Working parent? Look for camps with extended care to match your work hours.',
    icon: '⏰'
  },
  {
    id: 'half_done',
    condition: (stats) => stats.coveragePercent >= 40 && stats.coveragePercent < 60,
    tip: 'Almost halfway there! Keep the momentum going.',
    icon: '🚀'
  },
  {
    id: 'almost_done',
    condition: (stats) => stats.coveragePercent >= 80 && stats.coveragePercent < 100,
    tip: 'So close! Just a few more weeks to cover.',
    icon: '🎉'
  },
  {
    id: 'favorites_empty',
    condition: (stats) => stats.favoritesCount === 0 && stats.viewedCamps >= 5,
    tip: 'Heart camps you like to easily find them later.',
    icon: '❤️'
  },
  {
    id: 'compare_camps',
    condition: (stats) => stats.favoritesCount >= 2 && !stats.hasCompared,
    tip: 'Compare your favorite camps side-by-side to make the best choice.',
    icon: '⚖️'
  },
  {
    id: 'join_squad',
    condition: (stats) => stats.hasScheduled && !stats.hasSquad,
    tip: 'Friends going to the same camp? Create a squad to coordinate.',
    icon: '👥'
  }
];

// Camp facts that can appear randomly
export const CAMP_FACTS = [
  "The average Santa Barbara summer has 342 hours of sunshine.",
  "Beach camps can improve a child's confidence by up to 40%.",
  "Kids who attend diverse camp types develop broader skill sets.",
  "Early registration often saves 10-15% on camp fees.",
  "Children remember their summer camp experiences well into adulthood.",
  "Physical activity at camp can improve focus for the school year.",
  "Art camps boost creativity and problem-solving skills.",
  "STEM camps are the fastest-growing category in summer programs.",
  "Multi-week camps help kids build deeper friendships.",
  "Nature camps can reduce screen time effects by 25%."
];

export function AchievementsProvider({ children }) {
  const {
    scheduledCamps,
    favorites,
    children: familyChildren,
    profile,
    squads,
    getCoverageGaps
  } = useAuth();

  const summerWeeks = useMemo(() => getSummerWeeks2026(), []);

  // Achievements state
  const [earnedAchievements, setEarnedAchievements] = useState(() => {
    const saved = localStorage.getItem('sb-camps-achievements');
    return saved ? JSON.parse(saved) : [];
  });

  // Streak tracking
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('sb-camps-streak');
    if (!saved) return { count: 0, lastVisit: null };
    const data = JSON.parse(saved);
    // Check if streak is still valid (visited yesterday or today)
    const lastVisit = new Date(data.lastVisit);
    const today = new Date();
    const diffDays = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      return { count: 0, lastVisit: null };
    }
    return data;
  });

  // Celebration state (for confetti/animations)
  const [celebration, setCelebration] = useState(null);
  const [recentAchievement, setRecentAchievement] = useState(null);

  // Viewed camps counter (for Explorer achievement)
  const [viewedCampsCount, setViewedCampsCount] = useState(() => {
    const saved = localStorage.getItem('sb-camps-viewed');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Comparison tracking
  const [hasCompared, setHasCompared] = useState(() => {
    return localStorage.getItem('sb-camps-compared') === 'true';
  });

  // Current tip index (cycles through relevant tips)
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Persist achievements
  useEffect(() => {
    localStorage.setItem('sb-camps-achievements', JSON.stringify(earnedAchievements));
  }, [earnedAchievements]);

  // Persist streak
  useEffect(() => {
    localStorage.setItem('sb-camps-streak', JSON.stringify(streak));
  }, [streak]);

  // Update streak on visit
  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = streak.lastVisit ? new Date(streak.lastVisit).toDateString() : null;

    if (lastVisit !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastVisit === yesterday.toDateString();

      setStreak({
        count: isConsecutive ? streak.count + 1 : 1,
        lastVisit: new Date().toISOString()
      });
    }
  }, []);

  // Calculate planning stats
  const planningStats = useMemo(() => {
    const activeCamps = scheduledCamps.filter(sc => sc.status !== 'cancelled');
    const totalWeeks = summerWeeks.length;

    // Count covered weeks (weeks with at least one camp)
    const coveredWeekNums = new Set();
    activeCamps.forEach(sc => {
      const scStart = new Date(sc.start_date);
      summerWeeks.forEach(week => {
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);
        if (scStart >= weekStart && scStart <= weekEnd) {
          coveredWeekNums.add(week.weekNum);
        }
      });
    });

    // Count unique categories
    const categories = new Set(activeCamps.map(sc => {
      const camp = sc.camps || {};
      return camp.category;
    }).filter(Boolean));

    // Count children with scheduled camps
    const childrenWithCamps = new Set(activeCamps.map(sc => sc.child_id));

    // Total gaps across all children
    const totalGaps = familyChildren.reduce((sum, child) => {
      return sum + getCoverageGaps(child.id, summerWeeks).length;
    }, 0);

    const totalCost = activeCamps.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
    const budget = profile?.summer_budget || null;

    return {
      scheduledCount: activeCamps.length,
      coveredWeeks: coveredWeekNums.size,
      totalWeeks,
      coveragePercent: Math.round((coveredWeekNums.size / totalWeeks) * 100),
      gapCount: totalGaps,
      categoryCount: categories.size,
      childrenCount: familyChildren.length,
      childrenWithCamps: childrenWithCamps.size,
      favoritesCount: favorites.length,
      totalCost,
      budget,
      hasWorkSchedule: !!(profile?.work_hours_start && profile?.work_hours_end),
      hasExtendedCare: activeCamps.some(sc => sc.camps?.has_extended_care),
      viewedCamps: viewedCampsCount,
      hasCompared,
      hasSquad: squads.length > 0,
      hasScheduled: activeCamps.length > 0
    };
  }, [scheduledCamps, summerWeeks, familyChildren, favorites, profile, squads, viewedCampsCount, hasCompared, getCoverageGaps]);

  // Check and unlock achievements
  const checkAchievements = useCallback(() => {
    const newAchievements = [];

    // FIRST_CAMP - Schedule first camp
    if (!earnedAchievements.includes('first_camp') && planningStats.scheduledCount >= 1) {
      newAchievements.push('first_camp');
    }

    // WEEK_COVERED - Cover at least one week
    if (!earnedAchievements.includes('week_covered') && planningStats.coveredWeeks >= 1) {
      newAchievements.push('week_covered');
    }

    // HALF_SUMMER - Cover 50% of summer
    if (!earnedAchievements.includes('half_summer') && planningStats.coveragePercent >= 50) {
      newAchievements.push('half_summer');
    }

    // FULL_SUMMER - Cover entire summer
    if (!earnedAchievements.includes('full_summer') && planningStats.coveragePercent >= 100) {
      newAchievements.push('full_summer');
    }

    // MULTI_CHILD - Schedule for multiple children
    if (!earnedAchievements.includes('multi_child') && planningStats.childrenWithCamps >= 2) {
      newAchievements.push('multi_child');
    }

    // VARIETY_SEEKER - 3+ categories
    if (!earnedAchievements.includes('variety_seeker') && planningStats.categoryCount >= 3) {
      newAchievements.push('variety_seeker');
    }

    // EARLY_BIRD - Plan before March 1st
    const now = new Date();
    if (!earnedAchievements.includes('early_bird') &&
        planningStats.scheduledCount >= 1 &&
        now < new Date(2026, 2, 1)) {
      newAchievements.push('early_bird');
    }

    // BUDGET_PRO - Under budget with at least half summer covered
    if (!earnedAchievements.includes('budget_pro') &&
        planningStats.budget &&
        planningStats.totalCost <= planningStats.budget &&
        planningStats.coveragePercent >= 50) {
      newAchievements.push('budget_pro');
    }

    // FAVORITE_FIVE - 5+ favorites
    if (!earnedAchievements.includes('favorite_five') && planningStats.favoritesCount >= 5) {
      newAchievements.push('favorite_five');
    }

    // COMPARE_MASTER - Used comparison feature
    if (!earnedAchievements.includes('compare_master') && planningStats.hasCompared) {
      newAchievements.push('compare_master');
    }

    // STREAK_3 - 3 day streak
    if (!earnedAchievements.includes('streak_3') && streak.count >= 3) {
      newAchievements.push('streak_3');
    }

    // STREAK_7 - 7 day streak
    if (!earnedAchievements.includes('streak_7') && streak.count >= 7) {
      newAchievements.push('streak_7');
    }

    // SQUAD_JOINER - Join a squad
    if (!earnedAchievements.includes('squad_joiner') && planningStats.hasSquad) {
      newAchievements.push('squad_joiner');
    }

    // EXPLORER - View 10+ camps
    if (!earnedAchievements.includes('explorer') && planningStats.viewedCamps >= 10) {
      newAchievements.push('explorer');
    }

    // Unlock new achievements
    if (newAchievements.length > 0) {
      setEarnedAchievements(prev => [...prev, ...newAchievements]);

      // Show celebration for first new achievement
      const firstNew = ACHIEVEMENTS[newAchievements[0].toUpperCase()];
      if (firstNew) {
        setRecentAchievement(firstNew);

        // Trigger confetti for legendary achievements
        if (firstNew.isLegendary) {
          setCelebration('legendary');
        } else {
          setCelebration('achievement');
        }

        // Clear celebration after delay
        setTimeout(() => {
          setCelebration(null);
          setRecentAchievement(null);
        }, 5000);
      }
    }
  }, [earnedAchievements, planningStats, streak.count]);

  // Run achievement check when relevant data changes
  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

  // Get relevant tips based on current state
  const relevantTips = useMemo(() => {
    return PLANNING_TIPS.filter(tip => tip.condition(planningStats));
  }, [planningStats]);

  // Get current tip
  const currentTip = useMemo(() => {
    if (relevantTips.length === 0) return null;
    return relevantTips[currentTipIndex % relevantTips.length];
  }, [relevantTips, currentTipIndex]);

  // Cycle to next tip
  const nextTip = useCallback(() => {
    setCurrentTipIndex(prev => prev + 1);
  }, []);

  // Get random camp fact
  const getRandomFact = useCallback(() => {
    return CAMP_FACTS[Math.floor(Math.random() * CAMP_FACTS.length)];
  }, []);

  // Track camp view
  const trackCampView = useCallback(() => {
    setViewedCampsCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem('sb-camps-viewed', String(newCount));
      return newCount;
    });
  }, []);

  // Track comparison
  const trackComparison = useCallback(() => {
    if (!hasCompared) {
      setHasCompared(true);
      localStorage.setItem('sb-camps-compared', 'true');
    }
  }, [hasCompared]);

  // Dismiss celebration
  const dismissCelebration = useCallback(() => {
    setCelebration(null);
    setRecentAchievement(null);
  }, []);

  // Get achievement progress (earned / total)
  const achievementProgress = useMemo(() => {
    return {
      earned: earnedAchievements.length,
      total: Object.keys(ACHIEVEMENTS).length,
      percent: Math.round((earnedAchievements.length / Object.keys(ACHIEVEMENTS).length) * 100)
    };
  }, [earnedAchievements]);

  const value = useMemo(() => ({
    // Achievement data
    achievements: ACHIEVEMENTS,
    earnedAchievements,
    achievementProgress,

    // Planning stats
    planningStats,

    // Streak
    streak,

    // Celebrations
    celebration,
    recentAchievement,
    dismissCelebration,

    // Tips
    currentTip,
    relevantTips,
    nextTip,

    // Facts
    getRandomFact,

    // Tracking
    trackCampView,
    trackComparison,

    // Summer weeks for reference
    summerWeeks
  }), [
    earnedAchievements,
    achievementProgress,
    planningStats,
    streak,
    celebration,
    recentAchievement,
    dismissCelebration,
    currentTip,
    relevantTips,
    nextTip,
    getRandomFact,
    trackCampView,
    trackComparison,
    summerWeeks
  ]);

  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementsProvider');
  }
  return context;
}
