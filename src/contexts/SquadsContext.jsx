import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  getSquads,
  getSquadNotifications,
  getUnreadSquadNotificationCount,
  getCampInterests,
  getFriendInterestCounts
} from '../lib/supabase';

const SquadsContext = createContext(null);

export function SquadsProvider({ children }) {
  const { user, isConfigured } = useAuth();

  const [squads, setSquads] = useState([]);
  const [squadNotifications, setSquadNotifications] = useState([]);
  const [squadUnreadCount, setSquadUnreadCount] = useState(0);
  const [campInterests, setCampInterests] = useState([]);
  const [friendInterestCounts, setFriendInterestCounts] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Load squads data when user becomes available
  useEffect(() => {
    if (!isConfigured || !user) {
      setSquads([]);
      setSquadNotifications([]);
      setSquadUnreadCount(0);
      setCampInterests([]);
      setFriendInterestCounts({});
      setLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadSquadsData() {
      try {
        const [
          squadsData,
          squadNotificationsData,
          squadUnreadCountData,
          campInterestsData,
          friendInterestCountsData
        ] = await Promise.all([
          getSquads(),
          getSquadNotifications(),
          getUnreadSquadNotificationCount(),
          getCampInterests(),
          getFriendInterestCounts()
        ]);

        if (!cancelled) {
          setSquads(squadsData || []);
          setSquadNotifications(squadNotificationsData || []);
          setSquadUnreadCount(squadUnreadCountData || 0);
          setCampInterests(campInterestsData || []);
          setFriendInterestCounts(friendInterestCountsData || {});
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error loading squads data:', error);
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadSquadsData();
    return () => { cancelled = true; };
  }, [user, isConfigured]);

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

  const value = useMemo(() => ({
    squads,
    squadNotifications,
    squadUnreadCount,
    campInterests,
    friendInterestCounts,
    refreshSquads,
    refreshSquadNotifications,
    refreshCampInterests,
    refreshFriendInterests
  }), [
    squads,
    squadNotifications,
    squadUnreadCount,
    campInterests,
    friendInterestCounts,
    refreshSquads,
    refreshSquadNotifications,
    refreshCampInterests,
    refreshFriendInterests
  ]);

  return (
    <SquadsContext.Provider value={value}>
      {children}
    </SquadsContext.Provider>
  );
}

export function useSquads() {
  const context = useContext(SquadsContext);
  if (!context) {
    throw new Error('useSquads must be used within a SquadsProvider');
  }
  return context;
}
