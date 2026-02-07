# AuthContext Splitting Implementation Plan

## Executive Summary

The current AuthContext is a 514-line god object managing 15+ state variables across multiple concerns: authentication, user profile, children management, favorites, scheduling, notifications, squads, and camp interests. This plan outlines a safe, incremental migration to 4 focused contexts with clear separation of concerns and minimal risk of breaking changes.

---

## Current State Analysis

### State Variables (15 total)
1. **Auth**: `user`, `loading`, `authError`
2. **Profile**: `profile`, `showOnboarding`
3. **Children**: `familyChildren`
4. **Favorites**: `favorites`, `campPopularity`
5. **Schedule**: `scheduledCamps`
6. **Notifications**: `notifications`, `unreadCount`
7. **Squads**: `squads`, `squadNotifications`, `squadUnreadCount`, `campInterests`, `friendInterestCounts`

### Functions Exported (43 total)
- Auth: `signIn`, `signOut`, `clearAuthError`, `completeOnboarding`
- Profile: `refreshProfile`
- Children: `refreshChildren`
- Favorites: `refreshFavorites`, `isFavorited`
- Schedule: `refreshSchedule`, `getScheduleForWeek`, `getTotalCost`, `getCoverageGaps`
- Notifications: `refreshNotifications`
- Squads: `refreshSquads`, `refreshSquadNotifications`, `refreshCampInterests`, `refreshFriendInterests`
- Recommendations: `getRecommendationScores`, `findSimilarCamps`, `getGapFillingSuggestions`, `getPopularInArea`, `getHomepageContent`, `getDashboardStats`, `buildRecommendationContext`

### Component Usage Patterns (34 components)

**Heavy users** (5+ dependencies):
- App.jsx: profile, favorites, user, friendInterestCounts, squads, authError, clearAuthError, showOnboarding, completeOnboarding, findSimilarCamps
- Dashboard.jsx: profile, children, favorites, scheduledCamps, getRecommendationScores, getDashboardStats, getCoverageGaps
- SchedulePlanner.jsx: user, profile, children, scheduledCamps, favorites, squads, campInterests, refreshSchedule, refreshChildren, refreshProfile, refreshCampInterests, getTotalCost, getCoverageGaps

**Light users** (1-3 dependencies):
- AuthButton.jsx: user, profile, loading, signIn, signOut
- FavoriteButton.jsx: user, isFavorited, refreshFavorites, signIn
- NotificationBell.jsx: notifications, unreadCount, refreshNotifications
- Settings.jsx: profile, children, refreshProfile, refreshChildren, refreshSchedule

---

## Target Architecture

### 1. AuthContext (Core Authentication Only)
**Purpose**: Manage Supabase auth session, sign in/out

**State**:
- `user` - Supabase user object
- `session` - Supabase session
- `loading` - Initial auth check
- `authError` - OAuth errors
- `isConfigured` - Whether Supabase is configured

**Functions**:
- `signIn()` - Google OAuth sign in
- `signOut()` - Sign out and clear all contexts
- `clearAuthError()` - Dismiss auth errors

**Responsibilities**:
- Listen to Supabase `onAuthStateChange`
- Manage session state
- Trigger "user changed" events for dependent contexts

---

### 2. ProfileContext (User Profile & Onboarding)
**Purpose**: Manage user profile data and onboarding state

**Dependencies**: Requires `user` from AuthContext

**State**:
- `profile` - User profile data (from profiles table)
- `showOnboarding` - Whether to show onboarding wizard
- `loading` - Profile loading state

**Functions**:
- `refreshProfile()` - Reload profile from DB
- `completeOnboarding()` - Mark onboarding complete and refresh

**Responsibilities**:
- Load profile when user signs in
- Update `last_active_at` timestamp
- Determine onboarding state (no profile or no children → show onboarding)

**Key Pattern**: Listens to AuthContext for user changes

---

### 3. ChildrenContext (Family Children Management)
**Purpose**: Manage user's children list

**Dependencies**: Requires `user` from AuthContext

**State**:
- `children` - Array of children (from children table)
- `loading` - Children loading state

**Functions**:
- `refreshChildren()` - Reload children from DB

**Responsibilities**:
- Load children when user signs in
- Provide children data for filtering, recommendations, scheduling

**Key Pattern**: Listens to AuthContext for user changes

