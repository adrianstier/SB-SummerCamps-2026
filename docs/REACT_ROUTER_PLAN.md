# React Router Migration Plan

## Executive Summary

This plan migrates the Santa Barbara Summer Camps app from boolean-state modal navigation to React Router v6 with URL-based routing. The current `src/App.jsx` (3,326 lines) manages 13 boolean `show*` states and a `mobileTab` string state to conditionally render full-screen views as modals. This architecture prevents deep linking, breaks the browser back button, and makes App.jsx the bottleneck for every navigation change.

The migration adds `react-router-dom` v6, maps each view to a URL route, converts `SimpleMobileNav` and `MobileNav` from callback-based buttons to `NavLink` components, and extracts page-level wrappers into a `src/pages/` directory. The existing lazy-loading strategy is preserved and extended with route-level code splitting.

---

## 1. Current Architecture Analysis

### 1.1 Modal State Inventory (App.jsx lines 452-465)

| State Variable | Type | Maps To | Props Passed |
|---|---|---|---|
| `showPlanner` | boolean | SchedulePlanner | `camps`, `onClose` |
| `showChildren` | boolean | ChildrenManager | `onClose` |
| `showFavorites` | boolean | FavoritesModal (inline) | `camps`, `onClose`, `onOpenPlanner` |
| `showDashboard` | boolean | Dashboard | `camps`, `onClose`, `onOpenPlanner`, `onSelectCamp` |
| `showComparison` | boolean | CampComparison | `camps`, `selectedCampIds`, `onClose`, `onRemoveCamp`, `onAddCamp` |
| `showInsights` | boolean | CampInsights | `camps`, `onClose`, `onSelectCamp`, `onCompare` |
| `showAdmin` | boolean | AdminDashboard | `camps`, `onClose` |
| `showSettings` | boolean | Settings | `onClose` |
| `showCostDashboard` | boolean | CostDashboard | `camps`, `onClose` |
| `showWishlist` | boolean | Wishlist | `camps`, `onClose`, `onScheduleCamp`, `onCompareCamps` |
| `showFamilyWorkspace` | boolean | FamilyWorkspace | `onClose` |
| `modalCamp` | object/null | CampDetailModal | `camp`, `allCamps`, `onClose`, `onAddToSchedule`, etc. |
| `mobileTab` | string | Controls which "page" mobile shows | Passed to `MobileNav` |

### 1.2 Navigation Trigger Points

**Desktop header buttons** (App.jsx lines 957-1047):
- "My Plan" button -> `setShowDashboard(true)`
- "Plan My Summer" button -> `setShowPlanner(true)`
- "Compare" button -> `setShowComparison(true)`
- "Family" button -> `setShowFamilyWorkspace(true)`
- Camp card clicks -> `setModalCamp(camp)` or `setExpandedCamp(camp.id)` (mobile inline)

**Mobile bottom nav** (`MobileNav.jsx` and `SimpleMobileNav.jsx`):
- Both fire `onTabChange(tabId)` callback with string IDs: `'browse'`, `'wishlist'`, `'schedule'`, `'dashboard'`, `'more'`
- `handleMobileTabChange` in App.jsx (lines 534-560) closes all views, then opens the requested one

**Custom event bus** (App.jsx lines 606-638):
- `window.addEventListener('navigate', handleNavigate)` listens for:
  - String targets: `'planner'`, `'children'`, `'favorites'`, `'dashboard'`, `'admin'`, `'settings'`, `'budget'`
  - Object targets: `{ view: 'planner', tab, squadId, campId }` and `{ view: 'camp', campId }`
- Dispatched from `AuthButton`, `SquadNotificationBell`, and other components

**Manual URL handling** (App.jsx lines 562-594):
- `/join/:code` parsed with regex in `useState` initializer
- `?shared=base64data` parsed in `useState` initializer with Zod validation
- `window.history.replaceState({}, '', '/')` used to clean up after handling

### 1.3 Existing Lazy Loading (Already in Place)

All heavy modal components are already lazy-loaded (App.jsx lines 19-30):
```
SchedulePlanner, ChildrenManager, OnboardingWizard, Dashboard,
CampComparison, AdminDashboard, JoinSquad, Settings, CostDashboard,
Wishlist, CampInsights, FamilyWorkspace
```
These are wrapped in a single `<Suspense fallback={<ModalLoadingFallback />}>` block.

