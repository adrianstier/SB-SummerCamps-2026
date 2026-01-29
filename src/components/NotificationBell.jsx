import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  dismissAllNotifications
} from '../lib/supabase';

// Notification type configurations
const NOTIFICATION_CONFIG = {
  // Registration
  registration_reminder: { icon: 'calendar', color: 'var(--ocean-500)', category: 'registration' },
  registration_open: { icon: 'check-circle', color: 'var(--sage-500)', category: 'registration' },
  registration_opening_alert: { icon: 'bell', color: 'var(--terra-500)', category: 'registration' },

  // Pricing
  price_drop: { icon: 'tag', color: 'var(--sage-500)', category: 'pricing' },
  early_bird_deadline: { icon: 'clock', color: 'var(--sun-500)', category: 'pricing' },
  budget_alert: { icon: 'alert', color: 'var(--terra-500)', category: 'pricing' },

  // Availability
  spots_available: { icon: 'users', color: 'var(--ocean-500)', category: 'schedule' },
  waitlist_update: { icon: 'list', color: 'var(--ocean-400)', category: 'schedule' },
  camp_session_filling: { icon: 'alert', color: 'var(--sun-500)', category: 'schedule' },

  // Schedule
  schedule_reminder: { icon: 'calendar', color: 'var(--earth-500)', category: 'schedule' },
  schedule_conflict: { icon: 'alert-triangle', color: 'var(--terra-500)', category: 'schedule' },
  coverage_gap_reminder: { icon: 'alert-circle', color: 'var(--sun-500)', category: 'schedule' },

  // Social
  friend_activity: { icon: 'users', color: 'var(--ocean-500)', category: 'social' },
  friend_match: { icon: 'heart', color: 'var(--terra-400)', category: 'social' },
  squad_member_joined: { icon: 'user-plus', color: 'var(--sage-500)', category: 'social' },
  squad_schedule_change: { icon: 'calendar', color: 'var(--ocean-400)', category: 'social' },

  // Other
  new_camp_match: { icon: 'star', color: 'var(--sun-500)', category: 'general' },
  camp_update: { icon: 'info', color: 'var(--earth-500)', category: 'general' },
  review_reply: { icon: 'message', color: 'var(--ocean-500)', category: 'general' },
  question_answered: { icon: 'message', color: 'var(--sage-500)', category: 'general' },
  weekly_digest: { icon: 'mail', color: 'var(--earth-500)', category: 'system' },
  system: { icon: 'info', color: 'var(--earth-400)', category: 'system' },
  new_session: { icon: 'plus', color: 'var(--sage-500)', category: 'general' },
};

// Icon components
function NotificationIcon({ type, size = 16 }) {
  const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system;
  const iconColor = config.color;

  const icons = {
    bell: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'check-circle': (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tag: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    clock: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    'user-plus': (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    list: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    alert: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    'alert-triangle': (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    'alert-circle': (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    heart: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    info: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    mail: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    plus: (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  };

  const iconName = config.icon || 'bell';
  return icons[iconName] || icons.bell;
}

// Format relative time
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Category labels
const CATEGORY_LABELS = {
  registration: 'Registration',
  pricing: 'Pricing',
  schedule: 'Schedule',
  social: 'Friends',
  system: 'System',
  general: 'Updates',
};

// Category filters
const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'registration', label: 'Registration' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'social', label: 'Friends' },
];

export default function NotificationBell() {
  const { notifications, unreadCount, refreshNotifications } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => {
      const config = NOTIFICATION_CONFIG[n.type] || {};
      return config.category === activeFilter || n.category === activeFilter;
    });
  }, [notifications, activeFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.created_at);
      if (date >= today) {
        groups.today.push(notification);
      } else if (date >= yesterday) {
        groups.yesterday.push(notification);
      } else if (date >= weekAgo) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [filteredNotifications]);

  async function handleMarkAllRead() {
    setIsMarkingRead(true);
    try {
      await markAllNotificationsRead();
      await refreshNotifications();
    } finally {
      setIsMarkingRead(false);
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      await refreshNotifications();
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: notification.action_url }));
    }

    setIsOpen(false);
  }

  async function handleDismiss(e, notification) {
    e.stopPropagation();
    await dismissNotification(notification.id);
    await refreshNotifications();
  }

  function renderNotificationGroup(title, items) {
    if (items.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--earth-500)', backgroundColor: 'var(--sand-50)' }}>
          {title}
        </div>
        {items.map(notification => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-sand-50 ${
              !notification.read ? 'bg-ocean-50/30' : ''
            }`}
            style={{ borderColor: 'var(--sand-100)' }}
          >
            <div className="flex gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <NotificationIcon type={notification.type} size={18} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm ${!notification.read ? 'font-medium' : ''}`} style={{ color: 'var(--earth-800)' }}>
                    {notification.title}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ocean-500)' }} />
                    )}
                    <button
                      onClick={(e) => handleDismiss(e, notification)}
                      className="p-1 rounded hover:bg-sand-200 transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--earth-400)' }}
                      title="Dismiss"
                      aria-label="Dismiss notification"
                    >
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--earth-600)' }}>
                  {notification.message}
                </p>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs" style={{ color: 'var(--earth-400)' }}>
                    {formatTimeAgo(notification.created_at)}
                  </span>
                  {notification.priority === 'high' && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--terra-100)', color: 'var(--terra-600)' }}>
                      Important
                    </span>
                  )}
                  {notification.priority === 'urgent' && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--terra-500)', color: 'white' }}>
                      Urgent
                    </span>
                  )}
                  {notification.children?.name && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: notification.children.color ? `${notification.children.color}20` : 'var(--earth-100)',
                        color: notification.children.color || 'var(--earth-600)'
                      }}
                    >
                      {notification.children.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-sand-100"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5"
          style={{ color: 'var(--earth-600)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white rounded-full"
            style={{ backgroundColor: 'var(--terra-500)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl overflow-hidden z-50"
          style={{ border: '1px solid var(--sand-200)' }}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sand-100)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--earth-800)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingRead}
                className="text-xs font-medium transition-colors hover:underline disabled:opacity-50"
                style={{ color: 'var(--ocean-600)' }}
              >
                {isMarkingRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b" style={{ borderColor: 'var(--sand-100)' }}>
            {CATEGORY_FILTERS.map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'text-white'
                    : 'hover:bg-sand-100'
                }`}
                style={activeFilter === filter.key
                  ? { backgroundColor: 'var(--ocean-500)' }
                  : { color: 'var(--earth-600)' }
                }
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: 'var(--earth-300)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                  {activeFilter === 'all'
                    ? 'No notifications yet'
                    : `No ${CATEGORY_LABELS[activeFilter]?.toLowerCase() || activeFilter} notifications`}
                </p>
              </div>
            ) : (
              <div className="group">
                {renderNotificationGroup('Today', groupedNotifications.today)}
                {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
                {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
                {renderNotificationGroup('Earlier', groupedNotifications.older)}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-2 border-t text-center" style={{ borderColor: 'var(--sand-100)' }}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }));
                  setIsOpen(false);
                }}
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: 'var(--earth-500)' }}
              >
                Notification Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