---

### 4. FavoritesContext (Favorites, Schedule, Notifications, Squads)
**Purpose**: All user-specific camp data and social features

**Dependencies**: Requires `user` from AuthContext, `children` from ChildrenContext

**State**:
- `favorites` - Favorited camps
- `scheduledCamps` - Scheduled camps
- `notifications` - User notifications
- `unreadCount` - Unread notification count
- `squads` - User's squads
- `squadNotifications` - Squad notifications
- `squadUnreadCount` - Unread squad notifications
- `campInterests` - Camps user is interested in
- `friendInterestCounts` - Camp interest counts from friends
- `campPopularity` - Global camp popularity data
- `loading` - Data loading state

**Functions**:
- `refreshFavorites()` - Reload favorites
- `isFavorited(campId)` - Check if camp is favorited
- `refreshSchedule()` - Reload scheduled camps
- `getScheduleForWeek(startDate, endDate)` - Get camps for a week
- `getTotalCost()` - Calculate total scheduled cost
- `getCoverageGaps(childId, summerWeeks)` - Find schedule gaps
- `refreshNotifications()` - Reload notifications
- `refreshSquads()` - Reload squads
- `refreshSquadNotifications()` - Reload squad notifications
- `refreshCampInterests()` - Reload camp interests
- `refreshFriendInterests()` - Reload friend interest counts
- `getRecommendationScores(camps, limit)` - Get recommended camps
- `findSimilarCamps(camp, allCamps, limit)` - Find similar camps
- `getGapFillingSuggestions(camps)` - Get gap-filling suggestions
- `getPopularInArea(camps, limit)` - Get popular camps
- `getHomepageContent(camps)` - Get personalized homepage
- `getDashboardStats()` - Get dashboard stats
- `buildRecommendationContext(allCamps)` - Build recommendation context

**Responsibilities**:
- Load all user-specific data when user signs in
- Provide recommendation functions (using profile + children from other contexts)
- Clear all data on sign out

**Why this isn't split further**: Favorites, schedule, notifications, and squads are tightly coupled in the app's use cases. Most components that use one use several. Splitting them would create excessive provider nesting and prop drilling.

---

## Provider Nesting Strategy

```jsx
<AuthProvider>
  <ProfileProvider>
    <ChildrenProvider>
      <FavoritesProvider>
        <AchievementsProvider>
          <FamilyProvider>
            <App />
          </FamilyProvider>
        </AchievementsProvider>
      </FavoritesProvider>
    </ChildrenProvider>
  </ProfileProvider>
</AuthProvider>
```

**Rationale**:
1. AuthProvider at top - provides user to all
2. ProfileProvider - needs user
3. ChildrenProvider - needs user (parallel to Profile, but achievements/family need children)
4. FavoritesProvider - needs user and children for recommendations
5. Existing providers remain unchanged

---

## Dependency Map

### Cross-Context Dependencies

```
AuthContext (user)
    ↓
ProfileContext (profile, onboarding)
    ↓ (user)
ChildrenContext (children)
    ↓ (user)
    ↓ (children - optional for recommendations)
FavoritesContext (favorites, schedule, notifications, squads)
```

**Critical Dependencies**:
- ProfileContext listens to `user` changes from AuthContext
- ChildrenContext listens to `user` changes from AuthContext
- FavoritesContext listens to `user` changes from AuthContext
- FavoritesContext optionally uses `children` from ChildrenContext for recommendations

**Circular Dependency Risks**: None. All dependencies flow downward.

---

## Component Migration Matrix

