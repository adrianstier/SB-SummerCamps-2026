# App.jsx Decomposition Implementation Plan

## Executive Summary

This plan decomposes the 3,325-line App.jsx monolith into focused page components and shared contexts. The current architecture uses modal-based navigation with all page logic inline in one massive component. The target architecture extracts BrowsePage, WishlistPage, PlannerPage, and DashboardPage components, creates CampsContext and ComparisonContext for shared state, and simplifies App.jsx to ~500 lines of routing logic.

---

## Current Architecture Analysis

**App.jsx contains:**
- Global state management (camps, categories, stats, filters)
- Four distinct page views controlled by modal state (browse, wishlist, schedule, dashboard)
- Shared components (modals, comparison bar, mobile nav)
- Hero section, filter bar, and footer (browse page only)
- Camp listing with grid/table views
- Multiple modal states for various features

**State breakdown (40+ useState calls):**
- **Shared across pages:** camps, categories, stats, loading, error, compareList, modalCamp, isMobile, mobileTab
- **Filter-related:** All managed by useFilters hook (search, categories, price, features, etc.)
- **Browse-specific:** showFilters, showAdvancedFilters, expandedCamp, viewMode, showMoreFilters
- **Modal toggles:** showPlanner, showDashboard, showWishlist, showComparison, showInsights, showAdmin, showSettings, etc.
- **PWA state:** showInstallBanner, showSwipeHint, hiddenCamps

---

## Target Architecture

```
src/
├── App.jsx                    (Router, global state, layout shell)
├── pages/
│   ├── BrowsePage.jsx        (Camp listing, filters, search, comparison)
│   ├── WishlistPage.jsx      (Saved camps - already exists as component)
│   ├── PlannerPage.jsx       (Calendar planner - already exists as SchedulePlanner)
│   └── DashboardPage.jsx     (User dashboard - already exists as Dashboard)
├── contexts/
│   ├── AuthContext.jsx       (Already exists - user, profile, favorites, etc.)
│   ├── CampsContext.jsx      (NEW - camps data, categories, stats)
│   └── ComparisonContext.jsx (NEW - comparison list, modal state)
└── components/
    ├── layout/
    │   ├── AppHeader.jsx     (Hero section, top bar, search)
    │   ├── FilterBar.jsx     (Already exists)
    │   └── AppFooter.jsx     (Footer)
    └── shared/
        ├── CampCard.jsx      (Already inline in App.jsx)
        ├── CampTable.jsx     (Already inline in App.jsx)
        └── CampDetailModal.jsx (Already inline)
```

---

## Phase 1: Create Shared Contexts (Foundation)

### 1.1 Create CampsContext.jsx
```javascript
// Manages: camps, categories, stats, loading, error
// Provides: fetchCamps, fetchCategories, fetchStats, refreshCamps
// Dependencies: None (uses lib/supabase directly)
```

**State to move:**
- camps, setCamps
- categories, setCategories
- stats, setStats
- loading, setLoading
- error, setError
- initialLoadDone ref

**Functions to move:**
- fetchCamps()
- fetchCategories()
- fetchStats()
- Initial data loading useEffect

**Props interface:**
```javascript
const CampsContext = {
  camps: [],
  categories: [],
  stats: {},
  loading: boolean,
  error: string | null,
  refreshCamps: () => Promise<void>
}
```

### 1.2 Create ComparisonContext.jsx
```javascript
// Manages: compareList, comparison modal state
// Provides: toggleCompare, addToCompare, removeFromCompare, clearCompare
// Dependencies: None
```

**State to move:**
- compareList, setCompareList
- showComparison, setShowComparison

**Functions to move:**
- toggleCompare()
- addToCompare()
- removeFromCompare()
- Comparison modal rendering logic

**Props interface:**
```javascript
const ComparisonContext = {
  compareList: [],
  isInCompare: (campId) => boolean,
  toggleCompare: (campId) => void,
  addToCompare: (campId) => void,
  removeFromCompare: (campId) => void,
  clearCompare: () => void,
  showComparison: boolean,
  openComparison: () => void,
  closeComparison: () => void
}
```

---

## Phase 2: Extract Shared Layout Components

### 2.1 Create components/layout/AppHeader.jsx

**What to extract from App.jsx lines 946-1143:**
- Top bar with logo, auth button, navigation buttons
- Hero section with title and subtitle
- Search bar with debounced input
- Trust signals (stats display)
- Wave decoration SVG

**State to receive as props:**
- stats (from CampsContext)
- searchInput, setSearch (from parent/BrowsePage)
- compareList.length (from ComparisonContext)
- user, profile (from AuthContext)

**Callbacks to receive:**
- onOpenPlanner()
- onOpenDashboard()
- onOpenComparison()
- onOpenFamilyWorkspace()

### 2.2 Create components/layout/AppFooter.jsx

**What to extract from lines 1812-1832:**
- Footer with logo and trust disclaimers
- Static, no state needed

---

## Phase 3: Extract BrowsePage Component

### 3.1 Create pages/BrowsePage.jsx

