import React, { memo, useState, useEffect, useRef } from 'react';
import { useHaptic } from '../hooks/usePWA';
import './SimpleMobileNav.css';

/**
 * SimpleMobileNav - Redesigned for clarity and thumb-zone optimization
 *
 * Design principles:
 * - Thumb-zone first: Bottom-anchored, large tap targets
 * - Auto-hide on scroll: More screen space for content
 * - Clean icons: Simple, recognizable, no clutter
 * - Instant feedback: Haptics + visual state
 */

const NAV_ITEMS = [
  {
    id: 'browse',
    label: 'Browse',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    )
  },
  {
    id: 'wishlist',
    label: 'Saved',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  {
    id: 'schedule',
    label: 'Plan',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  },
  {
    id: 'dashboard',
    label: 'Home',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
];

/**
 * Main Mobile Navigation Component
 */
export const SimpleMobileNav = memo(function SimpleMobileNav({
  activeTab = 'browse',
  onTabChange,
  favoritesCount = 0,
  hasNotifications = false,
  hideOnScroll = true
}) {
  const haptic = useHaptic();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [scrollDirection, setScrollDirection] = useState('up');

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    if (!hideOnScroll) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - lastScrollY.current;

          // Only hide if scrolling down and past threshold
          if (delta > 5 && currentScrollY > 80) {
            setScrollDirection('down');
            setIsVisible(false);
          } else if (delta < -5) {
            setScrollDirection('up');
            setIsVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  const handleTabClick = (tabId) => {
    haptic.light();
    onTabChange?.(tabId);

    // Always show nav after tab change
    setIsVisible(true);
  };

  return (
    <nav
      className={`simple-mobile-nav ${isVisible ? 'simple-mobile-nav--visible' : 'simple-mobile-nav--hidden'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="simple-mobile-nav-track">
        <div className="simple-mobile-nav-inner">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'wishlist' && favoritesCount > 0;
            const showDot = item.id === 'dashboard' && hasNotifications;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`simple-mobile-nav-item ${isActive ? 'simple-mobile-nav-item--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                type="button"
              >
                <span className="simple-mobile-nav-icon">
                  {item.icon}
                  {showBadge && (
                    <span className="simple-mobile-nav-badge">
                      {favoritesCount > 9 ? '9+' : favoritesCount}
                    </span>
                  )}
                  {showDot && !showBadge && (
                    <span className="simple-mobile-nav-dot" />
                  )}
                </span>
                <span className="simple-mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

/**
 * PWA Install Prompt - Redesigned for minimal interference
 */
export const InstallPrompt = memo(function InstallPrompt({
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
    <div className="install-prompt" role="banner">
      <button
        onClick={handleDismiss}
        className="install-prompt-close"
        aria-label="Dismiss"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="install-prompt-content">
        <div className="install-prompt-icon">📱</div>
        <div className="install-prompt-text">
          <p className="install-prompt-title">Add to Home Screen</p>
          <p className="install-prompt-desc">Quick access, offline support</p>
        </div>
        <button
          onClick={handleInstall}
          className="install-prompt-btn"
          type="button"
        >
          Install
        </button>
      </div>
    </div>
  );
});

/**
 * Connection Status Indicator
 */
export const ConnectionStatus = memo(function ConnectionStatus({ isOnline }) {
  if (isOnline) return null;

  return (
    <div className="connection-status" role="status" aria-live="polite">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>You're offline</span>
    </div>
  );
});

/**
 * Update Available Toast
 */
export const UpdateToast = memo(function UpdateToast({ visible, onUpdate, onDismiss }) {
  const haptic = useHaptic();

  if (!visible) return null;

  const handleUpdate = () => {
    haptic.medium();
    onUpdate?.();
  };

  const handleDismiss = () => {
    haptic.light();
    onDismiss?.();
  };

  return (
    <div className="update-toast" role="alert">
      <div className="update-toast-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        <span>Update available</span>
      </div>
      <div className="update-toast-actions">
        <button onClick={handleDismiss} className="update-toast-dismiss" type="button">
          Later
        </button>
        <button onClick={handleUpdate} className="update-toast-update" type="button">
          Refresh
        </button>
      </div>
    </div>
  );
});

export default SimpleMobileNav;