| Component | Current Usage | New Context(s) | Migration Risk |
|-----------|---------------|----------------|----------------|
| App.jsx | profile, favorites, user, friendInterestCounts, squads, authError, clearAuthError, showOnboarding, completeOnboarding, findSimilarCamps | Auth, Profile, Favorites | Medium - heavy user, must import 3 contexts |
| AuthButton.jsx | user, profile, loading, signIn, signOut | Auth, Profile | Low - simple auth operations |
| Dashboard.jsx | profile, children, favorites, scheduledCamps, getRecommendationScores, getDashboardStats, getCoverageGaps | Profile, Children, Favorites | Medium - heavy user |
| SchedulePlanner.jsx | user, profile, children, scheduledCamps, favorites, squads, campInterests, refreshSchedule, refreshChildren, refreshProfile, refreshCampInterests, getTotalCost, getCoverageGaps | Auth, Profile, Children, Favorites | High - uses all 4 contexts |
| FavoriteButton.jsx | user, isFavorited, refreshFavorites, signIn | Auth, Favorites | Low - simple operations |
| NotificationBell.jsx | notifications, unreadCount, refreshNotifications | Favorites | Low - only notifications |
| Settings.jsx | profile, children, refreshProfile, refreshChildren, refreshSchedule | Profile, Children, Favorites | Medium - updates across contexts |
| Wishlist.jsx | favorites, refreshFavorites, children | Children, Favorites | Low - simple data display |
| ChildrenManager.jsx | user, children, refreshChildren, signIn | Auth, Children | Low - focused on children |
| OnboardingWizard.jsx | profile, refreshChildren | Profile, Children | Low - onboarding flow |
| Reviews.jsx | user | Auth | Low - only needs user |
| CampComparison.jsx | user, children | Auth, Children | Low - simple data access |
| SquadsPanel.jsx | squads, squadNotifications, squadUnreadCount | Favorites | Low - only squad data |
| RecommendationSection.jsx | getRecommendationScores, findSimilarCamps, getGapFillingSuggestions, getPopularInArea, profile, children | Profile, Children, Favorites | Medium - recommendation functions |
| FamilyContext.jsx | user, isConfigured | Auth | Low - only auth state |
| AchievementsContext.jsx | children, scheduledCamps, favorites | Children, Favorites | Medium - tracks achievements |

---

## Step-by-Step Migration Plan

### Phase 1: Create New Context Files (No Breaking Changes)

**Step 1.1**: Create `src/contexts/ProfileContext.jsx`
- Copy profile-related state and functions from AuthContext
- Add `useAuth()` hook to get `user`
- Listen to `user` changes with useEffect
- Load profile when user changes
- Export `ProfileProvider` and `useProfile` hook

**Step 1.2**: Create `src/contexts/ChildrenContext.jsx`
- Copy children-related state and functions from AuthContext
- Add `useAuth()` hook to get `user`
- Listen to `user` changes with useEffect
- Load children when user changes
- Export `ChildrenProvider` and `useChildren` hook

**Step 1.3**: Create `src/contexts/FavoritesContext.jsx`
- Copy favorites, schedule, notifications, squads state and functions from AuthContext
- Add `useAuth()` hook to get `user`
- Add `useChildren()` hook to get `children` (optional)
- Listen to `user` changes with useEffect
- Load all data when user changes
- Include all recommendation functions (they need profile + children + favorites/schedule)
- Export `FavoritesProvider` and `useFavorites` hook

**Step 1.4**: Update `src/contexts/AuthContext.jsx` to be minimal
- Keep only: user, session, loading, authError, isConfigured
- Keep only: signIn, signOut, clearAuthError
- Remove all other state and functions (moved to new contexts)
- Keep `loadUserData` but make it a no-op (or just update last_active_at)

**Verification**: Run tests. Existing components still import `useAuth()` and get everything from the old context. Nothing breaks.

---

### Phase 2: Update Provider Nesting in main.jsx

**Step 2.1**: Update `src/main.jsx`
```jsx
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { ChildrenProvider } from './contexts/ChildrenContext.jsx'
import { FavoritesProvider } from './contexts/FavoritesContext.jsx'
import { FamilyProvider } from './contexts/FamilyContext.jsx'
import { AchievementsProvider } from './contexts/AchievementsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary name="App">
      <AuthProvider>
        <ProfileProvider>
          <ChildrenProvider>
            <FavoritesProvider>
              <AchievementsProvider>
                <FamilyProvider>
                  <App />
                </FamilyProvider>
              </AchievementsProvider>
            </FavoritesProvider>
          </ChildrenProvider>
        </ProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
```

**Verification**: App still works. Old `useAuth()` hook still provides everything.

---

### Phase 3: Migrate Components (Incremental, Low Risk)

**Migration Pattern** for each component:
```jsx
// Before
import { useAuth } from '../contexts/AuthContext';
const { user, profile, children, favorites } = useAuth();

// After
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useChildren } from '../contexts/ChildrenContext';
import { useFavorites } from '../contexts/FavoritesContext';

const { user } = useAuth();
const { profile } = useProfile();
const { children } = useChildren();
const { favorites } = useFavorites();
```

