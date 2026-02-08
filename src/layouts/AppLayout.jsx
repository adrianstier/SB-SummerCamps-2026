import React, { useState, useCallback, lazy, Suspense, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { usePWAInstall, useOnlineStatus, useServiceWorkerUpdate, useHaptic } from '../hooks/usePWA';
import { MobileNav } from '../components/MobileNav';
import { InstallBanner, OfflineIndicator, UpdateToast } from '../components/PWAComponents';

const OnboardingWizard = lazy(() => import('../components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const BrowsePage = lazy(() => import('../pages/BrowsePage'));

// Loading fallback for lazy-loaded modals
const ModalLoadingFallback = memo(function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
        <svg
          className="w-8 h-8 animate-spin loading-spinner-branded"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="modal-loading-text" style={{ color: 'var(--earth-700)' }}>Preparing your view...</p>
      </div>
    </div>
  );
});

export default function AppLayout() {
  const location = useLocation();
  const { authError, clearAuthError, showOnboarding, completeOnboarding } = useAuth();
  const { favorites } = useFavorites();

  // PWA hooks
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();
  const { isOnline } = useOnlineStatus();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const haptic = useHaptic();
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Handle install prompt
  const handleInstall = useCallback(async () => {
    haptic.medium();
    const installed = await promptInstall();
    if (installed) {
      setShowInstallBanner(false);
    }
  }, [promptInstall, haptic]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--sand-50)' }}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* PWA Install Banner */}
      {canInstall && showInstallBanner && !isStandalone && (
        <InstallBanner
          onInstall={handleInstall}
          onDismiss={() => setShowInstallBanner(false)}
        />
      )}

      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}

      {/* Update Toast */}
      {updateAvailable && (
        <UpdateToast onUpdate={applyUpdate} />
      )}

      {/* Auth Error Banner */}
      {authError && (
        <div className="auth-error-banner" role="alert">
          <div className="auth-error-content">
            <svg className="auth-error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="auth-error-text">Sign in failed: {authError}</p>
          </div>
          <button
            onClick={clearAuthError}
            className="auth-error-dismiss"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Route Content - Overlay pattern for camp detail modal */}
      {/* When backgroundLocation is set, render BrowsePage behind the overlay */}
      {location.state?.backgroundLocation ? (
        <>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <svg className="w-8 h-8 animate-spin loading-spinner-branded" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          }>
            <BrowsePage />
          </Suspense>
          <Outlet />
        </>
      ) : (
        <Outlet />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <OnboardingWizard onComplete={completeOnboarding} />
        </Suspense>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileNav
        favoritesCount={favorites?.length || 0}
      />
    </div>
  );
}
