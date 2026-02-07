# React Router Migration Implementation Plan

## Executive Summary

This plan migrates the Santa Barbara Summer Camps app from modal-based navigation (activeTab state) to React Router v6 with URL-based routing. The current 3,325-line App.jsx uses conditional rendering based on `mobileTab` state ('browse', 'wishlist', 'schedule', 'dashboard'). The migration will enable deep linking, shareable URLs, browser history support, and better SEO while preserving the excellent mobile UX.

---

## Current Architecture Analysis

### Navigation State
- **Current method**: `mobileTab` state in App.jsx switches between views
- **SimpleMobileNav**: Sets `mobileTab` via `onTabChange` callback
- **Modal rendering**: All pages render as modals with `showWishlist`, `showPlanner`, `showDashboard` boolean flags
- **URL handling**: Manual URLSearchParams for filters only (useFilters hook)
- **Special routes**: Manual parsing for `/join/:code` (squad invites) and `?shared=` (shared schedules)

### Components to Route
1. **Browse** (default) - Main camp listing with filters
2. **Wishlist** - Saved/favorited camps modal
3. **Planner** - SchedulePlanner calendar modal
4. **Dashboard** - User dashboard modal (auth required)
5. **Settings** - Settings modal (auth required)
6. **Admin** - Admin dashboard (admin role required)
7. **Camp Detail** - Modal camp view (new route: `/camps/:id`)
8. **Squad Join** - Join squad via invite (`/join/:code`)
9. **Shared Schedule** - View shared schedule (`/shared/:id`)

### Filter State Preservation
The `useFilters` hook already encodes/decodes filters to URLSearchParams:
- Search query, categories, age, price range, weeks, features
- Current implementation uses `window.history.replaceState` to sync URL
- **Must preserve**: This behavior works well and should integrate with React Router's query params

### Authentication Integration
- **AuthContext**: Provides `user`, `loading`, `profile` state
- **Protected routes**: Dashboard, Settings, Admin require authentication
- **OAuth flow**: Supabase redirects to `/` with hash params (error handling in AuthContext)

---

## Target Architecture

### Route Structure

```
/ (BrowsePage)
├── /wishlist (WishlistPage - auth required)
├── /planner (PlannerPage - auth required)
├── /dashboard (DashboardPage - auth required)
├── /settings (SettingsPage - auth required)
├── /admin (AdminPage - admin role required)
├── /camps/:id (CampDetailPage)
├── /join/:inviteCode (JoinSquadPage - auth required)
└── /shared/:scheduleId (SharedSchedulePage)
```

### Query Parameters (Preserved across all routes)
- Filter state: `?q=surf&cat=Sports&age=8&weeks=1,2`
- Shared schedule: `?shared=base64data` (legacy support on `/`)
- Achievement sharing: `?progress=X&camps=Y&badges=Z` (OG preview)

### Navigation Patterns

**Mobile**: Bottom nav uses `<Link>` or `navigate()` instead of state
**Desktop**: Header buttons use `<Link>`
**Modals**: Hybrid approach (see Decision Matrix below)

---

## Implementation Strategy: Incremental Migration

### Phase 1: Setup & Foundation (Low Risk)
**Goal**: Add React Router without breaking existing modal navigation

1. **Install dependencies**
   ```bash
   npm install react-router-dom@6
   ```

2. **Create router configuration** (new file: `src/router.jsx`)
   - Define routes with lazy-loaded components
   - Setup protected route wrapper
   - Configure error boundaries per route

3. **Wrap app with BrowserRouter** (modify `src/main.jsx`)
   - Add `<BrowserRouter>` around `<App />`
   - Preserve all existing providers (Auth, Family, Achievements)

4. **Parallel navigation** (modify `src/App.jsx`)
   - Keep existing modal state (`showPlanner`, etc.)
   - Add `useLocation()` to sync route → state
   - Add `useNavigate()` to sync state → route
   - Both systems run simultaneously for testing

**Validation**: App works identically to before, but URLs now change with navigation

### Phase 2: Route-First Navigation (Medium Risk)
**Goal**: Make routes the source of truth, remove redundant state

5. **Update SimpleMobileNav** (modify `src/components/SimpleMobileNav.jsx`)
   - Replace `onTabChange` callback with `<NavLink>` components
   - Use `useLocation()` to detect active tab
   - Preserve haptic feedback on navigation

6. **Update Desktop Nav** (modify `src/App.jsx` header buttons)
   - Replace `onClick={() => setShowDashboard(true)}` with `<Link to="/dashboard">`
   - Add `useMatch()` for active states

7. **Create page components** (new files in `src/pages/`)
   - Extract modal content into page wrappers
   - Pages render the modal component OR inline view (mobile vs desktop)
   - Pass route params and search params as props

