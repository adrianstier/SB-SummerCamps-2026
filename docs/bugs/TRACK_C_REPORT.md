# Bug Bash Track C Report: Favorites & Children Management

**Tested by:** Claude Code (bug-bash-track-c)
**Date:** 2026-02-04
**Features Tested:** 17-24
**Test URL:** http://localhost:5173
**Status:** Completed

---

## Executive Summary

| Category | Count |
|----------|-------|
| **Features Tested** | 8 |
| **Features Passing** | 5 |
| **Bugs Found** | 5 |
| **Critical Bugs** | 0 |
| **High Severity** | 1 |
| **Medium Severity** | 3 |
| **Low Severity** | 1 |

---

## Feature Test Results

### Feature 17: Favorites (Heart Toggle) - PASS with notes
- [x] Heart icon displays on camp cards
- [x] Click toggles favorite state
- [x] Heart fills when favorited
- [x] Favorite persists after refresh
- [x] Can unfavorite
- **Notes:** Core functionality works. Unit tests have minor mismatch with WCAG-updated sizes (see BUG-C001).

### Feature 18: Wishlist View - PASS
- [x] Navigate to Wishlist tab/view
- [x] All favorited camps display
- [x] Can sort by name
- [x] Can sort by price
- [x] Can sort by registration status
- [x] Empty state shows when no favorites
- **Notes:** All functionality working correctly.

### Feature 19: Per-Child Favorites - PARTIAL FAIL
- [ ] Can assign favorite to specific child - **MISSING**
- [x] Filter wishlist by child - Works for existing assignments
- [x] "All children" view shows all
- **Notes:** See BUG-C002. No UI to assign a favorite to a specific child. The backend supports `child_id` on favorites, and the Wishlist can filter by child, but there's no way to set this value through the UI.

### Feature 20: Wishlist Notes - PASS
- [x] Can add note to favorited camp
- [x] Note persists after refresh
- [x] Can edit note
- [ ] Can delete note - **PARTIAL** (can clear text but no dedicated delete)
- **Notes:** Delete is done by saving empty note. See BUG-C003.

### Feature 21: Children Manager - PASS
- [x] Navigate to children management
- [x] Can add new child
- [x] Name field required
- [x] Age field validates (reasonable range 3-18)
- [x] Can edit existing child
- [x] Can delete child (with confirmation)
- [x] Changes persist after refresh
- **Notes:** All core functionality working.

### Feature 22: Color Coding - PASS
- [x] Color picker displays 6 options
- [x] Selected color applies to child
- [x] Color shows in schedule planner
- [x] Color shows in wishlist
- **Notes:** Colors properly cascade through the UI.

### Feature 23: Age-as-of-Summer - PASS with notes
- [x] Age set during child creation
- [x] Displayed correctly in ChildrenManager
- [x] Used correctly in age filtering (via recommendations)
- [ ] Updates when birthdate changed - **N/A** (no birthdate field)
- **Notes:** Age is entered directly as "age in Summer 2026" rather than calculated from birthdate. See BUG-C004 for year hardcoding concern.

### Feature 24: Interest Tracking - PARTIAL FAIL
- [x] 12 category checkboxes in onboarding
- [x] Interests saved to profile
- [x] Interests used in recommendations
- [ ] Can update interests in settings - **MISSING**
- **Notes:** See BUG-C005. No way to edit preferred_categories after onboarding.

---

## Bugs Found

### BUG-C001: FavoriteButton unit tests expect outdated size classes
- **Feature #:** 17
- **Severity:** Low
- **Steps to Reproduce:**
  1. Run `npm test -- --run src/components/FavoriteButton.test.jsx`
  2. Observe 2 test failures for size assertions
- **Expected:** Tests pass
- **Actual:** Tests fail - expect `w-8`/`w-10` but component uses `w-10`/`w-11`
- **Root Cause:** Component was updated for WCAG 2.5.5 compliance (44px minimum touch targets) but tests weren't updated
- **File(s):** `src/components/FavoriteButton.test.jsx:71-93`
- **Recommended Fix:** Update test expectations to match WCAG-compliant sizes

---

### BUG-C002: No UI to assign favorite to a specific child
- **Feature #:** 19
- **Severity:** High
- **Steps to Reproduce:**
  1. Sign in and have multiple children configured
  2. Navigate to camp listing
  3. Click heart to favorite a camp
  4. Open Wishlist
  5. Try to assign the favorite to a specific child