### 1.4 Filter URL Sync (useFilters.js)

The `useFilters` hook already encodes/decodes filter state to URL query parameters:
- Encodes: `q`, `cat`, `age`, `pmin`, `pmax`, `weeks`, `ec`, `food`, `trans`, `sib`, `open`, `work`, `dist`, `sort`, `dir`
- Uses `window.history.replaceState` to update the URL without triggering navigation
- Reads initial state from `window.location.search` on mount
- Generates shareable URLs via `shareableURL` computed value

### 1.5 Infrastructure Already Supports Client-Side Routing

`vercel.json` already has a catch-all rewrite:
```json
{ "source": "/(.*)", "destination": "/index.html" }
```
This means any route will serve `index.html`, so React Router will work in production without additional server config.

### 1.6 Provider Tree (main.jsx)

```
<React.StrictMode>
  <ErrorBoundary>
    <AuthProvider>
      <AchievementsProvider>
        <FamilyProvider>
          <App />          <-- BrowserRouter wraps here or above App
        </FamilyProvider>
      </AchievementsProvider>
    </AuthProvider>
  </ErrorBoundary>
</React.StrictMode>
```

---

## 2. Route Structure

### 2.1 Route Map

| Route | Component | Auth Required | Admin Required | Current Trigger |
|---|---|---|---|---|
| `/` | BrowsePage (camp listing + hero + filters) | No | No | Default / `mobileTab === 'browse'` |
| `/schedule` | PlannerPage | No* | No | `showPlanner` |
| `/dashboard` | DashboardPage | Yes | No | `showDashboard` |
| `/compare` | ComparePage | No | No | `showComparison` |
| `/settings` | SettingsPage | Yes | No | `showSettings` |
| `/camp/:id` | CampDetailPage | No | No | `modalCamp` |
| `/wishlist` | WishlistPage | No* | No | `showWishlist` |
| `/admin` | AdminPage | Yes | Yes | `showAdmin` |
| `/insights` | InsightsPage | No | No | `showInsights` |
| `/budget` | BudgetPage | Yes | No | `showCostDashboard` |
| `/family` | FamilyPage | Yes | No | `showFamilyWorkspace` |
| `/children` | ChildrenPage | Yes | No | `showChildren` |
| `/join/:inviteCode` | JoinSquadPage | Yes | No | Manual URL parse |
| `/shared` | SharedSchedulePage | No | No | `?shared=` query param |
| `*` | NotFoundPage | No | No | N/A (new) |

*Schedule and Wishlist work without auth (local state), but gain features when signed in.

### 2.2 Query Parameters (Preserved on `/` route)

Filter parameters stay on the browse route only:
```
/?q=surf&cat=Sports,Beach/Surf&age=8&pmin=100&pmax=500&weeks=1,2,3&ec=1&sort=min_price&dir=asc
```

### 2.3 Nested/Modal Routes

Camp detail (`/camp/:id`) renders as an overlay on top of the browse page, using React Router's `<Outlet>` pattern:

```
/                    -> BrowsePage rendered
/camp/ucsb           -> BrowsePage rendered + CampDetailModal overlaid
```

This preserves the current UX where the camp grid remains visible behind the modal, and the user can close the modal to return to exactly where they were scrolled.

---

## 3. Migration Strategy

### Phase 1: Install and Wrap (No Behavior Changes)

**Goal**: Add React Router infrastructure without changing any visible behavior.

**Steps**:

1. Install `react-router-dom`:
   ```bash
   npm install react-router-dom@6
   ```

2. Create `src/router.jsx` with route configuration:
   ```jsx
   import { createBrowserRouter } from 'react-router-dom';
   import App from './App';

   export const router = createBrowserRouter([
     { path: '*', element: <App /> }
   ]);
   ```

3. Update `src/main.jsx` to use `RouterProvider`:
   ```jsx
   import { RouterProvider } from 'react-router-dom';
   import { router } from './router';

   // Replace <App /> with <RouterProvider router={router} />
   ```

4. Verify the entire app still works identically. No routes are active yet -- every URL still renders App.jsx as before.

**Validation**: Zero visual changes. All modals still work. `npm run build` succeeds.

