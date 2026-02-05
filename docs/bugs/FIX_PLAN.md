# Bug Fix Execution Plan

**Created:** 2026-02-05
**Target:** Fix 9 High Severity Bugs from Bug Bash
**Approach:** Parallel agent execution in 3 batches

---

## Batch 1: Auth & Onboarding Fixes (BUG-A-002, BUG-A-005)

### BUG-A-002: Onboarding Missing Notification Step
**File:** `src/components/OnboardingWizard.jsx`
**Fix:**
1. Add new step to STEPS array: `{ id: 'notifications', title: 'Notifications' }`
2. Create `NotificationsStep` component with toggles for:
   - Registration alerts
   - Price drop notifications
   - Schedule reminders
   - Social activity notifications
3. Update step navigation and canProceed logic

### BUG-A-005: Sample Data Error Handling
**File:** `src/components/OnboardingWizard.jsx`
**Fix:**
1. In `handleComplete()`, add explicit check when `data` is null/empty
2. Show user-friendly error if sample data creation fails
3. Add rollback logic to clean up partial sample data on failure

---

## Batch 2: UI/Feature Fixes (BUG-B-001, BUG-C-002, BUG-F-011, BUG-F-017/F-018)

### BUG-B-001: Camp Comparison Limit Mismatch [FIXED]
**File:** `src/components/CampComparison.jsx`
**Status:** Limit set to 6 camps. Documentation updated to match implementation.

### BUG-C-002: No UI for Per-Child Favorites
**File:** `src/components/Wishlist.jsx`
**Fix:**
1. Add child selector dropdown to Wishlist view
2. Filter favorites by selected child
3. Allow assigning existing favorites to specific children

### BUG-F-011: Squad Member Removal UI Missing
**File:** `src/components/SquadDetail.jsx`
**Fix:**
1. Add "Remove" button next to each squad member (for owner only)
2. Implement `removeSquadMember()` function in supabase.js
3. Add confirmation dialog before removal

### BUG-F-017/F-018: Gamification Components Not Visible
**Files:** `src/App.jsx`, `src/components/Dashboard.jsx`
**Fix:**
1. Import and render `AchievementBadges` component
2. Import and render `ProgressTracker` component
3. Add to Dashboard or appropriate location

---

## Batch 3: Data Persistence & Export Fixes (BUG-D-001, BUG-D-006, BUG-E-005)

### BUG-D-001: Blocked Weeks Not Persisted
**Files:** `src/components/SchedulePlanner.jsx`, `src/lib/supabase.js`
**Fix:**
1. Verify `blocked_weeks` is in profile allowlist (already is)
2. Call `updateProfile({ blocked_weeks })` when user blocks a week
3. Load blocked weeks from profile on mount

### BUG-D-006: Google Calendar Single Export
**File:** `src/lib/googleCalendar.js`
**Fix:**
1. Implement `exportAllToGoogleCalendar()` that batches multiple events
2. Add "Export All" button to SchedulePlanner
3. Handle rate limiting for Google Calendar API

### BUG-E-005: Share Link Non-Routable
**Files:** `src/App.jsx`, `src/components/SchedulePlanner.jsx`
**Fix:**
1. Add route handling for `/share/:shareId` URLs
2. Create read-only schedule view component
3. Generate unique share IDs and store in database

---

## Execution Commands

### Batch 1 Agent Prompt
```
Fix BUG-A-002 and BUG-A-005 in the Santa Barbara Summer Camps app.

BUG-A-002: Add a dedicated "Notifications" step to OnboardingWizard.jsx between "Preferences" and "All Set!". Include toggles for registration, pricing, schedule, and social notifications.

BUG-A-005: In OnboardingWizard.jsx handleComplete(), add error handling when addChild returns null/empty data. Show error to user and rollback partial data.

Working directory: /Users/adrianstier/SB-SummerCamps-2026
```

### Batch 2 Agent Prompt
```
Fix BUG-B-001, BUG-C-002, BUG-F-011, and BUG-F-017/F-018 in the Santa Barbara Summer Camps app.

BUG-B-001: Verify camp comparison limit matches UI text (12 camps) in CampComparison.jsx
BUG-C-002: Add child selector to Wishlist.jsx for per-child favorites
BUG-F-011: Add squad member removal UI in SquadDetail.jsx (owner only)
BUG-F-017/F-018: Make AchievementBadges and ProgressTracker visible in the app

Working directory: /Users/adrianstier/SB-SummerCamps-2026
```

### Batch 3 Agent Prompt
```
Fix BUG-D-001, BUG-D-006, and BUG-E-005 in the Santa Barbara Summer Camps app.

BUG-D-001: Persist blocked weeks to Supabase profile in SchedulePlanner.jsx
BUG-D-006: Add "Export All to Google Calendar" in googleCalendar.js
BUG-E-005: Implement routable share links for schedules

Working directory: /Users/adrianstier/SB-SummerCamps-2026
```

---

## Verification Checklist

After fixes, verify:
- [ ] Onboarding has 5 steps including notifications
- [ ] Sample data errors show user-friendly message
- [x] Camp comparison allows up to 6 camps (docs updated)
- [ ] Wishlist can filter by child
- [ ] Squad owners can remove members
- [ ] Achievements and progress visible in UI
- [ ] Blocked weeks persist after refresh
- [ ] Can export all camps to Google Calendar
- [ ] Share links load read-only schedule

---

*Plan created by Claude Code Bug Fix Orchestrator*
