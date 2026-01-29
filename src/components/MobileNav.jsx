import React, { memo, useState, useEffect } from 'react';
import { useHaptic } from '../hooks/usePWA';

/**
 * Bottom Navigation for mobile devices
 * Fixed at bottom with safe area support
 */
export const MobileNav = memo(function MobileNav({
  activeTab = 'browse',
  onTabChange,
  favoritesCount = 0,
  hasNotifications = false
}) {
  const haptic = useHaptic();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY && currentScrollY > 100;

      setIsVisible(!scrollingDown);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleTabClick = (tab) => {
    haptic.light();
    onTabChange?.(tab);
  };

  const tabs = [
    {
      id: 'browse',
      label: 'Browse',
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'favorites',
      label: 'Saved',
      badge: favoritesCount,
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profile',
      dot: hasNotifications,
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav
      className={`mobile-nav ${isVisible ? 'mobile-nav--visible' : 'mobile-nav--hidden'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mobile-nav-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`mobile-nav-tab ${activeTab === tab.id ? 'mobile-nav-tab--active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            aria-label={tab.label}
          >
            <span className="mobile-nav-icon">
              {tab.icon(activeTab === tab.id)}
              {tab.badge > 0 && (
                <span className="mobile-nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>
              )}
              {tab.dot && !tab.badge && (
                <span className="mobile-nav-dot" />
              )}
            </span>
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
});

/**
 * PWA Install Banner
 * Shows when app can be installed
 */
export const InstallBanner = memo(function InstallBanner({
  onInstall,
  onDismiss,
  visible = true
}) {
  const haptic = useHaptic();

  if (!visible) return null;

  const handleInstall = () => {
    haptic.medium();
    onInstall?.();
  };

  const handleDismiss = () => {
    haptic.light();
    onDismiss?.();
  };

  return (
    <div className="install-banner" role="banner" aria-label="Install app">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
            <rect width="512" height="512" rx="96" fill="#1e7578"/>
            <circle cx="256" cy="200" r="60" fill="#f9cf45"/>
            <path d="M60 380c50-40 100-20 150 0s100 40 150 0 100-40 150 0" stroke="#5ab8bc" strokeWidth="20" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div className="install-banner-text">
          <p className="install-banner-title">Add to Home Screen</p>
          <p className="install-banner-subtitle">Get the full app experience</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <button
          onClick={handleDismiss}
          className="install-banner-dismiss"
          aria-label="Dismiss"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="install-banner-install"
        >
          Install
        </button>
      </div>
    </div>
  );
});

/**
 * Offline Indicator
 * Shows when user is offline
 */
export const OfflineIndicator = memo(function OfflineIndicator({ isOnline, wasOffline }) {
  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`offline-indicator ${isOnline ? 'offline-indicator--online' : 'offline-indicator--offline'}`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Back online</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
          <span>You're offline</span>
        </>
      )}
    </div>
  );
});

/**
 * Update Available Toast
 * Shows when a new version of the app is available
 */
export const UpdateToast = memo(function UpdateToast({ visible, onUpdate, onDismiss }) {
  const haptic = useHaptic();

  if (!visible) return null;

  const handleUpdate = () => {
    haptic.medium();
    onUpdate?.();
  };

  return (
    <div className="update-toast" role="alert">
      <div className="update-toast-content">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Update available</span>
      </div>
      <button onClick={handleUpdate} className="update-toast-btn">
        Refresh
      </button>
    </div>
  );
});

/**
 * Pull to Refresh Indicator
 * Visual feedback for pull-to-refresh gesture
 */
export const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
  progress = 0,
  isRefreshing = false
}) {
  if (progress === 0 && !isRefreshing) return null;

  const rotation = Math.min(progress * 360, 360);
  const scale = Math.min(0.5 + progress * 0.5, 1);

  return (
    <div
      className="pull-refresh-indicator"
      style={{
        transform: `translateY(${Math.min(progress * 60, 60)}px)`,
        opacity: progress
      }}
    >
      <div
        className={`pull-refresh-spinner ${isRefreshing ? 'pull-refresh-spinner--active' : ''}`}
        style={{
          transform: isRefreshing ? undefined : `rotate(${rotation}deg) scale(${scale})`
        }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    </div>
  );
});