8. **Handle filter state sync**
   - Modify `useFilters` to use `useSearchParams()` hook
   - Remove manual `window.history.replaceState`
   - Use `setSearchParams()` for updates

**Validation**: Navigation works via routes, modals still open/close correctly

### Phase 3: Modal Handling & Polish (Higher Risk)
**Goal**: Decide modal vs. page rendering strategy

9. **Modal routing strategy** (choose one - see Decision Matrix)
   - **Option A**: Parallel routes (modals stay modals, background route persists)
   - **Option B**: Full page routes (modals become pages on mobile, cards on desktop)
   - **Option C**: Hybrid (some modals, some pages based on context)

10. **Update AuthContext OAuth handling**
    - Supabase callback redirects to current route (not just `/`)
    - Preserve `?error_description` hash params with router state

11. **Deep linking support**
    - `/camps/:id` - Direct camp detail links
    - `/shared/:scheduleId` - Migrate from `?shared=` query param
    - `/join/:code` - Already partially implemented, formalize it

12. **Error boundaries per route**
    - 404 page for invalid routes
    - Error fallback for failed lazy loads
    - Preserve main app on route-level errors

**Validation**: All user flows work, URLs are shareable, back/forward buttons work

### Phase 4: Cleanup & Optimization (Low Risk)
**Goal**: Remove old code, optimize bundle

13. **Remove modal state**
    - Delete `showPlanner`, `showWishlist`, etc. boolean flags
    - Delete `mobileTab` state
    - Clean up `handleMobileTabChange` logic

14. **Route-level code splitting**
    - Verify lazy loading works for all routes
    - Add loading fallbacks for each route
    - Monitor bundle sizes

15. **SEO & Meta tags**
    - Add `react-helmet-async` for per-route meta tags
    - Configure OG tags for `/camps/:id` routes
    - Update sitemap for new routes

16. **Testing & Validation**
    - Test all navigation paths (mobile + desktop)
    - Verify filter state persists across route changes
    - Test browser back/forward buttons
    - Validate OAuth flows still work
    - Check PWA install prompt behavior

**Validation**: Bundle size improved, no dead code, all features work

---

## Decision Matrix: Modal vs. Page Routing

### Option C: Hybrid Approach (RECOMMENDED)

**Strategy**: Main tabs = full routes, contextual modals = parallel routes

**Full page routes**:
- `/` - Browse
- `/wishlist` - Wishlist (full page on mobile, card on desktop)
- `/planner` - Planner (full screen)
- `/dashboard` - Dashboard (full screen)

**Parallel/modal routes**:
- `/camps/:id` - Camp detail (modal over browse)
- `/compare` - Comparison (modal over browse)
- `/settings` - Settings (modal)

**Rationale**:
- Main navigation should feel like page changes (matches bottom nav tabs)
- Contextual actions (view camp, compare) should feel like overlays
- Balances deep linking with UX expectations

---

## Protected Route Implementation

```jsx
// src/components/ProtectedRoute.jsx
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Store intended destination for post-login redirect
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireAdmin && !profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

---

## Filter State Integration

### Current: Manual window.history
```js
// useFilters.js (current)
useEffect(() => {
  const encoded = encodeFiltersToURL(filters);
  const newURL = `${window.location.pathname}?${encoded}`;
  window.history.replaceState({}, '', newURL);
}, [filters]);
```

### Target: React Router useSearchParams
```js
// useFilters.js (updated)
import { useSearchParams } from 'react-router-dom';

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() =>
    decodeFiltersFromURL(searchParams)
  );

  useEffect(() => {
    const params = new URLSearchParams();
    encodeFiltersToParams(filters, params);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  return { filters, updateFilters, ... };
}
```

**Key change**: `setSearchParams` handles URL updates automatically, preserves current route

---

## Mobile UX Considerations

### Browser Chrome Behavior
**Issue**: Route changes show/hide mobile browser chrome (URL bar)
**Mitigation**:
- Use CSS `position: fixed` with `env(safe-area-inset)` for nav
- Scroll position: React Router Scroll Restoration
- Prevent flash: Suspense loading states match modal loading

### Bottom Nav Active States
**Current**: `activeTab === 'browse'`
**Target**: `useMatch('/planner')` or `<NavLink className={({ isActive }) => ...}>`

```jsx
// SimpleMobileNav.jsx (updated)
import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'browse', label: 'Browse', path: '/', icon: SearchIcon },
  { id: 'wishlist', label: 'Saved', path: '/wishlist', icon: BookmarkIcon },
  { id: 'schedule', label: 'Plan', path: '/planner', icon: CalendarIcon },
  { id: 'dashboard', label: 'Home', path: '/dashboard', icon: HomeIcon },
];