### Phase 2: Sync Routes with Existing State (Bidirectional Bridge)

**Goal**: URLs change when modals open/close, and visiting a URL opens the correct modal. Both systems coexist.

**Steps**:

1. Add a `useRouteSync` hook in App.jsx that:
   - Calls `useNavigate()` and `useLocation()`
   - When a `show*` state becomes `true`, calls `navigate('/route')` to update the URL
   - When location changes (e.g., back button), reads the path and sets the corresponding `show*` state
   - Example: `showPlanner` -> `navigate('/schedule')`, and visiting `/schedule` -> `setShowPlanner(true)`

2. Handle the `mobileTab` state the same way:
   - `mobileTab === 'schedule'` -> URL is `/schedule`
   - `mobileTab === 'dashboard'` -> URL is `/dashboard`
   - `mobileTab === 'browse'` -> URL is `/`

3. Replace the manual `/join/:code` regex parsing with `useParams()` in a route match.

4. Replace the manual `?shared=` parsing with a dedicated `/shared` route.

**Validation**: URLs now change as users navigate. Browser back/forward buttons work for the first time. All modal open/close behavior unchanged.

### Phase 3: Convert SimpleMobileNav and MobileNav to Use Links

**Goal**: Navigation components use `<NavLink>` instead of callback functions.

**Steps**:

1. **SimpleMobileNav.jsx**: Replace `<button onClick={() => onTabChange(id)}>` with `<NavLink to={path}>`:

   ```jsx
   const NAV_ITEMS = [
     { id: 'browse',    label: 'Browse', path: '/',          icon: SearchIcon },
     { id: 'wishlist',  label: 'Saved',  path: '/wishlist',  icon: BookmarkIcon },
     { id: 'schedule',  label: 'Plan',   path: '/schedule',  icon: CalendarIcon },
     { id: 'dashboard', label: 'Home',   path: '/dashboard', icon: HomeIcon },
   ];
   ```

   - Use `NavLink`'s `className` callback for active state: `({ isActive }) => ...`
   - Preserve haptic feedback by adding an `onClick` handler alongside the `NavLink`
   - Remove the `onTabChange` prop entirely

2. **MobileNav.jsx**: Same conversion. The 5-tab layout (browse, schedule, dashboard, wishlist, more) maps to:
   - `browse` -> `/`
   - `schedule` -> `/schedule`
   - `dashboard` -> `/dashboard`
   - `wishlist` -> `/wishlist`
   - `more` -> `/settings`

3. **Desktop header buttons**: Replace `onClick={() => setShowDashboard(true)}` with `<Link to="/dashboard">` (preserving button styling via `className`).

4. Remove `handleMobileTabChange` from App.jsx (the router now handles this).

5. Remove `mobileTab` state entirely.

**Validation**: Mobile and desktop nav use real links. Active states derived from URL. Haptics still fire.

### Phase 4: Extract Page Components

**Goal**: Move the rendering logic for each view out of App.jsx into dedicated page components.

**Steps**:

1. Create `src/pages/` directory with thin wrapper components:

   | File | Wraps | Notes |
   |---|---|---|
   | `BrowsePage.jsx` | Camp listing, hero, filters (bulk of current App.jsx) | Largest extraction |
   | `PlannerPage.jsx` | `<SchedulePlanner>` | Receives `camps` from context or loader |
   | `DashboardPage.jsx` | `<Dashboard>` | Auth-protected |
   | `WishlistPage.jsx` | `<Wishlist>` | Works with or without auth |
   | `ComparePage.jsx` | `<CampComparison>` | Receives compareList from context/URL state |
   | `SettingsPage.jsx` | `<Settings>` | Auth-protected |
   | `AdminPage.jsx` | `<AdminDashboard>` | Admin-protected |
   | `InsightsPage.jsx` | `<CampInsights>` | No auth required |
   | `BudgetPage.jsx` | `<CostDashboard>` | Auth-protected |
   | `FamilyPage.jsx` | `<FamilyWorkspace>` | Auth-protected |
   | `ChildrenPage.jsx` | `<ChildrenManager>` | Auth-protected |
   | `CampDetailPage.jsx` | `<CampDetailModal>` | Nested route under `/` |
   | `JoinSquadPage.jsx` | `<JoinSquad>` | Auth-protected |
   | `SharedSchedulePage.jsx` | `<SharedScheduleView>` | Read-only view |
   | `NotFoundPage.jsx` | 404 message | New |

