import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load all page components
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const FamilyPage = lazy(() => import('./pages/FamilyPage'));
const ChildrenPage = lazy(() => import('./pages/ChildrenPage'));
const JoinSquadPage = lazy(() => import('./pages/JoinSquadPage'));
const CampDetailPage = lazy(() => import('./pages/CampDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LazyPage({ children }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="w-8 h-8 animate-spin loading-spinner-branded" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LazyPage><BrowsePage /></LazyPage> },
      { path: 'schedule', element: <LazyPage><PlannerPage /></LazyPage> },
      { path: 'dashboard', element: <LazyPage><ProtectedRoute><DashboardPage /></ProtectedRoute></LazyPage> },
      { path: 'compare', element: <LazyPage><ComparePage /></LazyPage> },
      { path: 'settings', element: <LazyPage><SettingsPage /></LazyPage> },
      { path: 'wishlist', element: <LazyPage><WishlistPage /></LazyPage> },
      { path: 'admin', element: <LazyPage><ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute></LazyPage> },
      { path: 'insights', element: <LazyPage><InsightsPage /></LazyPage> },
      { path: 'budget', element: <LazyPage><BudgetPage /></LazyPage> },
      { path: 'family', element: <LazyPage><ProtectedRoute><FamilyPage /></ProtectedRoute></LazyPage> },
      { path: 'children', element: <LazyPage><ProtectedRoute><ChildrenPage /></ProtectedRoute></LazyPage> },
      { path: 'camp/:id', element: <LazyPage><CampDetailPage /></LazyPage> },
      { path: 'join/:code', element: <LazyPage><JoinSquadPage /></LazyPage> },
      { path: '*', element: <LazyPage><NotFoundPage /></LazyPage> },
    ]
  }
]);