{NAV_ITEMS.map(item => (
  <NavLink
    key={item.id}
    to={item.path}
    className={({ isActive }) =>
      `simple-mobile-nav-item ${isActive ? 'simple-mobile-nav-item--active' : ''}`
    }
  >
    {item.icon}
    <span>{item.label}</span>
  </NavLink>
))}
```

---

## Special Route Handling

### 1. Squad Join Flow (`/join/:code`)

**Current**: Manual path parsing in App.jsx useState initializer
```js
const [joinInviteCode, setJoinInviteCode] = useState(() => {
  const path = window.location.pathname;
  const match = path.match(/^\/join\/([a-f0-9]+)$/i);
  return match ? match[1] : null;
});
```

**Target**: Dedicated route with useParams
```jsx
// src/pages/JoinSquadPage.jsx
function JoinSquadPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();

  return (
    <JoinSquad
      inviteCode={inviteCode}
      onComplete={() => navigate('/planner')}
      onCancel={() => navigate('/')}
    />
  );
}
```

### 2. Shared Schedule Flow (`/shared/:scheduleId`)

**Current**: Base64 data in query param `?shared=abc123`
**Target**: Dedicated route with URL param

**Migration path**:
1. Keep `?shared=` support on `/` for backward compat
2. Add new `/shared/:id` route for future shares
3. SchedulePlanner generates new-style links: `/shared/abc123`
4. Both decode the same way (Base64 schedule data)

```jsx
// src/pages/SharedSchedulePage.jsx
function SharedSchedulePage() {
  const { scheduleId } = useParams();
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    try {
      const decoded = atob(scheduleId.replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(decoded);
      const validated = SharedScheduleSchema.parse(data);
      setSchedule(validated);
    } catch (err) {
      console.error('Invalid schedule:', err);
    }
  }, [scheduleId]);

  if (!schedule) return <LoadingSpinner />;

  return (
    <SchedulePlanner
      sharedSchedule={schedule}
      readOnly
      onClose={() => navigate('/')}
    />
  );
}
```

### 3. OAuth Callback Handling

**Current**: Supabase redirects to `/` with hash params
**Issue**: Need to preserve intended destination route

**Solution**: Use router state for post-login redirect
```jsx
// AuthContext.jsx (updated)
useEffect(() => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const error = hashParams.get('error_description');

  if (error) {
    setAuthError(error);
    navigate('/', { replace: true }); // Clear hash
  } else if (session?.user) {
    // Redirect to intended destination
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }
}, []);
```

---

## Camp Detail Route (`/camps/:id`)

**New route**: Enable direct linking to specific camps

**Implementation**:
```jsx
// src/pages/CampDetailPage.jsx
function CampDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const camp = useCampById(id); // Fetch from Supabase

  if (!camp) return <NotFound />;

  return (
    <CampDetailModal
      camp={camp}
      onClose={() => navigate(-1)} // Go back to previous route
    />
  );
}
```

**Route config**:
```jsx
<Route path="/camps/:id" element={<CampDetailPage />} />
```

**Benefits**:
- Share specific camp: `https://sb-summer-camps.vercel.app/camps/ucsb`
- SEO-friendly camp pages
- Deep linking from external sites
- Social media unfurling (with meta tags)

---

## Package Installation

```bash
npm install react-router-dom@6
npm install react-helmet-async # For per-route meta tags (optional)
```

**Version**: React Router v6.x (latest stable)
**Bundle size impact**: ~11kb gzipped (acceptable for features gained)

---

## File Structure Changes

### New Files
```
src/
├── router.jsx                    # Route configuration
├── pages/                        # New directory for page components
│   ├── BrowsePage.jsx           # Main browse view (refactored from App.jsx)
│   ├── WishlistPage.jsx         # Wishlist wrapper
│   ├── PlannerPage.jsx          # Planner wrapper
│   ├── DashboardPage.jsx        # Dashboard wrapper
│   ├── SettingsPage.jsx         # Settings wrapper
│   ├── AdminPage.jsx            # Admin wrapper
│   ├── CampDetailPage.jsx       # Camp detail route
│   ├── JoinSquadPage.jsx        # Squad invite flow
│   ├── SharedSchedulePage.jsx   # Shared schedule view
│   └── NotFoundPage.jsx         # 404 page
└── components/
    ├── ProtectedRoute.jsx       # Auth guard wrapper
    └── RouteErrorBoundary.jsx   # Per-route error handling
```

### Modified Files
```
src/
├── main.jsx                     # Add BrowserRouter
├── App.jsx                      # Refactor into BrowsePage, remove modal state
├── components/
│   └── SimpleMobileNav.jsx     # Replace buttons with NavLinks
└── hooks/
    └── useFilters.js            # Replace window.history with useSearchParams
```