- **Expected:** Should be able to select which child a favorite is for
- **Actual:** No UI element to assign child. All favorites default to `child_id: null`
- **Impact:** Per-child filtering in Wishlist is useless since favorites can't be assigned to children
- **File(s):**
  - `src/components/FavoriteButton.jsx` - calls `addFavorite(campId)` without childId
  - `src/components/Wishlist.jsx` - no UI to assign child
  - `src/lib/supabase.js:243` - Backend supports childId but UI doesn't use it
- **Recommended Fix:** Add a dropdown or modal in Wishlist to assign favorites to children, OR add child selector when favoriting from camp card

---

### BUG-C003: No dedicated "Delete Note" action in Wishlist
- **Feature #:** 20
- **Severity:** Low
- **Steps to Reproduce:**
  1. Add a note to a favorited camp
  2. Try to delete the note
- **Expected:** A "Delete note" button or icon
- **Actual:** Must click "Edit note", clear the text, then click "Save"
- **File(s):** `src/components/Wishlist.jsx:259-284`
- **Recommended Fix:** Add a trash icon or "Delete note" option in the note display area

---

### BUG-C004: Age-as-of-Summer hardcoded to 2026
- **Feature #:** 23
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open Children Manager
  2. Observe label says "Age in Summer 2026"
- **Expected:** Year should be dynamic or configurable
- **Actual:** Hardcoded to 2026
- **Impact:** App will need code changes when used for future years
- **File(s):**
  - `src/components/ChildrenManager.jsx:153` - "Age {child.age_as_of_summer} in Summer 2026"
  - `src/components/ChildrenManager.jsx:220` - "Age in Summer 2026"
  - `src/components/OnboardingWizard.jsx:444` - "Age (as of Summer 2026)"
- **Recommended Fix:** Create a config constant for the current planning year, or calculate dynamically

---

### BUG-C005: Cannot edit category preferences after onboarding
- **Feature #:** 24
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Complete onboarding, selecting some category preferences
  2. Open Settings
  3. Try to change preferred camp categories
- **Expected:** Settings should have a "Preferences" or "Interests" tab to edit categories
- **Actual:** No way to edit `preferred_categories` after onboarding
- **Impact:** Users who want to change their interests must have a developer reset their profile
- **File(s):**
  - `src/components/Settings.jsx` - missing tab/section for category preferences
  - `src/lib/supabase.js:updateProfile` - supports updating `preferred_categories`
  - `src/components/OnboardingWizard.jsx` - only place categories are set
- **Recommended Fix:** Add a "Preferences" tab in Settings with the same category grid from OnboardingWizard

---

## Test Coverage Analysis

### Unit Tests Reviewed
| File | Tests | Pass | Fail |
|------|-------|------|------|
| `FavoriteButton.test.jsx` | 31 | 29 | 2 |
| `Wishlist.test.jsx` | 27 | 27 | 0 |
| `ChildrenManager.test.jsx` | 20 | 20 | 0 |

### Missing Test Coverage
1. Per-child favorite assignment (because feature is missing)
2. Interest editing after onboarding (because feature is missing)
3. Age-as-of-summer calculation with actual birthdate (N/A - no birthdate field)

---

## Data Persistence Verification

| Data Type | Persists? | Verified By |
|-----------|-----------|-------------|
| Favorites | Yes | Code review of `refreshFavorites()` + unit tests |
| Wishlist Notes | Yes | Code review of `updateFavorite()` + unit tests |
| Children | Yes | Code review of `refreshChildren()` + unit tests |
| Child Colors | Yes | Code review - stored in `children` table |
| Category Preferences | Partially | Set once in onboarding, cannot be modified |

---

## Recommendations

### Priority 1 (Should Fix Before Launch)
- **BUG-C002**: Add UI to assign favorites to children - this makes Feature 19 actually usable

### Priority 2 (Should Fix Soon)
- **BUG-C005**: Add category editing in Settings - user expectation
- **BUG-C004**: Make year configurable for future-proofing

### Priority 3 (Nice to Have)
- **BUG-C001**: Update test expectations to match WCAG sizes
- **BUG-C003**: Add explicit delete note action

---

## Files Reviewed

- `src/components/FavoriteButton.jsx`
- `src/components/FavoriteButton.test.jsx`
- `src/components/Wishlist.jsx`
- `src/components/Wishlist.test.jsx`
- `src/components/ChildrenManager.jsx`
- `src/components/ChildrenManager.test.jsx`
- `src/components/OnboardingWizard.jsx`
- `src/components/Settings.jsx`
- `src/contexts/AuthContext.jsx`
- `src/lib/supabase.js`

---

*Report generated by Claude Code Bug Bash Track C*
