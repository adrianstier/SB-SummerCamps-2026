import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { getSummerWeeks2026 } from '../lib/supabase';
import {
  getRecommendations,
  getSimilarCamps,
  getGapSuggestions,
  getPopularCamps,
  getPersonalizedHomepage
} from '../lib/recommendations';

/**
 * Hook that provides recommendation functions.
 * Composes data from AuthContext, FavoritesContext, and ScheduleContext.
 */
export function useRecommendations() {
  const { profile, children: familyChildren } = useAuth();
  const { favorites, campPopularity } = useFavorites();
  const { scheduledCamps, getCoverageGaps } = useSchedule();

  // Build recommendation context from current user state
  const buildRecommendationContext = useCallback(function buildRecommendationContext(allCamps) {
    return {
      profile,
      children: familyChildren,
      favorites,
      scheduledCamps,
      allCamps,
      summerWeeks: getSummerWeeks2026()
    };
  }, [profile, familyChildren, favorites, scheduledCamps]);

  // Get recommended camps based on preferences and children
  const getRecommendationScores = useCallback(function getRecommendationScores(camps, limit = 10) {
    if (!camps || camps.length === 0) return [];
    const context = buildRecommendationContext(camps);
    return getRecommendations(camps, context, limit);
  }, [buildRecommendationContext]);

  // Get camps similar to a specific camp
  const findSimilarCamps = useCallback(function findSimilarCamps(camp, allCamps, limit = 4) {
    if (!camp || !allCamps) return [];
    return getSimilarCamps(camp, allCamps, limit);
  }, []);

  // Get suggestions to fill coverage gaps
  const getGapFillingSuggestions = useCallback(function getGapFillingSuggestions(camps) {
    if (!camps || camps.length === 0) return {};
    const context = buildRecommendationContext(camps);
    return getGapSuggestions(camps, context);
  }, [buildRecommendationContext]);

  // Get popular camps in the area (using actual favorites data)
  const getPopularInArea = useCallback(function getPopularInArea(camps, limit = 6) {
    if (!camps || camps.length === 0) return [];
    return getPopularCamps(camps, campPopularity, limit);
  }, [campPopularity]);

  // Get personalized homepage content
  const getHomepageContent = useCallback(function getHomepageContent(camps) {
    if (!camps || camps.length === 0) return { greeting: 'Find the right camp', sections: [] };
    const context = buildRecommendationContext(camps);
    return getPersonalizedHomepage(camps, context);
  }, [buildRecommendationContext]);

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

  return {
    getRecommendationScores,
    findSimilarCamps,
    getGapFillingSuggestions,
    getPopularInArea,
    getHomepageContent,
    getDashboardStats
  };
}