**Step 3.1**: Migrate low-risk components first (1-2 dependencies)
- Reviews.jsx (user only → Auth)
- FavoriteButton.jsx (user, isFavorited, refreshFavorites → Auth, Favorites)
- NotificationBell.jsx (notifications → Favorites)
- SquadsPanel.jsx (squads → Favorites)

**Step 3.2**: Migrate medium-risk components (2-4 dependencies)
- AuthButton.jsx (user, profile, loading, signIn, signOut → Auth, Profile)
- Wishlist.jsx (favorites, children, refreshFavorites → Children, Favorites)
- ChildrenManager.jsx (user, children, refreshChildren, signIn → Auth, Children)
- OnboardingWizard.jsx (profile, refreshChildren → Profile, Children)
- CampComparison.jsx (user, children → Auth, Children)
- Settings.jsx (profile, children, refreshProfile, refreshChildren, refreshSchedule → Profile, Children, Favorites)

**Step 3.3**: Migrate high-risk components last (4+ dependencies)
- Dashboard.jsx (profile, children, favorites, scheduledCamps, recommendations → Profile, Children, Favorites)
- RecommendationSection.jsx (recommendations, profile, children → Profile, Children, Favorites)
- SchedulePlanner.jsx (all 4 contexts → Auth, Profile, Children, Favorites)
- App.jsx (all 4 contexts → Auth, Profile, Children, Favorites)

**Step 3.4**: Update test utilities
- `src/test/testUtils.jsx` - Add mock providers for all 4 contexts

**Step 3.5**: Update context-dependent contexts
- AchievementsContext.jsx (children, scheduledCamps, favorites → Children, Favorites)
- FamilyContext.jsx (user → Auth)

**Verification after each step**: Run tests, manually test the migrated components.

---

### Phase 4: Remove Old AuthContext Exports

**Step 4.1**: Once all components are migrated, remove deprecated exports from AuthContext
- Remove profile, children, favorites, scheduledCamps, etc. from context value
- Keep only auth-related exports

**Step 4.2**: Update AuthContext tests to focus only on auth functionality

**Verification**: Run full test suite. All tests pass.

---

### Phase 5: Cleanup and Documentation

**Step 5.1**: Update documentation
- Update `CLAUDE.md` with new context structure
- Add JSDoc comments to each context explaining its purpose

**Step 5.2**: Add migration guide for future developers
- Document the 4-context architecture
- Explain when to use each context

---

## Data Flow Architecture

### On User Sign In

```
1. AuthContext detects user sign in (onAuthStateChange)
   ↓
2. AuthContext sets user state
   ↓
3. ProfileContext detects user change → loads profile
   ↓
4. ChildrenContext detects user change → loads children
   ↓
5. FavoritesContext detects user change → loads favorites, schedule, notifications, squads
   ↓
6. ProfileContext checks if onboarding needed (no profile or no children)
   ↓
7. App renders with all data loaded
```

### On User Sign Out

```
1. User clicks sign out
   ↓
2. AuthContext.signOut() called
   ↓
3. Supabase auth.signOut() called
   ↓
4. AuthContext sets user = null
   ↓
5. ProfileContext detects user = null → clears profile, showOnboarding
   ↓
6. ChildrenContext detects user = null → clears children
   ↓
7. FavoritesContext detects user = null → clears all data
   ↓
8. App renders signed-out state
```

### Recommendation Functions

**Challenge**: Recommendations need data from multiple contexts (profile, children, favorites, scheduledCamps).

**Solution**: Keep recommendation functions in FavoritesContext, but let them accept data from other contexts:

```javascript
// In FavoritesContext
const { profile } = useProfile();
const { children } = useChildren();

const getRecommendationScores = useCallback((camps, limit = 10) => {
  const context = buildRecommendationContext(camps);
  return getRecommendations(camps, context, limit);
}, [profile, children, favorites, scheduledCamps]);

const buildRecommendationContext = useCallback((allCamps) => {
  return {
    profile,
    children,
    favorites,
    scheduledCamps,
    allCamps,
    summerWeeks: getSummerWeeks2026()
  };
}, [profile, children, favorites, scheduledCamps]);
```

