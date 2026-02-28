import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useFavorites } from './FavoritesContext';
import { useSchedule } from './ScheduleContext';
import { useSquads } from './SquadsContext';
import { getSummerWeeks2026 } from '../lib/supabase';

const AchievementsContext = createContext(null);

// Achievement definitions - each has criteria, icon, and celebration message
export const ACHIEVEMENTS = {
  FIRST_CAMP: {
    id: 'first_camp',
    title: 'First Steps',
    description: 'Schedule your first camp',
    icon: 'overnight',
    celebration: 'You scheduled your first camp!',
    category: 'milestone'
  },
  WEEK_COVERED: {
    id: 'week_covered',
    title: 'Week Warrior',
    description: 'Fill your first week',
    icon: 'calendar',
    celebration: 'First week covered!',
    category: 'milestone'
  },
  HALF_SUMMER: {
    id: 'half_summer',
    title: 'Halfway There',
    description: 'Cover half your summer',
    icon: 'sun',
    celebration: 'Halfway through your summer plan!',
    category: 'milestone'
  },
  FULL_SUMMER: {
    id: 'full_summer',
    title: 'Summer Sorted',
    description: 'Cover your entire summer',
    icon: 'trophy',
    celebration: 'Your summer is fully planned!',
    category: 'milestone',
    isLegendary: true
  },
  MULTI_CHILD: {
    id: 'multi_child',
    title: 'Family Planner',
    description: 'Schedule camps for multiple children',
    icon: 'family',
    celebration: 'Managing schedules like a pro!',
    category: 'planning'
  },
  VARIETY_SEEKER: {
    id: 'variety_seeker',
    title: 'Variety Pack',
    description: 'Schedule 3+ different categories',
    icon: 'art',
    celebration: 'What a diverse summer lineup!',
    category: 'planning'
  },
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Plan before March 1st',
    icon: 'bird',
    celebration: 'Ahead of the game!',
    category: 'timing'
  },
  BUDGET_PRO: {
    id: 'budget_pro',
    title: 'Budget Boss',
    description: 'Stay under your summer budget',
    icon: 'coin',
    celebration: 'Smart spending!',
    category: 'planning'
  },
  FAVORITE_FIVE: {
    id: 'favorite_five',
    title: 'Camp Collector',
    description: 'Save 5+ camps to favorites',
    icon: 'heart',
    celebration: 'Building your dream list!',
    category: 'engagement'
  },
  COMPARE_MASTER: {
    id: 'compare_master',
    title: 'Comparison Pro',
    description: 'Compare camps side-by-side',
    icon: 'scale',
    celebration: 'Making informed decisions!',
    category: 'engagement'
  },
  STREAK_3: {
    id: 'streak_3',
    title: 'On a Roll',
    description: '3-day planning streak',
    icon: 'flame',
    celebration: 'Three days strong!',
    category: 'streak'
  },
  STREAK_7: {
    id: 'streak_7',
    title: 'Streak Champion',
    description: '7-day planning streak',
    icon: 'lightning',
    celebration: 'A whole week of planning!',
    category: 'streak'
  },
  SQUAD_JOINER: {
    id: 'squad_joiner',
    title: 'Squad Goals',
    description: 'Join a friend squad',
    icon: 'people',
    celebration: 'Better together!',
    category: 'social'
  },
  EXPLORER: {
    id: 'explorer',
    title: 'Explorer',
    description: 'View 10+ camp details',
    icon: 'search',
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
    icon: 'lightbulb'
  },
  {
    id: 'check_gaps',
    condition: (stats) => stats.gapCount > 0 && stats.scheduledCount > 0,
    tip: (stats) => {
      const hasMultipleKids = stats.childrenCount > 1;
      const gapWord = stats.gapCount === 1 ? 'gap' : 'gaps';
      return hasMultipleKids
        ? `Your family has ${stats.gapCount} total ${gapWord} across all kids. Check each child's schedule to fill them.`
        : `You have ${stats.gapCount} ${gapWord} in your schedule. Consider filling them to avoid last-minute scrambling.`;
    },
    icon: 'clipboard'
  },
  {
    id: 'variety',
    condition: (stats) => stats.categoryCount === 1 && stats.scheduledCount >= 3,
    tip: 'Mix it up! Kids often enjoy variety across different camp types.',
    icon: 'target'
  },
  {
    id: 'budget_warning',
    condition: (stats) => stats.budget && stats.totalCost > stats.budget * 0.8,
    tip: 'Approaching your budget limit. Consider more affordable options for remaining weeks.',
    icon: 'dollar-alert'
  },
  {
    id: 'extended_care',
    condition: (stats) => stats.hasWorkSchedule && !stats.hasExtendedCare,
    tip: 'Working parent? Look for camps with extended care to match your work hours.',
    icon: 'clock-plus'
  },
  {
    id: 'half_done',
    condition: (stats) => stats.coveragePercent >= 40 && stats.coveragePercent < 60,
    tip: 'Almost halfway there! Keep the momentum going.',
    icon: 'rocket'
  },
  {
    id: 'almost_done',
    condition: (stats) => stats.coveragePercent >= 80 && stats.coveragePercent < 100,
    tip: 'So close! Just a few more weeks to cover.',
    icon: 'confetti'
  },
  {
    id: 'favorites_empty',
    condition: (stats) => stats.favoritesCount === 0 && stats.viewedCamps >= 5,
    tip: 'Heart camps you like to easily find them later.',
    icon: 'heart'
  },
  {
    id: 'compare_camps',
    condition: (stats) => stats.favoritesCount >= 2 && !stats.hasCompared,
    tip: 'Compare your favorite camps side-by-side to make the best choice.',
    icon: 'scale'
  },
  {
    id: 'join_squad',
    condition: (stats) => stats.hasScheduled && !stats.hasSquad,
    tip: 'Friends going to the same camp? Create a squad to coordinate.',
    icon: 'people'
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
  const { children: familyChildren, profile } = useAuth();
  const { favorites } = useFavorites();
  const { scheduledCamps, getCoverageGaps } = useSchedule();
  const { squads } = useSquads();

  const summerWeeks = useMemo(() => getSummerWeeks2026(), []);

  // Achievements state
  const [earnedAchievements, setEarnedAchievements] = useState(() => {
    const saved = localStorage.getItem('sb-camps-achievements');
    return saved ? JSON.parse(saved) : [];
  });

  // Streak tracking uses local timezone for day boundaries.
  // Streak initialization:
  // - First visit: count starts at 1 (day 1 of streak), NOT 0
  // - Same-day revisit: count stays the same (checkAndUpdateStreak returns early)
  // - Next-day visit: checkAndUpdateStreak increments count to 2, etc.
  // - Skipped day: count resets to 1 in useState initializer (daysDiff > 1)
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('sb-camps-streak');
    // First visit: initialize to day 1 of streak (not 0 - this is intentional)
    if (!saved) {
      return { count: 1, lastVisit: new Date().toISOString(), bestStreak: 1 };
    }
    const data = JSON.parse(saved);
    // Ensure bestStreak exists for backwards compatibility
    if (data.bestStreak === undefined) {
      data.bestStreak = data.count || 0;
    }

    // Check if streak is still valid using local calendar days
    const lastVisit = new Date(data.lastVisit);
    const now = new Date();

    // Get local date only (midnight) for both dates
    const lastVisitLocal = new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate());
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate calendar days difference
    const daysDiff = Math.round((todayLocal - lastVisitLocal) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      // Streak broken - reset to day 1, but keep bestStreak
      return { count: 1, lastVisit: new Date().toISOString(), bestStreak: data.bestStreak };
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

  // Get local midnight date (ignores time component)
  const getLocalDateOnly = useCallback((date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Calculate calendar days difference using local timezone
  const getCalendarDaysDiff = useCallback((date1, date2) => {
    const d1 = getLocalDateOnly(date1);
    const d2 = getLocalDateOnly(date2);
    return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
  }, [getLocalDateOnly]);

  // Check and update streak based on current date (uses local timezone)
  const checkAndUpdateStreak = useCallback(() => {
    const now = new Date();
    const todayLocal = getLocalDateOnly(now);

    // Get last visit as local date
    const lastVisitDate = streak.lastVisit
      ? getLocalDateOnly(new Date(streak.lastVisit))
      : null;

    // Same local calendar day - no update needed
    if (lastVisitDate && todayLocal.getTime() === lastVisitDate.getTime()) {
      return;
    }

    // Calculate days since last visit using local calendar days
    const daysSinceLastVisit = lastVisitDate
      ? getCalendarDaysDiff(todayLocal, lastVisitDate)
      : null;

    setStreak(prev => {
      // If exactly 1 day since last visit, continue streak
      const isConsecutive = daysSinceLastVisit === 1;
      const newCount = isConsecutive ? prev.count + 1 : 1;

      return {
        count: newCount,
        lastVisit: now.toISOString(),
        bestStreak: Math.max(prev.bestStreak || 0, newCount)
      };
    });
  }, [streak.lastVisit, getLocalDateOnly, getCalendarDaysDiff]);

  // Update streak on mount and when user interacts with schedule
  useEffect(() => {
    checkAndUpdateStreak();
  }, [checkAndUpdateStreak, scheduledCamps.length]);

  // BUG-F-005: Check streak when page becomes visible again (handles long-running sessions)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkAndUpdateStreak();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAndUpdateStreak]);

  // Calculate planning stats
  const planningStats = useMemo(() => {
    const activeCamps = scheduledCamps.filter(sc => sc.status !== 'cancelled');
    const totalWeeks = summerWeeks.length;

    // Count covered weeks (weeks with at least one camp overlapping OR blocked)
    const coveredWeekNums = new Set();
    activeCamps.forEach(sc => {
      const scStart = new Date(sc.start_date);
      const scEnd = sc.end_date ? new Date(sc.end_date) : scStart;
      summerWeeks.forEach(week => {
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);
        // Check if camp overlaps with this week (camp starts before week ends AND camp ends after week starts)
        if (scStart <= weekEnd && scEnd >= weekStart) {
          coveredWeekNums.add(week.weekNum);
        }
      });
    });
    // Also count blocked weeks (vacations, family time, etc.) as covered
    const blockedWeeks = profile?.blocked_weeks || {};
    familyChildren.forEach(child => {
      const childBlocks = blockedWeeks[child.id];
      if (childBlocks) {
        Object.keys(childBlocks).forEach(weekNum => {
          coveredWeekNums.add(parseInt(weekNum, 10));
        });
      }
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
      const firstNew = Object.values(ACHIEVEMENTS).find(a => a.id === newAchievements[0]);
      if (firstNew) {
        setRecentAchievement(firstNew);

        // Trigger confetti for legendary achievements
        if (firstNew.isLegendary) {
          setCelebration('legendary');
        } else {
          setCelebration('achievement');
        }

        // Clear celebration after delay (6 seconds to allow reading)
        setTimeout(() => {
          setCelebration(null);
          setRecentAchievement(null);
        }, 6000);
      }
    }
  }, [earnedAchievements, planningStats, streak.count]);

  // Run achievement check when relevant data changes
  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

  // Get relevant tips based on current state
  const relevantTips = useMemo(() => {
    return PLANNING_TIPS
      .filter(tip => tip.condition(planningStats))
      .map(tip => ({
        ...tip,
        tip: typeof tip.tip === 'function' ? tip.tip(planningStats) : tip.tip
      }));
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
