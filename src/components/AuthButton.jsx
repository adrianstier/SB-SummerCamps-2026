import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function AuthButton() {
  const { user, profile, loading, isConfigured, signIn, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    function handleEscape(e) {
      if (e.key === 'Escape') setShowMenu(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMenu]);

  if (!isConfigured) {
    return null; // Don't show auth if not configured
  }

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full loading-skeleton"></div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all hover:border-[var(--ocean-400)] hover:bg-[var(--ocean-50)]"
        style={{
          background: 'white',
          color: 'var(--earth-700)',
          border: '2px solid var(--sand-200)'
        }}
      >
        <GoogleIcon />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-1 rounded-full transition-all"
        style={{ background: showMenu ? 'var(--sand-100)' : 'transparent' }}
        aria-label="User menu"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'User'}
            className="w-10 h-10 rounded-full object-cover border-2"
            style={{ borderColor: 'var(--sand-200)' }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
            style={{ background: 'var(--ocean-500)' }}
          >
            {(profile?.full_name || user.email)?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-lg z-50 overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--sand-200)' }}
            role="menu"
            aria-label="User menu"
          >
            <div className="p-4" style={{ borderBottom: '1px solid var(--sand-100)' }}>
              <p className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                {profile?.full_name || 'User'}
              </p>
              <p className="text-sm truncate" style={{ color: 'var(--sand-400)' }}>
                {user.email}
              </p>
            </div>

            <div className="p-2" role="group">
              <button
                onClick={() => {
                  setShowMenu(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--sand-50)] focus:bg-[var(--sand-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                style={{ color: 'var(--earth-700)' }}
                role="menuitem"
              >
                <DashboardIcon />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  // Navigate to schedule planner
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'planner' }));
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--sand-50)] focus:bg-[var(--sand-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                style={{ color: 'var(--earth-700)' }}
                role="menuitem"
              >
                <CalendarIcon />
                <span>My Schedule</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'favorites' }));
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--sand-50)] focus:bg-[var(--sand-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                style={{ color: 'var(--earth-700)' }}
                role="menuitem"
              >
                <HeartIcon />
                <span>Favorites</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'children' }));
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--sand-50)] focus:bg-[var(--sand-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                style={{ color: 'var(--earth-700)' }}
                role="menuitem"
              >
                <ChildIcon />
                <span>My Children</span>
              </button>
            </div>

            {profile?.role === 'admin' && (
              <div className="p-2" style={{ borderTop: '1px solid var(--sand-100)' }} role="group">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin' }));
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--ocean-50)] focus:bg-[var(--ocean-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                  style={{ color: 'var(--ocean-600)' }}
                  role="menuitem"
                >
                  <AdminIcon />
                  <span>Admin Dashboard</span>
                </button>
              </div>
            )}

            <div className="p-2" style={{ borderTop: '1px solid var(--sand-100)' }} role="group">
              <button
                onClick={() => {
                  setShowMenu(false);
                  signOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--terra-50)] focus:bg-[var(--terra-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-400)]"
                style={{ color: 'var(--terra-500)' }}
                role="menuitem"
              >
                <LogoutIcon />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

// Icons
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function ChildIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1H15" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