**What to include:**
- Filter bar (already FilterBar component, lines 1145-1651)
- Category browse grid (lines 1653-1681)
- Testimonial banner (lines 1683-1691)
- Results count (lines 1695-1706)
- Camp listing (grid/table view, lines 1708-1809)
- Loading skeletons
- Empty state

**State needed (local to BrowsePage):**
- showFilters
- showAdvancedFilters
- showMoreFilters
- expandedCamp (for mobile inline expand)
- viewMode (grid/table)
- modalCamp (for desktop detail modal)
- searchInput (debounced local state)
- hiddenCamps (swipe-to-hide feature)

**State from contexts:**
- camps, categories, stats (CampsContext)
- filters, updateFilters, etc. (useFilters hook - already exists)
- compareList, toggleCompare (ComparisonContext)
- favorites, user (AuthContext)

**Functions to move:**
- Filter handlers (setSearch, setSelectedCategory, etc.) - already in useFilters
- Camp card handlers (onToggle, swipe actions)
- Modal management

**Props interface:**
```javascript
<BrowsePage
  onOpenPlanner={() => void}
  onOpenDashboard={() => void}
/>
```

### 3.2 Extract inline components from App.jsx:

**Create components/shared/CampCard.jsx** (lines 2336-2700+)
- Memoized CampCard component
- Receives: camp, expanded, onToggle, isComparing, onToggleCompare, etc.

**Create components/shared/CampTable.jsx** (find in App.jsx)
- Table view component
- Receives: camps, sortBy, sortDir, onSort, expandedCamp, onToggle

**Create components/shared/CampDetailModal.jsx** (find in App.jsx)
- Desktop modal for camp details
- Receives: camp, onClose, onAddToSchedule, onToggleFavorite, etc.

---

## Phase 4: Refactor App.jsx as Router

### 4.1 New App.jsx structure:

```javascript
export default function App() {
  // Global state
  const [mobileTab, setMobileTab] = useState('browse');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Modal toggles for full-screen views
  const [showPlanner, setShowPlanner] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Other global modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // PWA state
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Auth
  const { user, showOnboarding: authShowOnboarding } = useAuth();

  // Mobile tab change handler
  const handleMobileTabChange = (tab) => {
    setMobileTab(tab);
    // Close all views first, then open requested view
  };

  // Render current page based on state
  const renderCurrentPage = () => {
    if (showPlanner) return <SchedulePlanner ... />;
    if (showWishlist) return <Wishlist ... />;
    if (showDashboard) return <Dashboard ... />;
    return <BrowsePage ... />;
  };

  return (
    <CampsProvider>
      <ComparisonProvider>
        <div className="min-h-screen">
          {/* PWA banners, error banners */}

          {/* Route-specific content */}
          {renderCurrentPage()}

          {/* Global modals */}
          {showOnboarding && <OnboardingWizard ... />}
          {showSettings && <Settings ... />}
          {showAdmin && <AdminDashboard ... />}

          {/* Mobile nav */}
          <MobileNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />
        </div>
      </ComparisonProvider>
    </CampsProvider>
  );
}
```

**Key changes:**
- Wrap in CampsProvider and ComparisonProvider
- Remove inline camp data loading (now in context)
- Remove filter state (stays in BrowsePage via useFilters)
- Keep page-switching logic (modal-based routing)
- Keep global modals that appear across pages

---

## Phase 5: State Transition Handling

### 5.1 Cross-page actions:

**Adding to wishlist from browse:**
```javascript
// Already handled by FavoriteButton component
// Uses AuthContext.addFavorite() - no change needed
```

**Opening planner from wishlist:**
```javascript
// Wishlist receives onScheduleCamp prop
// Calls parent callback to switch pages
<Wishlist
  onScheduleCamp={() => {
    setShowWishlist(false);
    setShowPlanner(true);
  }}
/>
```

**Opening camp detail from dashboard:**
```javascript
// Dashboard receives onSelectCamp prop
// Can open modal OR expand inline (already implemented)
<Dashboard
  onSelectCamp={(camp) => {
    if (isMobile) {
      // Switch to browse page and expand
      setShowDashboard(false);
      setMobileTab('browse');
      // Pass camp ID via URL param or state
    } else {
      // Open modal (already exists)
    }
  }}
/>
```

### 5.2 Comparison flow:

The comparison modal is global and accessible from any page:
- BrowsePage: Toggle compare checkboxes
- Wishlist: Select camps to compare
- Dashboard: Compare scheduled camps
- ComparisonContext maintains state across page switches

### 5.3 URL parameter handling:

Move shared schedule/invite URL parsing to App.jsx:
- Check URL params before rendering page
- If shared schedule, render SharedScheduleView
- If invite code, render JoinSquad
- Otherwise render normal pages

---

## Phase 6: Migration Steps (Safe, Incremental)

**Step 1: Create contexts without removing from App**
- Create CampsContext.jsx with provider
- Create ComparisonContext.jsx with provider
- Wrap App in both providers
- Test that contexts work alongside existing state

**Step 2: Extract layout components**
- Create AppHeader.jsx, AppFooter.jsx
- Use them in App.jsx alongside old code
- Verify visual parity
- Remove old code