---

## Migration Risks & Mitigation

### Risk 1: Breaking Existing User Bookmarks
**Issue**: Users may have bookmarked filter URLs like `/?q=surf&cat=Sports`
**Mitigation**: Browse page (`/`) preserves query params, no breaking change

### Risk 2: OAuth Flow Breaks
**Issue**: Supabase redirects to `/`, might conflict with routing
**Mitigation**:
- Keep `/` as browse route (no change to redirect URL)
- Test OAuth thoroughly in staging
- Add error boundary for auth failures

### Risk 3: Mobile Chrome Flashing
**Issue**: Route changes show/hide browser URL bar on mobile
**Mitigation**:
- Use `viewport-fit=cover` (already set in index.html)
- Fixed positioning with safe-area-insets (already implemented)
- Test on iOS Safari and Chrome mobile

### Risk 4: Filter State Lost on Navigation
**Issue**: Navigating between tabs might reset filters
**Mitigation**:
- Filters live in URL query params (persist across routes)
- Use `replace: true` for filter updates (don't add history entries)
- Test filter → navigate → back flows

### Risk 5: PWA Compatibility
**Issue**: Service worker might cache old routes
**Mitigation**:
- Update SW to handle new route patterns
- Clear cache on SW update
- Test PWA install after migration

### Risk 6: Bundle Size Increase
**Issue**: React Router adds ~11kb gzipped
**Mitigation**:
- Already using lazy loading for modals (keep this)
- Route-level code splitting reduces initial bundle
- Monitor Lighthouse scores before/after

---

## Testing Strategy

### E2E Tests (Playwright)
```js
test('bottom nav navigation', async ({ page }) => {
  await page.goto('/');
  await page.click('[aria-label="Saved"]');
  await expect(page).toHaveURL('/wishlist');

  await page.click('[aria-label="Plan"]');
  await expect(page).toHaveURL('/planner');

  await page.goBack();
  await expect(page).toHaveURL('/wishlist');
});

test('filter state persists across routes', async ({ page }) => {
  await page.goto('/?q=surf');
  await page.click('[aria-label="Saved"]');
  await expect(page).toHaveURL('/wishlist?q=surf');
});

test('deep linking to camp detail', async ({ page }) => {
  await page.goto('/camps/ucsb');
  await expect(page.locator('h1')).toContainText('UCSB');
});
```

### Manual Testing Checklist
- [ ] All nav buttons work (mobile + desktop)
- [ ] Browser back/forward buttons work correctly
- [ ] Filters persist across route changes
- [ ] OAuth login redirects to correct route
- [ ] Shared schedule links work (`/shared/:id`)
- [ ] Squad invite links work (`/join/:code`)
- [ ] Direct camp links work (`/camps/:id`)
- [ ] 404 page shows for invalid routes
- [ ] Mobile browser chrome behavior acceptable
- [ ] PWA install prompt still appears
- [ ] Service worker updates work

---

## Migration Timeline

### Week 1: Foundation
- Install dependencies
- Create router configuration
- Add BrowserRouter to main.jsx
- Test that app still works with routing added

### Week 2: Route Integration
- Update SimpleMobileNav to use NavLinks
- Create page components (extract modal content)
- Update useFilters to use useSearchParams
- Test navigation and filter state

### Week 3: Modal Strategy
- Implement hybrid approach (full routes for tabs, modals for overlays)
- Add camp detail route
- Migrate shared schedule and squad join flows
- Test all navigation paths

### Week 4: Polish & Testing
- Add protected routes
- Implement error boundaries
- Add per-route meta tags
- E2E testing
- Performance audit

### Week 5: Cleanup & Deploy
- Remove old modal state code
- Code review
- Staging deployment
- User acceptance testing
- Production deployment

---

## Success Criteria

Migration is successful when:

1. ✅ All routes are accessible via URL
2. ✅ Deep linking works for camps, schedules, invites
3. ✅ Filter state persists across navigation
4. ✅ Browser back/forward buttons work correctly
5. ✅ OAuth flows work without issues
6. ✅ Mobile UX remains excellent (no jarring chrome behavior)
7. ✅ PWA features still work
8. ✅ All tests pass
9. ✅ Bundle size acceptable (~11kb increase)
10. ✅ Production deployment successful

---

## Critical Files

1. `src/App.jsx` - Core navigation logic to refactor (3,325 lines to split)
2. `src/components/SimpleMobileNav.jsx` - Replace button callbacks with NavLinks
3. `src/hooks/useFilters.js` - Replace window.history with useSearchParams
4. `src/main.jsx` - Add BrowserRouter wrapper
5. `src/contexts/AuthContext.jsx` - Update OAuth callback handling for router state
