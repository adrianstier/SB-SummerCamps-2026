import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, getUnreadNotificationCount } from '../lib/supabase';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user, isConfigured } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load notifications when user becomes available
  useEffect(() => {
    if (!isConfigured || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadNotificationsData() {
      try {
        const [notificationsData, unreadCountData] = await Promise.all([
          getNotifications(),
          getUnreadNotificationCount()
        ]);
        if (!cancelled) {
          setNotifications(notificationsData || []);
          setUnreadCount(unreadCountData || 0);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error loading notifications data:', error);
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadNotificationsData();
    return () => { cancelled = true; };
  }, [user, isConfigured]);

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

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    refreshNotifications
  }), [notifications, unreadCount, refreshNotifications]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
