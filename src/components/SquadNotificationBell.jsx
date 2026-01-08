import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { markSquadNotificationRead, markAllSquadNotificationsRead } from '../lib/supabase';

export default function SquadNotificationBell() {
  const { squadNotifications, squadUnreadCount, refreshSquadNotifications } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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

  async function handleMarkAllRead() {
    await markAllSquadNotificationsRead();
    await refreshSquadNotifications();
  }

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      await markSquadNotificationRead(notification.id);
      await refreshSquadNotifications();
    }
    setIsOpen(false);
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'friend_match':
        return '🎉';
      case 'looking_for_friends':
        return '👀';
      case 'new_member':
        return '👤';
      case 'schedule_change':
        return '📅';
      default:
        return '🔔';
    }
  }

  function formatTime(dateString) {
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
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-sand-100 transition-colors"
      >
        <svg
          className="w-5 h-5 text-earth-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {squadUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {squadUnreadCount > 9 ? '9+' : squadUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-sand-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand-100">
            <span className="text-sm font-medium text-earth-800">Notifications</span>
            {squadUnreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-ocean-600 hover:text-ocean-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {squadNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-earth-500">No notifications yet</p>
              </div>
            ) : (
              squadNotifications.slice(0, 10).map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-sand-50 hover:bg-sand-50 transition-colors ${
                    !notification.read ? 'bg-ocean-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm ${!notification.read ? 'font-medium text-earth-900' : 'text-earth-700'}`}>
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-ocean-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-earth-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-earth-400">
                          {formatTime(notification.created_at)}
                        </span>
                        {notification.squads?.name && (
                          <span className="text-xs text-earth-400">
                            · {notification.squads.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