**Why this works**: FavoritesContext imports `useProfile()` and `useChildren()` hooks, so it has access to all the data it needs. No prop drilling required.

---

## Testing Strategy

### Unit Tests

**Step 1**: Create tests for each new context
- `src/contexts/ProfileContext.test.jsx`
- `src/contexts/ChildrenContext.test.jsx`
- `src/contexts/FavoritesContext.test.jsx`

**Step 2**: Update existing AuthContext tests
- Remove tests for profile/children/favorites/schedule functionality
- Focus only on auth operations (signIn, signOut, session management)

**Step 3**: Update component tests
- Add new context providers to test wrappers
- Update `testUtils.jsx` to provide all 4 contexts

### Integration Tests

**Test Scenarios**:
1. Sign in → verify all 4 contexts load data
2. Sign out → verify all 4 contexts clear data
3. Recommendation functions work with data from multiple contexts
4. Onboarding flow works (ProfileContext + ChildrenContext interaction)
5. Schedule planner works (all 4 contexts used)

---

## Risks and Mitigation

### Risk 1: Breaking Changes During Migration

**Likelihood**: Medium
**Impact**: High (app stops working)

**Mitigation**:
- Keep old AuthContext exports until Phase 4
- Migrate components incrementally (Phase 3)
- Test after each component migration
- Use feature flags if deploying to production during migration

### Risk 2: Performance Regression from Multiple Providers

**Likelihood**: Low
**Impact**: Medium (slower renders)

**Mitigation**:
- Use React.memo, useMemo, useCallback religiously
- Profile before/after with React DevTools Profiler
- Monitor re-render counts in development

### Risk 3: Circular Dependencies Between New Contexts

**Likelihood**: Low
**Impact**: High (infinite loops, crashes)

**Mitigation**:
- Design data flow carefully (already done - see Dependency Map)
- Use madge or similar tool to detect circular imports
- Test provider nesting order in main.jsx

### Risk 4: Developer Confusion (Which Context Has What?)

**Likelihood**: Medium
**Impact**: Low (slower development)

**Mitigation**:
- Document clearly in CLAUDE.md
- Add JSDoc comments to each context
- Create a "Context Cheat Sheet" comment in each context file
- Use descriptive hook names (useProfile vs useAuth)

### Risk 5: Test Suite Breakage

**Likelihood**: High
**Impact**: Medium (CI fails)

**Mitigation**:
- Update testUtils.jsx first with all 4 mock providers
- Run tests after each phase
- Fix test failures before proceeding to next phase

---

## Timeline Estimate

| Phase | Estimated Time | Risk Level |
|-------|----------------|------------|
| Phase 1: Create new contexts | 4-6 hours | Low |
| Phase 2: Update main.jsx | 30 minutes | Low |
| Phase 3.1: Migrate low-risk components | 2-3 hours | Low |
| Phase 3.2: Migrate medium-risk components | 3-4 hours | Medium |
| Phase 3.3: Migrate high-risk components | 4-5 hours | High |
| Phase 3.4: Update test utilities | 1-2 hours | Medium |
| Phase 3.5: Update dependent contexts | 1-2 hours | Medium |
| Phase 4: Remove old exports | 1 hour | Low |
| Phase 5: Cleanup and documentation | 2 hours | Low |
| **Total** | **19-26 hours** | **Medium** |

**Recommendation**: Allocate 3-4 full work days for this migration to allow for testing, debugging, and unexpected issues.

---

## Success Criteria

Migration is successful when:

1. ✅ All 34 components using `useAuth()` are updated
2. ✅ All tests pass (unit + integration)
3. ✅ No circular dependencies detected
4. ✅ No performance regression (measured with React DevTools Profiler)
5. ✅ AuthContext is under 150 lines
6. ✅ Each new context is under 200 lines
7. ✅ Documentation is updated
8. ✅ Code review passes
9. ✅ Production deployment successful with no issues

---

## Critical Files

1. `src/contexts/AuthContext.jsx` - Current god object to refactor (514 lines → ~150 lines)
2. `src/main.jsx` - Provider nesting configuration
3. `src/App.jsx` - Heaviest consumer (uses 9+ properties)
4. `src/components/SchedulePlanner.jsx` - Second heaviest consumer (uses 10+ properties)
5. `src/test/testUtils.jsx` - Test utilities that provide mock contexts
