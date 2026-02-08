import React, { memo } from 'react';
import { useHaptic } from '../hooks/usePWA';

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
      <button
        onClick={handleDismiss}
        className="update-toast-close"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="update-toast-content">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Update available</span>
      </div>
      <div className="update-toast-actions">
        <button onClick={handleDismiss} className="update-toast-dismiss" aria-label="Dismiss update">
          Later
        </button>
        <button onClick={handleUpdate} className="update-toast-btn">
          Refresh
        </button>
      </div>
    </div>
  );
});

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