2. Update `src/router.jsx` to use these page components with lazy loading:
   ```jsx
   const PlannerPage = lazy(() => import('./pages/PlannerPage'));
   const DashboardPage = lazy(() => import('./pages/DashboardPage'));
   // ...

   export const router = createBrowserRouter([
     {
       path: '/',
       element: <AppLayout />,  // shared chrome: header, footer, mobile nav
       children: [
         { index: true, element: <BrowsePage /> },
         { path: 'camp/:id', element: <CampDetailPage /> },  // overlay route
         { path: 'schedule', element: <PlannerPage /> },
         { path: 'dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
         { path: 'wishlist', element: <WishlistPage /> },
         { path: 'compare', element: <ComparePage /> },
         { path: 'settings', element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },
         { path: 'admin', element: <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute> },
         { path: 'insights', element: <InsightsPage /> },
         { path: 'budget', element: <ProtectedRoute><BudgetPage /></ProtectedRoute> },
         { path: 'family', element: <ProtectedRoute><FamilyPage /></ProtectedRoute> },
         { path: 'children', element: <ProtectedRoute><ChildrenPage /></ProtectedRoute> },
         { path: 'join/:inviteCode', element: <ProtectedRoute><JoinSquadPage /></ProtectedRoute> },
         { path: 'shared', element: <SharedSchedulePage /> },
         { path: '*', element: <NotFoundPage /> },
       ]
     }
   ]);
   ```

3. Create `src/layouts/AppLayout.jsx` containing the shared UI shell:
   - Header bar with logo, auth button, notification bell
   - `<Outlet />` for route content
   - Footer
   - MobileNav (bottom bar)
   - PWA components (InstallBanner, OfflineIndicator, UpdateToast)

4. The `camps` data fetching currently lives in App.jsx. Move it to either:
   - A `CampsContext` provider (wraps the router), or
   - A React Router `loader` function on the root route

**Validation**: Each page renders at its URL. App.jsx is dramatically smaller. Lazy loading still works.

### Phase 5: Migrate useFilters to useSearchParams

**Goal**: Replace manual `window.history.replaceState` with React Router's `useSearchParams`.

**Steps**:

1. Update `src/hooks/useFilters.js`:
   - Import `useSearchParams` from `react-router-dom`
   - Replace `new URLSearchParams(window.location.search)` with `searchParams` from the hook
   - Replace `window.history.replaceState({}, '', newURL)` with `setSearchParams(params, { replace: true })`
   - The `encodeFiltersToURL` and `decodeFiltersFromURL` functions stay unchanged

2. Ensure filter params only appear on the browse route (`/`). When navigating to `/schedule`, filter params should not carry over (they are browse-specific).

3. The `shareableURL` computed value updates to use the router's base URL awareness.

**Validation**: Filters still sync to/from URL. Filter changes do not create new history entries. Filter state resets when leaving browse page and restores when returning.

### Phase 6: Handle Camp Detail as Overlay Route

**Goal**: `/camp/:id` renders as a modal overlay on top of the browse page.

**Steps**:

1. Use React Router's location state pattern for overlay modals:
   ```jsx
   // In BrowsePage, when clicking a camp card:
   navigate(`/camp/${camp.id}`, { state: { backgroundLocation: location } });

   // In AppLayout:
   const location = useLocation();
   const backgroundLocation = location.state?.backgroundLocation;

   <Routes location={backgroundLocation || location}>
     {/* Normal routes */}
   </Routes>
   {backgroundLocation && (
     <Routes>
       <Route path="/camp/:id" element={<CampDetailModal />} />
     </Routes>
   )}
   ```

2. When `/camp/:id` is visited directly (no background location), render CampDetailPage as a full page instead of a modal overlay.

3. Close modal by navigating back: `navigate(-1)` or `navigate('/')`.

4. Preserve focus management (WCAG 2.1 AA):
   - Store trigger element ref before navigation
   - Restore focus on close/back

**Validation**: Clicking a camp card shows modal overlay with URL `/camp/ucsb`. Back button closes it. Direct URL visit shows full page view. Focus management works.

### Phase 7: Remove Legacy State and Clean Up

