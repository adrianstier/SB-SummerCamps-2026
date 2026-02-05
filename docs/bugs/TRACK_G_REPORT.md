# Track G Bug Bash Report: Family, Notifications, Settings

**Tester:** Claude Code (bug-bash-track-g)
**Date:** 2026-02-04
**Status:** Complete

---

## Executive Summary

Tested 22 features (Features 66-87) covering Family Workspace, Notifications, and Settings functionality. Found **11 bugs** ranging from Medium to Low severity. No Critical bugs identified. The core functionality appears well-implemented, but there are several edge cases, UX issues, and missing error handling that should be addressed.

---

## Bugs Found

### BUG-G-001: FamilySuggestions displays raw camp_id instead of camp name
- **Feature #:** 69
- **Severity:** Medium
- **Issue:** In the SuggestionCard component, the camp name is displayed using `{camp_id}` which shows the raw camp ID (e.g., "ucsb-day-camp") instead of a human-readable camp name. The component should fetch and display the actual camp name.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilySuggestions.jsx`, lines 196-197
- **Suggested Fix:** The suggestion object should include the camp name from a joined camps table, or the component should look up the camp name from a camps context/cache.

### BUG-G-002: SuggestCampModal lacks camp search/autocomplete functionality
- **Feature #:** 69
- **Severity:** Medium
- **Issue:** The "Suggest a Camp" modal requires users to manually type a camp ID or name, but there's no search or autocomplete to help find valid camps. This is error-prone and unfriendly.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilySuggestions.jsx`, lines 290-305
- **Suggested Fix:** Replace the plain text input with a searchable dropdown/autocomplete that queries available camps.

### BUG-G-003: Missing error handling when navigator.clipboard is unavailable
- **Feature #:** 72
- **Severity:** Low
- **Issue:** The `handleCopyInviteCode` function calls `navigator.clipboard.writeText()` without checking if the Clipboard API is available. In non-secure contexts (HTTP) or older browsers, this will throw an error.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilyWorkspace.jsx`, lines 133-138
- **Suggested Fix:** Wrap in try-catch and provide fallback (e.g., select text in an input field).

### BUG-G-004: Activity feed auto-marks all notifications as read after 2 seconds
- **Feature #:** 67
- **Severity:** Medium
- **Issue:** The FamilyActivityFeed component automatically marks all notifications as read after just 2 seconds, even if the user hasn't scrolled through them all. This could cause users to miss important updates.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilyActivityFeed.jsx`, lines 15-24
- **Suggested Fix:** Consider using intersection observer to mark notifications as read when they're actually visible, or increase the delay significantly.

### BUG-G-005: Dismiss button opacity transition not working on notifications
- **Feature #:** 82
- **Severity:** Low
- **Issue:** The dismiss button in NotificationBell has `opacity-0 group-hover:opacity-100` classes, but the parent element uses a different group class. The dismiss button never becomes visible on hover.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/NotificationBell.jsx`, lines 315-325
- **Suggested Fix:** Add the `group` class to the notification button element (line 291) or restructure the CSS.

### BUG-G-006: FamilyContext dependency array missing getFamilyByInviteCode
- **Feature #:** 66
- **Severity:** Low
- **Issue:** The useEffect for looking up family by invite code depends on `getFamilyByInviteCode` but this function is passed from context and not memoized, potentially causing unnecessary re-renders.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilyWorkspace.jsx`, lines 61-71
- **Suggested Fix:** Either wrap in useCallback in FamilyContext or remove from dependency array if function is stable.

### BUG-G-007: Approval card shows responded_at date even when no response yet
- **Feature #:** 70
- **Severity:** Low
- **Issue:** In the ApprovalCard component, it attempts to format `responded_at` date in the response info section, but this could be null for recently responded items that don't have the data yet, potentially causing a display error.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilyApprovals.jsx`, line 262
- **Suggested Fix:** Add null check before formatting: `{responded_at && formatDistanceToNow(new Date(responded_at))}`

### BUG-G-008: Weekly digest time input has no validation
- **Feature #:** 87
- **Severity:** Low
- **Issue:** The weekly digest time input allows any time value but there's no validation that the time is in a valid format before saving.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/Settings.jsx`, lines 912-918
- **Suggested Fix:** Add input validation or use a time picker component with built-in validation.

