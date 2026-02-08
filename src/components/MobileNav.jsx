import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useHaptic } from '../hooks/usePWA';

// Map routes to tab IDs for determining active state from URL
const ROUTE_TO_TAB = {
  '/': 'browse',
  '/schedule': 'schedule',
  '/dashboard': 'dashboard',
  '/wishlist': 'wishlist',
  '/settings': 'more',
};

export const MobileNav = memo(function MobileNav({
  favoritesCount = 0,
  hasNotifications = false
}) {
  const haptic = useHaptic();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [poppingTab, setPoppingTab] = useState(null);
  const navInnerRef = useRef(null);
  const [indicatorLeft, setIndicatorLeft] = useState(0);

  // Determine active tab from current URL path
  const activeTab = ROUTE_TO_TAB[location.pathname] || 'browse';

  // Tab configuration for mobile navigation
  // Note: Tab IDs match internal app views, not original spec terminology.
  // - "browse" = camp search/discovery (spec: "Explore")
  // - "schedule" = calendar planner (spec: "Plan")
  // - "dashboard" = user's home/overview (spec: "Home")
  // - "wishlist" = saved favorites (spec: "Saved")
  // - "more" = settings and overflow menu (spec: "Menu")
  const tabs = [
    {
      id: 'browse',
      label: 'Browse',
      to: '/',
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'schedule',
      label: 'Schedule',
      to: '/schedule',
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'dashboard',
      label: 'My Plan',
      to: '/dashboard',
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      to: '/wishlist',
      badge: favoritesCount,
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      id: 'more',
      label: 'More',
      to: '/settings',
      dot: hasNotifications,
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    }
  ];

  // Calculate indicator position based on active tab index
  const tabIds = tabs.map(t => t.id);
  const updateIndicatorPosition = useCallback(() => {
    if (!navInnerRef.current) return;
    const activeIndex = tabIds.indexOf(activeTab);
    if (activeIndex === -1) return;
    const buttons = navInnerRef.current.querySelectorAll('.mobile-nav-tab');
    const activeButton = buttons[activeIndex];
    if (activeButton) {
      const containerRect = navInnerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const left = buttonRect.left - containerRect.left + (buttonRect.width - 32) / 2;
      setIndicatorLeft(left);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    updateIndicatorPosition();
  }, [updateIndicatorPosition]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => updateIndicatorPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicatorPosition]);

  // Smooth auto-hide: scroll down hides, scroll up shows
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - lastScrollY.current;

          if (delta > 5 && currentScrollY > 100) {
            setIsVisible(false);
          } else if (delta < -5) {
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
  }, []);

  const handleNavClick = (tabId) => {
    haptic.light();

    // Trigger icon pop animation
    setPoppingTab(tabId);
    setTimeout(() => setPoppingTab(null), 200);

    setIsVisible(true);
  };

  return (
    <nav
      className={`mobile-nav ${isVisible ? 'mobile-nav--visible' : 'mobile-nav--hidden'}`}
      role="navigation"
      aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="mobile-nav-inner" ref={navInnerRef} style={{ position: 'relative' }}>
        {/* Sliding active tab indicator */}
        <span
          className="mobile-nav-indicator"
          style={{ left: `${indicatorLeft}px` }}
          aria-hidden="true"
        />
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isPopping = poppingTab === tab.id;

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.to === '/'}
              onClick={() => handleNavClick(tab.id)}
              className={`mobile-nav-tab ${isActive ? 'mobile-nav-tab--active' : ''}`}
              aria-label={tab.label}
            >
              <span
                className={`mobile-nav-icon ${isPopping ? 'mobile-nav-icon--pop' : ''}`}
              >
                {tab.icon(isActive)}
                {tab.badge > 0 && (
                  <span className="mobile-nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>
                )}
                {tab.dot && !tab.badge && (
                  <span className="mobile-nav-dot" />
                )}
              </span>
              <span className="mobile-nav-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});

export default MobileNav;