**Goal**: Delete all `show*` boolean states, the custom event bus, and manual URL parsing.

**Steps**:

1. Remove from App.jsx (now AppLayout or deleted):
   - `showPlanner`, `showChildren`, `showFavorites`, `showDashboard`, `showComparison`, `showInsights`, `showAdmin`, `showSettings`, `showCostDashboard`, `showWishlist`, `showFamilyWorkspace`
   - `mobileTab` state and `handleMobileTabChange`
   - `joinInviteCode` state and regex parsing
   - `sharedSchedule` state and base64 parsing
   - `modalCamp` state
   - The `navigate` custom event listener

2. Replace `window.dispatchEvent(new CustomEvent('navigate', ...))` calls throughout the codebase with `useNavigate()`:
   - `AuthButton.jsx` (triggers `'planner'`, `'dashboard'`, `'admin'`, `'settings'`, etc.)
   - `SquadNotificationBell.jsx` (triggers `{ view: 'planner', squadId }`)
   - `FavoriteButton.jsx` (triggers toggle-favorite custom event -- this one stays as-is since it is not navigation)

3. Remove `isPlannerLoading` artificial delay (the router's Suspense handles loading states).

4. The `compareList` state needs to move somewhere accessible across routes:
   - Option A: URL state (`/compare?ids=camp1,camp2,camp3`)
   - Option B: A small `CompareContext` or localStorage
   - Recommended: URL state for shareability

**Validation**: App.jsx is reduced from 3,326 lines to under 500 (the AppLayout). No `show*` states remain. No custom event navigation.

---

## 4. State Management Impact

### 4.1 State That Stays in App/Layout

| State | Reason |
|---|---|
| `camps` (fetched data) | Needed by many routes; lives in context or loader |
| `categories` | Derived from camps |
| `stats` | Derived from camps |
| `loading`, `error` | Data fetch status |
| `viewMode` ('grid'/'table') | Browse page local state, or URL param |
| `isMobile` | Layout detection, stays in layout |
| `compareList` | Cross-route state; move to URL or context |

### 4.2 State That Becomes Route-Driven

| Current State | Replaced By |
|---|---|
| `showPlanner` | Route `/schedule` |
| `showDashboard` | Route `/dashboard` |
| `showComparison` | Route `/compare` |
| `showSettings` | Route `/settings` |
| `showWishlist` | Route `/wishlist` |
| `showAdmin` | Route `/admin` |
| `showInsights` | Route `/insights` |
| `showCostDashboard` | Route `/budget` |
| `showFamilyWorkspace` | Route `/family` |
| `showChildren` | Route `/children` |
| `modalCamp` | Route `/camp/:id` |
| `mobileTab` | Derived from `useLocation()` |
| `joinInviteCode` | Route `/join/:code` with `useParams()` |
| `sharedSchedule` | Route `/shared` with query param |

### 4.3 State That Moves to Context

| State | New Home | Reason |
|---|---|---|
| `camps`, `categories`, `stats` | `CampsContext` or route loader | Needed by PlannerPage, DashboardPage, ComparePage, etc. |
| `compareList` | URL params on `/compare` route, or `CompareContext` | Cross-route; needs to persist during browse |
| `expandedCamp` | BrowsePage local state | Only relevant on browse |
| `hiddenCamps` | BrowsePage local state (localStorage-backed) | Only relevant on browse |

### 4.4 Cross-Route Navigation Callbacks

Several modal components currently receive callbacks to navigate between views:

| Component | Callback | Router Replacement |
|---|---|---|
| Dashboard | `onOpenPlanner` | `navigate('/schedule')` |
| Dashboard | `onSelectCamp(camp)` | `navigate(`/camp/${camp.id}`)` |
| Wishlist | `onScheduleCamp(camp)` | `navigate('/schedule')` |
| Wishlist | `onCompareCamps(campIds)` | `navigate('/compare?ids=' + campIds.join(','))` |
| CampInsights | `onSelectCamp(camp)` | `navigate(`/camp/${camp.id}`)` |
| CampInsights | `onCompare(campIds)` | `navigate('/compare?ids=' + campIds.join(','))` |
| CampDetailModal | `onAddToSchedule` | `navigate('/schedule')` |
| FavoritesModal | `onOpenPlanner` | `navigate('/schedule')` |

These callbacks are replaced by `useNavigate()` calls inside the child components, decoupling them from their parent's state.

---

## 5. Deep Linking Benefits

### 5.1 New Shareable URLs

| URL | Use Case |
|---|---|
| `sb-summer-camps.vercel.app/camp/ucsb` | Share a specific camp with a friend |
| `sb-summer-camps.vercel.app/compare?ids=ucsb,ymca,zoo` | Share a comparison of 3 camps |
| `sb-summer-camps.vercel.app/?cat=Sports&age=8` | Share a filtered view ("sports camps for 8-year-olds") |
| `sb-summer-camps.vercel.app/schedule` | Bookmark the planner |
| `sb-summer-camps.vercel.app/shared?data=base64...` | Share a summer schedule |
| `sb-summer-camps.vercel.app/join/abc123` | Squad invite link (already works) |

### 5.2 Browser History

- Back button closes camp detail modal and returns to browse
- Back button from `/schedule` returns to `/` (or wherever user came from)
- Forward button re-opens the view
- Filter changes use `replace: true` so they do not pollute history

### 5.3 SEO Potential (Future)

With per-route meta tags (via `react-helmet-async` or a `<head>` manager):
- `/camp/ucsb` -> `<title>UCSB Summer Camp 2026 | SB Summer Camps</title>`
- `/` -> `<title>90+ Santa Barbara Summer Camps 2026</title>`
- Social sharing cards with camp images and descriptions

---

## 6. Code Splitting Opportunities

### 6.1 Current Lazy Loading (Preserved)

All existing `lazy()` imports continue to work. React Router's `lazy` route property can replace the manual Suspense wrapping.

### 6.2 Route-Level Splitting

Each page becomes its own chunk:

| Route | Chunk | Estimated Size | Load Trigger |
|---|---|---|---|
| `/` | `BrowsePage` + camp listing | ~80kb | Initial load (not lazy) |
| `/schedule` | `SchedulePlanner` | ~45kb | First visit to Plan tab |
| `/dashboard` | `Dashboard` | ~30kb | First visit to My Plan |
| `/compare` | `CampComparison` | ~25kb | First compare action |
| `/camp/:id` | `CampDetailModal` | ~15kb | First camp click |
| `/admin` | `AdminDashboard` | ~20kb | Admin only |
| `/settings` | `Settings` | ~10kb | First settings visit |
| `/insights` | `CampInsights` | ~20kb | First insights click |
| `/budget` | `CostDashboard` | ~15kb | First budget visit |
| `/family` | `FamilyWorkspace` | ~20kb | First family visit |
| `/wishlist` | `Wishlist` | ~15kb | First wishlist visit |

### 6.3 Prefetching Strategy

Prefetch likely next routes based on context:
- On browse page: prefetch CampDetailModal (users will click a camp)
- On mobile nav render: prefetch the adjacent tabs
- On auth: prefetch Dashboard

---

## 7. Risks and Gotchas

### 7.1 Back Button Behavior

**Risk**: Full-page route transitions on mobile may cause jarring scroll jumps.

**Mitigation**:
- Use React Router's `<ScrollRestoration />` component to restore scroll position on back navigation
- For camp detail overlay: the browse page stays mounted behind the modal, so scroll position is naturally preserved
- For tab navigation (browse -> schedule -> back): scroll position is restored per-route

### 7.2 Scroll Position Restoration

**Risk**: React Router v6's `<ScrollRestoration>` only works with `createBrowserRouter` (data router API).

**Mitigation**:
- Use `createBrowserRouter` from the start (not `<BrowserRouter>` component)
- Add `<ScrollRestoration />` in AppLayout
- For the camp detail overlay route, prevent scroll reset using the `preventScrollReset` prop on the Link

### 7.3 Shared State Between Routes

**Risk**: `camps` data is currently fetched in App.jsx and passed as props to every modal. After splitting into routes, each page needs access to camps.

**Mitigation**:
- Create a `CampsContext` provider that wraps the router
- Fetch camps once at the top level; pages consume via `useCamps()` hook
- Alternative: Use React Router's `loader` function on the root layout route to fetch camps, accessible via `useRouteLoaderData('root')`

### 7.4 Compare List Persistence

**Risk**: The `compareList` state lives in App.jsx. When the user navigates between routes, this state must persist.

**Mitigation**:
- Encode in URL: `/compare?ids=camp1,camp2,camp3`
- The "compare bar" (floating at bottom of browse page) reads from URL or a small context
- When adding/removing camps from compare, update the stored list
- Recommended: Use a small `CompareContext` backed by `sessionStorage` for cross-route persistence, and encode into URL only on the `/compare` route

### 7.5 OAuth Callback Flow

**Risk**: Supabase OAuth redirects to the site root (`/`) with hash parameters. If the user was on `/dashboard` and clicked sign in, they land on `/` after auth.

**Mitigation**:
- Before triggering OAuth, store the current pathname in `sessionStorage` (e.g., `sb-camps-auth-redirect`)
- After successful auth in `AuthContext`, read the stored path and `navigate()` to it
- Clear the stored path after redirect
- The Supabase redirect URL stays as `/` (simplest config)

### 7.6 PWA / Service Worker Compatibility

**Risk**: The service worker may cache old routes or interfere with client-side routing.

**Mitigation**:
- The service worker should use a network-first strategy for HTML (navigation requests)
- `vercel.json` already rewrites all routes to `/index.html`
- The PWA manifest `start_url` should stay as `/`
- Test: install PWA, navigate to `/schedule`, close and reopen -- should load correctly

### 7.7 Mobile Browser Chrome Flashing

**Risk**: On iOS Safari and Android Chrome, route changes can cause the URL bar to appear/disappear, creating visual jank.

**Mitigation**:
- The app already uses `viewport-fit=cover` and `env(safe-area-inset-*)`
- Fixed-position mobile nav with safe area padding (already implemented)
- In standalone PWA mode (installed to home screen), there is no browser chrome -- this is a non-issue
- In browser mode: accept minor chrome behavior as standard browser UX; users expect this

### 7.8 Filter State Lost on Route Change

**Risk**: Filters are encoded in URL query params. Navigating from `/?cat=Sports` to `/schedule` and back might lose filters.

**Mitigation**:
- Option A: Persist filter state in `sessionStorage` and restore when returning to browse
- Option B: Keep filter params in the URL across routes (`/schedule?cat=Sports`)
- Recommended: Option A. Filters are browse-specific; other routes should have clean URLs. Store filter state in `sessionStorage` on leave, restore on return.

### 7.9 The Custom Event Bus (`navigate` events)

**Risk**: Components dispatch `window.dispatchEvent(new CustomEvent('navigate', ...))` which App.jsx listens for. After routing, this pattern conflicts.

**Mitigation**:
- Phase 7 replaces all `CustomEvent` dispatches with `useNavigate()` calls
- Components that need to navigate import `useNavigate` directly from `react-router-dom`
- The `toggle-favorite` custom event is NOT navigation and stays as-is
- During the bridge period (Phases 2-6), both systems coexist: the event listener calls `navigate()` internally

### 7.10 Testing Considerations

**Risk**: Existing unit/integration tests may not expect routing.

**Mitigation**:
- Wrap test renders in `<MemoryRouter>` for unit tests
- Update E2E tests (Playwright) to assert URLs as well as UI state
- Add new E2E tests for deep linking and back button behavior

---

## 8. File Structure After Migration

### New Files
```
src/
  router.jsx                        # createBrowserRouter configuration
  layouts/
    AppLayout.jsx                   # Shared shell: header, footer, nav, providers
  pages/
    BrowsePage.jsx                  # Extracted from App.jsx (camp listing, hero, filters)
    PlannerPage.jsx                 # Wraps SchedulePlanner
    DashboardPage.jsx               # Wraps Dashboard
    WishlistPage.jsx                # Wraps Wishlist
    ComparePage.jsx                 # Wraps CampComparison
    SettingsPage.jsx                # Wraps Settings
    AdminPage.jsx                   # Wraps AdminDashboard
    InsightsPage.jsx                # Wraps CampInsights
    BudgetPage.jsx                  # Wraps CostDashboard
    FamilyPage.jsx                  # Wraps FamilyWorkspace
    ChildrenPage.jsx                # Wraps ChildrenManager
    CampDetailPage.jsx              # Wraps CampDetailModal (overlay + standalone)
    JoinSquadPage.jsx               # Wraps JoinSquad
    SharedSchedulePage.jsx          # Wraps SharedScheduleView
    NotFoundPage.jsx                # 404 page
  components/
    ProtectedRoute.jsx              # Auth guard wrapper
  contexts/
    CampsContext.jsx                 # Camp data provider (extracted from App.jsx)
    CompareContext.jsx               # Compare list state (optional)
```

### Modified Files
```
src/
  main.jsx                          # RouterProvider replaces raw <App />
  App.jsx                           # Gutted; becomes AppLayout or deleted
  components/
    SimpleMobileNav.jsx             # NavLink replaces button+callback
    MobileNav.jsx                   # NavLink replaces button+callback
    AuthButton.jsx                  # useNavigate replaces CustomEvent dispatch
    SquadNotificationBell.jsx       # useNavigate replaces CustomEvent dispatch
  hooks/
    useFilters.js                   # useSearchParams replaces window.history
```

### Deleted Code (Net Reduction)
```
App.jsx: ~2,800 lines removed (modal state, conditional rendering, event handling)
         Remaining ~500 lines become AppLayout.jsx + BrowsePage.jsx
```

---

## 9. Package Changes

### Install
```bash
npm install react-router-dom@6
```

### Optional (Phase 7+)
```bash
npm install react-helmet-async    # Per-route <title> and meta tags
```

### Bundle Impact
- `react-router-dom` v6: ~12kb gzipped
- `react-helmet-async`: ~3kb gzipped
- Net impact offset by better code splitting (pages only load when visited)

---

## 10. Migration Timeline

| Phase | Duration | Risk Level | Deliverable |
|---|---|---|---|
| Phase 1: Install and Wrap | 1 day | Minimal | Router added, zero behavior change |
| Phase 2: Route-State Bridge | 2-3 days | Low | URLs change with navigation, back button works |
| Phase 3: Nav Components | 1-2 days | Low | MobileNav/SimpleMobileNav use NavLink |
| Phase 4: Extract Pages | 3-4 days | Medium | Page components created, App.jsx shrinks |
| Phase 5: useFilters Migration | 1 day | Low | Filter URL sync uses React Router |
| Phase 6: Camp Detail Overlay | 2 days | Medium | `/camp/:id` works as overlay and standalone |
| Phase 7: Legacy Cleanup | 2-3 days | Medium | All `show*` states removed, events removed |
| **Total** | **12-16 days** | | |

Each phase results in a deployable, working application. Phases can be merged into PRs or shipped individually.

---

## 11. Success Criteria

The migration is complete when:

1. Every view is accessible via a unique URL
2. Browser back/forward buttons navigate correctly between views
3. `/camp/:id` deep links load the correct camp (shareable)
4. `/compare?ids=a,b,c` deep links open comparison (shareable)
5. Filter URLs (`/?cat=Sports&age=8`) still work
6. OAuth sign-in flow redirects to the intended route after auth
7. Squad invite links (`/join/:code`) still work
8. Shared schedule links still work
9. Mobile bottom nav shows correct active state derived from URL
10. No `show*` boolean states remain in the codebase
11. No `window.dispatchEvent(new CustomEvent('navigate', ...))` calls remain
12. `App.jsx` is under 500 lines (or eliminated in favor of `AppLayout.jsx` + `BrowsePage.jsx`)
13. All existing Playwright E2E tests pass
14. New E2E tests cover deep linking and back button behavior
15. Lighthouse performance score does not regress
16. PWA install and offline mode still work

---

## 12. Critical Files Reference

| File | Lines | Role in Migration |
|---|---|---|
| `src/App.jsx` | 3,326 | Primary target; 13 modal states to remove, bulk content to extract |
| `src/components/SimpleMobileNav.jsx` | 271 | Convert buttons to NavLinks |
| `src/components/MobileNav.jsx` | 297 | Convert buttons to NavLinks |
| `src/hooks/useFilters.js` | ~300 | Replace `window.history` with `useSearchParams` |
| `src/main.jsx` | 27 | Add RouterProvider |
| `src/contexts/AuthContext.jsx` | ~510 | Update OAuth redirect handling |
| `vercel.json` | 28 | Already configured for SPA routing (no change needed) |
| `vite.config.js` | 12 | No change needed |
| `package.json` | 68 | Add `react-router-dom` dependency |
