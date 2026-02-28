import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFavorites, getCampPopularityData } from '../lib/supabase';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, isConfigured } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [campPopularity, setCampPopularity] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Load favorites when user becomes available
  useEffect(() => {
    if (!isConfigured || !user) {
      setFavorites([]);
      setCampPopularity({});
      setLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadFavoritesData() {
      try {
        const [favoritesData, popularityData] = await Promise.all([
          getFavorites(),
          getCampPopularityData()
        ]);
        if (!cancelled) {
          setFavorites(favoritesData || []);
          setCampPopularity(popularityData || {});
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error loading favorites data:', error);
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadFavoritesData();
    return () => { cancelled = true; };
  }, [user, isConfigured]);

  const refreshFavorites = useCallback(async function refreshFavorites() {
    try {
      const data = await getFavorites();
      setFavorites(data || []);
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
    }
  }, []);

  const refreshCampPopularity = useCallback(async function refreshCampPopularity() {
    try {
      const data = await getCampPopularityData();
      setCampPopularity(data || {});
    } catch (error) {
      console.error('Failed to refresh camp popularity:', error);
    }
  }, []);

  const isFavorited = useCallback(function isFavorited(campId) {
    return favorites.some(f => f.camp_id === campId);
  }, [favorites]);

  const value = useMemo(() => ({
    favorites,
    loaded,
    campPopularity,
    refreshFavorites,
    refreshCampPopularity,
    isFavorited
  }), [favorites, loaded, campPopularity, refreshFavorites, refreshCampPopularity, isFavorited]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