**Step 3: Extract inline components**
- Create CampCard.jsx, CampTable.jsx, CampDetailModal.jsx
- Import and use in App.jsx
- Verify functionality
- Remove inline definitions

**Step 4: Create BrowsePage.jsx**
- Copy browse section from App.jsx
- Connect to contexts and hooks
- Render in App.jsx based on state
- Test all browse features (filters, search, view modes, comparison)
- Remove old browse code from App.jsx

**Step 5: Update existing page components**
- Update Wishlist.jsx to use CampsContext instead of camps prop
- Update Dashboard.jsx to use CampsContext instead of camps prop
- Update SchedulePlanner.jsx to use CampsContext instead of camps prop
- Remove camps prop from all modal renders in App.jsx

**Step 6: Cleanup App.jsx**
- Remove unused state
- Remove unused functions
- Simplify to routing logic only
- Add comments documenting page structure

---

## Testing Checklist

After each phase, verify:
- [ ] Browse page displays camps correctly
- [ ] Filters work (category, age, price, features)
- [ ] Search works with debouncing
- [ ] Grid/table view toggle works
- [ ] Camp cards expand on mobile, open modal on desktop
- [ ] Add to favorites works
- [ ] Add to compare works
- [ ] Compare modal opens with selected camps
- [ ] Wishlist page shows favorites
- [ ] Planner page loads with camps
- [ ] Dashboard page shows stats and recommendations
- [ ] Mobile nav switches between pages
- [ ] URL parameters work (shared schedules, filters)
- [ ] PWA features work (install, offline, updates)
- [ ] All modals open/close correctly
- [ ] Focus management works (WCAG compliance)
- [ ] No console errors
- [ ] No visual regressions

---

## State Ownership Matrix

| State | Owner | Accessed By | How |
|-------|-------|-------------|-----|
| camps, categories, stats | CampsContext | All pages | Context |
| filters (search, category, etc.) | useFilters hook | BrowsePage | Hook |
| compareList | ComparisonContext | BrowsePage, Wishlist | Context |
| favorites | AuthContext | All pages | Context |
| user, profile | AuthContext | All pages | Context |
| expandedCamp | BrowsePage | BrowsePage only | Local state |
| viewMode (grid/table) | BrowsePage | BrowsePage only | Local state |
| modalCamp (detail) | App.jsx | All pages | Props/callbacks |
| mobileTab | App.jsx | MobileNav, App routing | Local state |
| showPlanner/Wishlist/Dashboard | App.jsx | MobileNav, callbacks | Local state |

---

## Props Flow After Decomposition

**App.jsx provides to pages:**
```javascript
<BrowsePage
  onOpenPlanner={() => setShowPlanner(true)}
  onOpenDashboard={() => setShowDashboard(true)}
  onOpenCampDetail={(camp) => setModalCamp(camp)}
/>

<Wishlist
  onClose={() => setShowWishlist(false)}
  onScheduleCamp={() => { setShowWishlist(false); setShowPlanner(true); }}
  onOpenCampDetail={(camp) => setModalCamp(camp)}
/>

<Dashboard
  onClose={() => setShowDashboard(false)}
  onOpenPlanner={() => { setShowDashboard(false); setShowPlanner(true); }}
  onSelectCamp={(camp) => setModalCamp(camp)}
/>

<SchedulePlanner
  onClose={() => setShowPlanner(false)}
/>
```

**Pages consume from contexts:**
- All pages: `const { camps } = useCamps();`
- All pages: `const { user, favorites } = useAuth();`
- Browse, Wishlist: `const { compareList, toggleCompare } = useComparison();`
- Browse: `const { filters, updateFilters } = useFilters();`

---

## Benefits of This Architecture

1. **Separation of concerns** - Each page manages its own UI state
2. **Reusability** - Contexts can be used by any component
3. **Performance** - Smaller components, easier to optimize
4. **Maintainability** - 3000-line file becomes ~500 lines + 4 pages
5. **Testing** - Can test pages in isolation
6. **Code ownership** - Clear boundaries for features
7. **No breaking changes** - Modal-based routing preserved

---

## Timeline Estimate

| Phase | Estimated Time | Risk Level |
|-------|----------------|------------|
| Phase 1: Create contexts | 3-4 hours | Low |
| Phase 2: Extract layout components | 2-3 hours | Low |
| Phase 3: Extract BrowsePage | 6-8 hours | Medium |
| Phase 4: Refactor App.jsx | 4-5 hours | Medium |
| Phase 5: State transitions | 2-3 hours | Low |
| Phase 6: Migration & testing | 3-4 hours | Medium |
| **Total** | **20-30 hours** | **Medium** |

**Recommendation**: Allocate 1 week for this migration with thorough testing at each phase.

---

## Critical Files

1. `src/App.jsx` - Main component to refactor (3,325 lines to decompose)
2. `src/hooks/useFilters.js` - Filter state management (already extracted, good pattern to follow)
3. `src/contexts/AuthContext.jsx` - User state (already exists, shows good context pattern)
4. `src/components/FilterBar.jsx` - Already separated, needs integration into BrowsePage
5. `src/components/MobileNav.jsx` - Orchestrates page switching via mobileTab state
