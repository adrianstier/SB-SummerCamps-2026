import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getScheduledCamps } from '../lib/supabase';

const ScheduleContext = createContext(null);

export function ScheduleProvider({ children }) {
  const { user, isConfigured } = useAuth();

  const [scheduledCamps, setScheduledCamps] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load schedule when user becomes available
  useEffect(() => {
    if (!isConfigured || !user) {
      setScheduledCamps([]);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadScheduleData() {
      try {
        const data = await getScheduledCamps();
        if (!cancelled) {
          setScheduledCamps(data || []);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadScheduleData();
    return () => { cancelled = true; };
  }, [user, isConfigured]);

  const refreshSchedule = useCallback(async function refreshSchedule() {
    try {
      const data = await getScheduledCamps();
      setScheduledCamps(data || []);
    } catch (error) {
      console.error('Failed to refresh schedule:', error);
    }
  }, []);

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

  const value = useMemo(() => ({
    scheduledCamps,
    loaded,
    refreshSchedule,
    getScheduleForWeek,
    getTotalCost,
    getCoverageGaps
  }), [scheduledCamps, loaded, refreshSchedule, getScheduleForWeek, getTotalCost, getCoverageGaps]);

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