### BUG-G-009: Settings save error shown via alert() instead of proper UI
- **Feature #:** 83
- **Severity:** Low
- **Issue:** When saving settings fails, the error is shown via `alert()` which is jarring and not consistent with the rest of the app's error handling pattern.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/Settings.jsx`, lines 103-108
- **Suggested Fix:** Use an inline error message or toast notification consistent with other error handling in the app.

### BUG-G-010: FamilyComments refreshActivityFeed imported but not used
- **Feature #:** 67
- **Severity:** Low
- **Issue:** The FamilyActivityFeed component imports `refreshActivityFeed` from useFamily but never uses it. There's no manual refresh capability for users.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/FamilyActivityFeed.jsx`, line 8
- **Suggested Fix:** Either implement a pull-to-refresh or refresh button, or remove the unused import.

### BUG-G-011: Settings summer weeks calculation can produce negative values
- **Feature #:** 84
- **Severity:** Low
- **Issue:** The `getSummerWeeksCount()` function doesn't handle cases where schoolEndDate is after schoolStartDate (invalid configuration), which would produce negative week counts.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/Settings.jsx`, lines 127-132
- **Suggested Fix:** Add validation to ensure end date is before start date, or return 0 for invalid configurations.

---

## Feature Test Summary

| Feature # | Feature Name | Status | Notes |
|-----------|--------------|--------|-------|
| 66 | Family Workspace | PASS | Works but has minor issues (BUG-G-003) |
| 67 | Activity Feed | ISSUES FOUND | BUG-G-004, BUG-G-010 |
| 68 | Comments | PASS | Functionality works correctly |
| 69 | Camp Suggestions | ISSUES FOUND | BUG-G-001, BUG-G-002 |
| 70 | Approval Requests | ISSUES FOUND | BUG-G-007 |
| 71 | Family Notifications | PASS | Real-time subscriptions implemented correctly |
| 72 | Member Invitations | ISSUES FOUND | BUG-G-003, BUG-G-006 |
| 73 | Registration Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 74 | Pricing Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 75 | Availability Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 76 | Schedule Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 77 | Social Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 78 | Content Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 79 | System Notifications | PASS | Config present in NOTIFICATION_CONFIG |
| 80 | Notification Bell | ISSUES FOUND | BUG-G-005 |
| 81 | Notification Preferences | PASS | Comprehensive preferences UI |
| 82 | Notification Dismissal | ISSUES FOUND | BUG-G-005 |
| 83 | User Settings Panel | ISSUES FOUND | BUG-G-009 |
| 84 | School Calendar Config | ISSUES FOUND | BUG-G-011 |
| 85 | Work Hours Setting | PASS | With presets, works correctly |
| 86 | Budget Configuration | PASS | With presets and per-child breakdown |
| 87 | Notification Preferences | ISSUES FOUND | BUG-G-008 |

---

## Code Quality Observations

### Positive Findings

1. **Well-structured FamilyContext**: The context properly manages subscriptions with useRef to prevent stale closures and memory leaks.

2. **Comprehensive notification types**: The NOTIFICATION_CONFIG object in NotificationBell.jsx covers all required notification categories with appropriate icons and colors.

3. **Real-time subscriptions**: Proper Supabase channel subscriptions for family activity, comments, suggestions, and approvals.

4. **Good empty state handling**: All components have proper empty state UI with helpful messages.

5. **Memoized computed values**: FamilyContext uses useMemo for derived state like `pendingSuggestions`, `isCurrentFamilyAdmin`, etc.

6. **Accessible controls**: Settings uses proper ARIA attributes (role="tablist", role="tab", aria-selected, etc.).

### Areas for Improvement

1. **Lack of optimistic updates**: Many actions wait for server response before updating UI. Consider optimistic updates for better perceived performance.

2. **Missing loading states**: Some async operations don't show loading indicators (e.g., toggling pin on comments).

3. **Inconsistent error handling**: Some components use inline error messages, others use alert(), some don't show errors at all.

4. **No offline support**: Family features require network connectivity with no offline fallbacks.

---

## Recommendations

1. **High Priority**: Fix BUG-G-001 (camp name display) as it directly impacts user experience when viewing suggestions.

2. **High Priority**: Fix BUG-G-004 (auto-marking notifications) to prevent users from missing important updates.

3. **Medium Priority**: Add camp search/autocomplete to FamilySuggestions (BUG-G-002) for better UX.

4. **Medium Priority**: Standardize error handling across all components to use consistent UI patterns.

5. **Low Priority**: Clean up unused imports and minor UI issues (BUG-G-005, BUG-G-010).

---

*Report generated by Claude Code Bug Bash Track G*
