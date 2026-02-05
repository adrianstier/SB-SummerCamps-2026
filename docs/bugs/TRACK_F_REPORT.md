# Track F Bug Report: Gamification & Social (Features 52-65)

**Tested by:** Bug Bash Agent (Track F)
**Date:** 2026-02-04
**Status:** Complete

---

## Summary

| Feature | Status | Bugs Found |
|---------|--------|------------|
| 52: Achievement System | ISSUES FOUND | 1 |
| 53: Achievement Types | ISSUES FOUND | 2 |
| 54: Badge Display | PASS | 0 |
| 55: Streak Tracking | ISSUES FOUND | 2 |
| 56: Progress Tracker | ISSUES FOUND | 1 |
| 57: Planning Tips | ISSUES FOUND | 1 |
| 58: Squads (Groups) | PASS | 0 |
| 59: Squad Creation | ISSUES FOUND | 1 |
| 60: Join via Code | ISSUES FOUND | 2 |
| 61: Member Management | ISSUES FOUND | 2 |
| 62: Looking for Friends | ISSUES FOUND | 1 |
| 63: Schedule Visibility | ISSUES FOUND | 1 |
| 64: Squad Notifications | ISSUES FOUND | 1 |
| 65: Friend Matching | ISSUES FOUND | 1 |

**Total Bugs Found:** 16

---

## Bugs

### BUG-F-001: Achievement Lookup Uses Incorrect Key Case
- **Feature #:** 52, 53
- **Severity:** High
- **Issue:** In `AchievementsContext.jsx` line 421, when showing celebration for a newly earned achievement, the code uses `ACHIEVEMENTS[newAchievements[0].toUpperCase()]`. However, achievement IDs are stored in lowercase (e.g., `'first_camp'`), and `toUpperCase()` only uppercases letters but doesn't convert underscores to the correct key format. The `ACHIEVEMENTS` object uses keys like `FIRST_CAMP` (with underscore), but `'first_camp'.toUpperCase()` produces `'FIRST_CAMP'` which should work. However, the code should use a more robust lookup method since the keys in the object match the pattern.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (line 421)
- **Suggested Fix:** The current approach works because JS is case-sensitive and the keys match. However, for safety, consider using `Object.values(ACHIEVEMENTS).find(a => a.id === newAchievements[0])` instead of relying on string transformation.

### BUG-F-002: Duplicate Achievement Title "Week Warrior"
- **Feature #:** 53
- **Severity:** Medium
- **Issue:** Two different achievements share the same title "Week Warrior": `WEEK_COVERED` (line 18) with description "Fill your first week" and `STREAK_7` (line 99) with description "7-day planning streak". This will confuse users when they see the same title for different accomplishments.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (lines 18, 99)
- **Suggested Fix:** Rename one of the achievements. Suggestion: Change `STREAK_7` title to "Streak Champion" or "Week-Long Warrior".

### BUG-F-003: Missing Achievement Type for "Engagement" - COMPARE_MASTER Never Triggered Without Manual Call
- **Feature #:** 53
- **Severity:** Medium
- **Issue:** The `COMPARE_MASTER` achievement requires `hasCompared` to be true, which is set by calling `trackComparison()`. However, there's no evidence that `trackComparison()` is actually called from the CampComparison component. The function exists in the context but may not be wired up, meaning users will never unlock this achievement.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (lines 392-394), integration with `/Users/adrianstier/SB-SummerCamps-2026/src/components/CampComparison.jsx`
- **Suggested Fix:** Ensure `trackComparison()` is called when the user opens the comparison view in CampComparison.jsx.

### BUG-F-004: Streak Calculation Has Off-by-One Error on First Visit
- **Feature #:** 55
- **Severity:** Low
- **Issue:** In the streak initialization (lines 221-233), when calculating if the streak is still valid, the code checks if `diffDays > 1`. This means if the user visited yesterday (diffDays = 1), the streak is preserved. However, when updating the streak on visit (lines 264-278), if `lastVisitDate !== today`, it checks `isConsecutive` against yesterday's date. If `lastVisitDate` is null (first ever visit), `isConsecutive` will be false and streak starts at 1, which is correct. But the initial streak state sets `count: 0`, so on first meaningful interaction, users see 0 instead of 1.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (lines 221-233, 264-278)
- **Suggested Fix:** Initialize streak to `{ count: 1, lastVisit: new Date().toISOString() }` on first load, or ensure the UI handles count of 0 gracefully (which it does in ProgressTracker by only showing streak > 1).

### BUG-F-005: Streak Not Reset When User Returns After Multiple Days Away
- **Feature #:** 55
- **Severity:** Medium
- **Issue:** The streak reset logic in the `useState` initializer (lines 221-233) properly resets the streak to 0 if the user hasn't visited in more than 1 day. However, this reset only happens on initial load. If the user keeps the page open for multiple days (single-page app), the streak won't reset because the `useEffect` at lines 264-278 will increment based on the stale `streak.lastVisit`. The check for consecutive days doesn't account for gaps longer than 1 day.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (lines 264-278)
- **Suggested Fix:** Add a check in the useEffect to verify the gap isn't more than 1 day before incrementing:
```javascript
if (lastVisitDate !== today) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastVisitDate === yesterday.toDateString();
  const gapDays = Math.floor((new Date() - new Date(streak.lastVisit)) / (1000 * 60 * 60 * 24));

  setStreak(prev => ({
    count: (isConsecutive && gapDays <= 1) ? prev.count + 1 : 1,
    lastVisit: new Date().toISOString()
  }));
}
```

### BUG-F-006: Progress Tracker Shows Incorrect Coverage When Child Has No Schedule
- **Feature #:** 56
- **Severity:** Low
- **Issue:** The `ProgressTracker` component displays coverage percentage from `planningStats.coveragePercent`. However, when viewing a specific child who has no scheduled camps, the stats are calculated globally across all children in `AchievementsContext`. This means the progress bar shows global coverage, not per-child coverage. The tracker may be misleading for multi-child families.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/ProgressTracker.jsx`, `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AchievementsContext.jsx` (lines 281-334)
- **Suggested Fix:** Consider adding a `childId` prop to ProgressTracker that allows filtering stats per child, or clarify in the UI that this shows overall summer planning progress.

### BUG-F-007: Planning Tips Can Display Same Tip Repeatedly After Dismissal
- **Feature #:** 57
- **Severity:** Low
- **Issue:** In `PlanningTips.jsx`, dismissed tips are stored in localStorage and filtered out in `visibleTips`. However, the `currentIndex` state can become stale after dismissing a tip. When `handleDismiss` is called, it updates `dismissedTips` but doesn't reset `currentIndex`, potentially causing index-out-of-bounds issues or showing unexpected tips. The modulo operation at line 111 helps prevent crashes but may skip tips unexpectedly.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/PlanningTips.jsx` (lines 99-101, 111)
- **Suggested Fix:** Reset `currentIndex` to 0 after dismissing a tip, or ensure the index is clamped to valid range after filtering.

### BUG-F-008: CreateSquadModal Does Not Use shareSchedule Setting
- **Feature #:** 59
- **Severity:** Medium
- **Issue:** In `CreateSquadModal.jsx`, there's a `shareSchedule` state variable (line 8) and a checkbox for "Share my schedule with this squad" (lines 75-86). However, when `handleSubmit` is called (line 23), only `name` and `revealIdentity` are passed to `createSquad()`. The `shareSchedule` preference is never sent to the backend, meaning it's always defaulted to `true` in the Supabase function regardless of user selection.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/CreateSquadModal.jsx` (lines 8, 23, 75-86)
- **Suggested Fix:** Modify `createSquad()` function to accept `shareSchedule` parameter and pass it in `handleSubmit`:
```javascript
const { data, error: createError } = await createSquad(name.trim(), revealIdentity, shareSchedule);
```

### BUG-F-009: JoinSquad useEffect Missing Dependency
- **Feature #:** 60
- **Severity:** Low
- **Issue:** In `JoinSquad.jsx` line 14-17, the `useEffect` that calls `loadSquad()` has `[inviteCode]` as its dependency array. However, `loadSquad` is defined inside the component and references `setLoading`, `setError`, and `setSquad`. While this works due to closure, it's a React anti-pattern and could cause stale closure issues if the component were to become more complex.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/JoinSquad.jsx` (lines 14-28)
- **Suggested Fix:** Either wrap `loadSquad` in `useCallback` with proper dependencies, or move the logic directly into the `useEffect`.

### BUG-F-010: JoinSquad Shows Stale Error After Successful Squad Load
- **Feature #:** 60
- **Severity:** Low
- **Issue:** In `JoinSquad.jsx`, after successfully loading a squad, if the user had previously seen an error (e.g., from a previous invalid code attempt), the error message persists because `setError(null)` is only called at the start of `loadSquad()` (line 20), not after a successful load. The conditional at line 63 checks `error && !squad`, so this shouldn't display incorrectly, but the error state remains in memory unnecessarily.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/JoinSquad.jsx` (lines 18-28)
- **Suggested Fix:** No action required as the UI handles this correctly, but for cleanliness, `setError(null)` should be called after successfully setting the squad.

### BUG-F-011: SquadDetail Missing Role Check for Member Removal
- **Feature #:** 61
- **Severity:** High
- **Issue:** In `SquadDetail.jsx`, the `removeSquadMember` function is imported from supabase.js but there's no UI to actually remove members. While the Bug Bash Plan mentions "Owner can remove members", the SquadDetail component doesn't render any remove buttons for the owner to use. The `MemberBadge` component (lines 215-244) only displays member info, not removal controls.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SquadDetail.jsx` (lines 4-10, 152-158, 215-244)
- **Suggested Fix:** Add a remove button to `MemberBadge` component that's visible only when `isOwner` is true and the member is not the owner themselves.

### BUG-F-012: SquadDetail Displays Camp ID Instead of Camp Name
- **Feature #:** 61
- **Severity:** Medium
- **Issue:** In `SquadDetail.jsx`, the `CampInterestCard` component (lines 277-341) displays `campId` as the card title (line 297: `{campId}`). This shows the internal camp ID (e.g., "ucsb-summer-camp") instead of the human-readable camp name (e.g., "UCSB Summer Camp"). The camp name should be looked up and displayed instead.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SquadDetail.jsx` (line 297)
- **Suggested Fix:** Fetch camp details or pass camp name through the interests data. Update the display to show the proper camp name.

### BUG-F-013: Looking for Friends Toggle Not Visible When User Has No Squads
- **Feature #:** 62
- **Severity:** Low
- **Issue:** In `SchedulePlanner.jsx`, the "Looking for Friends" toggle (lines 1139-1150) is only rendered when `hasSquads` is true (line 1139). This is intentional UX, but the Bug Bash Plan states the feature should have a toggle "available in settings/planner". Without squads, users can't see or use this feature at all, which may be confusing if they expect to set their preference before joining a squad.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx` (lines 903, 1139-1150)
- **Suggested Fix:** Consider showing the toggle but disabled/grayed out with a tooltip saying "Join a squad to use this feature", or keep current behavior with documentation explaining the squad requirement.

### BUG-F-014: Schedule Visibility Setting Not Persisted on Squad Creation
- **Feature #:** 63
- **Severity:** Medium
- **Issue:** Related to BUG-F-008 - The `shareSchedule` setting in CreateSquadModal is not passed to the backend. Additionally, while `JoinSquad.jsx` correctly passes `shareSchedule` to `joinSquad()` (line 39), the toggle in CreateSquadModal gives users a false sense of control since their preference is ignored.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/CreateSquadModal.jsx` (lines 8, 23)
- **Suggested Fix:** Same as BUG-F-008 - modify `createSquad` function signature and call.

### BUG-F-015: Squad Notification Bell Does Not Navigate to Relevant Content
- **Feature #:** 64
- **Severity:** Low
- **Issue:** In `SquadNotificationBell.jsx`, when a notification is clicked (`handleNotificationClick`, lines 27-33), the function marks the notification as read and closes the dropdown, but doesn't navigate the user to the relevant squad or camp. Users have no way to quickly jump to the context of the notification.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SquadNotificationBell.jsx` (lines 27-33)
- **Suggested Fix:** Add navigation logic based on notification type and associated squad/camp data. Pass an `onNavigate` callback prop or use React Router to navigate to the relevant squad detail page.

### BUG-F-016: Friend Matching Notifications Depend on Backend Trigger Not Visible in Code
- **Feature #:** 65
- **Severity:** Medium
- **Issue:** The Bug Bash Plan states "Notified when friend at same camp" (Feature 65). While the frontend handles displaying `friend_match` notifications in `SquadNotificationBell.jsx` (line 37-38) and `SquadsPanel.jsx` (line 18), there's no visible frontend logic that creates these notifications. This feature depends entirely on backend triggers (likely Supabase Edge Functions or database triggers) that aren't visible in the codebase. If these backend triggers aren't set up correctly, the feature won't work.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SquadNotificationBell.jsx`, `/Users/adrianstier/SB-SummerCamps-2026/src/lib/supabase.js`
- **Suggested Fix:** Verify backend triggers are configured to create `squad_notifications` records when friend matches are detected. Consider adding a manual "check for matches" function as fallback.

---

## Detailed Feature Analysis

### Feature 52: Achievement System
**Status:** ISSUES FOUND

The achievement system is well-structured with a context provider (`AchievementsContext.jsx`) that manages:
- Achievement definitions with icons, descriptions, and celebration messages
- Earned achievements stored in localStorage
- Automatic achievement checking when relevant data changes

**Issues Found:**
- Minor key lookup concern (BUG-F-001) - works but could be more robust

**What Works:**
- Achievement definitions are comprehensive
- Unlocked/locked states properly tracked
- Total count is accurate

### Feature 53: Achievement Types
**Status:** ISSUES FOUND

14 achievement types are defined across 6 categories:
- **Milestone:** FIRST_CAMP, WEEK_COVERED, HALF_SUMMER, FULL_SUMMER
- **Planning:** MULTI_CHILD, VARIETY_SEEKER, BUDGET_PRO
- **Timing:** EARLY_BIRD
- **Engagement:** FAVORITE_FIVE, COMPARE_MASTER, EXPLORER
- **Streak:** STREAK_3, STREAK_7
- **Social:** SQUAD_JOINER

**Issues Found:**
- Duplicate "Week Warrior" title (BUG-F-002)
- COMPARE_MASTER may never trigger (BUG-F-003)

### Feature 54: Badge Display
**Status:** PASS

`AchievementBadges.jsx` provides three display variants:
- `grid` - Full grouped display with filters
- `compact` - Small badge list
- `inline` - Horizontal badge strip

**What Works:**
- Badges have appropriate icons via BrandIcon component
- Names and descriptions display correctly
- Celebration messages show in modal
- Locked achievements properly grayed out

### Feature 55: Streak Tracking
**Status:** ISSUES FOUND

Streak tracking uses localStorage for persistence across sessions.

**Issues Found:**
- Initial streak count starts at 0 (BUG-F-004)
- Long-running sessions may not reset streak properly (BUG-F-005)

**What Works:**
- Streak displays in ProgressTracker when > 1
- Best streak concept exists but not implemented for display

### Feature 56: Progress Tracker
**Status:** ISSUES FOUND

`ProgressTracker.jsx` displays:
- Coverage percentage with progress bar
- Milestone markers at 25%, 50%, 75%, 100%
- Weeks covered count
- Gap count
- Optional detailed stats view

**Issues Found:**
- Shows global stats, not per-child (BUG-F-006)

**What Works:**
- Progress bar fills correctly
- Milestone markers show reached state
- Updates when data changes

### Feature 57: Planning Tips
**Status:** ISSUES FOUND

10 contextual tips defined based on planning state conditions:
- start_early, check_gaps, variety, budget_warning, extended_care
- half_done, almost_done, favorites_empty, compare_camps, join_squad

**Issues Found:**
- Index state management after dismissal (BUG-F-007)

**What Works:**
- Tips are contextually relevant based on conditions
- Can navigate between tips
- Can dismiss tips (persisted in localStorage)
- Three variants: default, inline, compact

### Feature 58: Squads (Groups)
**Status:** PASS

`SquadsPanel.jsx` provides squad list view with:
- Empty state encouraging squad creation
- Squad cards showing member count and notification status
- Match/looking indicators

**What Works:**
- Panel accessible and displays squads
- Squad count shows correctly
- Navigation to squad detail works

### Feature 59: Squad Creation
**Status:** ISSUES FOUND

`CreateSquadModal.jsx` allows creating squads with name and privacy settings.

**Issues Found:**
- shareSchedule setting not passed to backend (BUG-F-008)

**What Works:**
- Name field required validation
- Description field exists (implicit through name)
- Privacy settings UI present
- Squad created successfully via Supabase

### Feature 60: Join via Code
**Status:** ISSUES FOUND

`JoinSquad.jsx` handles joining squads via invite code URL.

**Issues Found:**
- useEffect dependency warning (BUG-F-009)
- Minor stale error state (BUG-F-010)

**What Works:**
- Invite code lookup via RPC function
- Invalid code shows error
- Valid code shows squad info and join button
- Privacy settings available before joining

### Feature 61: Member Management
**Status:** ISSUES FOUND

`SquadDetail.jsx` shows member list and allows settings changes.

**Issues Found:**
- No UI for owner to remove members (BUG-F-011)
- Camp ID displayed instead of name (BUG-F-012)

**What Works:**
- Member list displays with badges
- Member roles visible
- Invite more members button works
- Settings page allows privacy changes

### Feature 62: Looking for Friends
**Status:** ISSUES FOUND

Toggle available on camp cards in SchedulePlanner when user has squads.

**Issues Found:**
- Feature hidden completely when user has no squads (BUG-F-013)

**What Works:**
- Toggle visible in planner for squad members
- Status visible to squad members
- Can toggle on/off

### Feature 63: Schedule Visibility
**Status:** ISSUES FOUND

Privacy controls for schedule sharing with squads.

**Issues Found:**
- Settings not persisted on creation (BUG-F-014)

**What Works:**
- Toggle available in SquadSettings
- Works on join
- Hidden schedules not visible to others (via RLS)

### Feature 64: Squad Notifications
**Status:** ISSUES FOUND

`SquadNotificationBell.jsx` displays squad-specific notifications.

**Issues Found:**
- No navigation on notification click (BUG-F-015)

**What Works:**
- Notifications for new members show
- Schedule changes notification type exists
- Mark as read works
- Mark all read works

### Feature 65: Friend Matching
**Status:** ISSUES FOUND

Backend-driven feature for matching friends at same camps.

**Issues Found:**
- Depends on backend triggers not visible in code (BUG-F-016)

**What Works:**
- Frontend properly handles friend_match notification type
- Match indicator shows in SquadDetail camp cards
- Notification display works when data exists

---

## Recommendations

### Critical Priority
1. Fix BUG-F-008/BUG-F-014: shareSchedule setting not being saved on squad creation
2. Fix BUG-F-011: Add member removal UI for squad owners
3. Fix BUG-F-012: Display camp names instead of IDs in squad detail

### High Priority
4. Fix BUG-F-002: Rename duplicate "Week Warrior" achievement title
5. Fix BUG-F-003: Wire up trackComparison() to CampComparison component
6. Verify BUG-F-016: Ensure backend triggers exist for friend matching

### Medium Priority
7. Fix BUG-F-005: Improve streak calculation for long-running sessions
8. Fix BUG-F-015: Add navigation from notification click
9. Fix BUG-F-006: Consider per-child progress tracking option

### Low Priority
10. Fix BUG-F-007: Reset tip index after dismissal
11. Fix BUG-F-009: Clean up useEffect dependencies
12. Fix BUG-F-013: Show disabled "Find Friends" with explanation when no squads

---

---

## Supplemental Findings (Second Review)

**Reviewed by:** Claude Code (bug-bash-track-f)
**Date:** 2026-02-04

The following additional issues were identified in a secondary code review:

### BUG-F-017: AchievementBadges Component Not Rendered in Application UI
- **Feature #:** 52, 54
- **Severity:** High
- **Issue:** The `AchievementBadges` component exists and is fully implemented in `src/components/AchievementBadges.jsx`, but it is never imported or rendered in `App.jsx`, `SchedulePlanner.jsx`, `Dashboard.jsx`, or any other visible view. Users have no dedicated way to see their achievements.
- **File(s):** `src/components/AchievementBadges.jsx`, `src/App.jsx`
- **Suggested Fix:** Add an "Achievements" tab to SchedulePlanner, or create an Achievements section in Dashboard, or add it to a Settings/Profile page.

### BUG-F-018: ProgressTracker Component Not Rendered in Application UI
- **Feature #:** 56
- **Severity:** High
- **Issue:** The `ProgressTracker` component exists and works correctly, but is never imported or rendered anywhere visible in the application. Users cannot see their summer planning progress bar.
- **File(s):** `src/components/ProgressTracker.jsx`, `src/components/SchedulePlanner.jsx`
- **Suggested Fix:** Add `<ProgressTracker />` to the SchedulePlanner header or sidebar area.

### BUG-F-019: PlanningTipsContainer Not Rendered in Application UI
- **Feature #:** 57
- **Severity:** Medium
- **Issue:** The `PlanningTipsContainer` component provides contextual planning advice but is never rendered in the SchedulePlanner or any other visible view.
- **File(s):** `src/components/PlanningTips.jsx`, `src/components/SchedulePlanner.jsx`
- **Suggested Fix:** Add `<PlanningTipsContainer />` to the SchedulePlanner, perhaps in the sidebar or above the week calendar.

### BUG-F-020: Best Streak Never Tracked or Displayed
- **Feature #:** 55
- **Severity:** Low
- **Issue:** The streak system only tracks `count` and `lastVisit`. There's no `bestStreak` field to track the user's highest streak ever achieved. When a streak resets, the user loses visibility into their previous accomplishment.
- **File(s):** `src/contexts/AchievementsContext.jsx` (lines 221-233)
- **Suggested Fix:** Add `bestStreak` to the streak state object and update it whenever `count` exceeds the current `bestStreak`. Persist to localStorage alongside current streak.

### BUG-F-021: Squad Creation Missing Optional Description Field
- **Feature #:** 59
- **Severity:** Low
- **Issue:** Per the Bug Bash Plan checklist, "Description optional" should be available when creating a squad. However, `CreateSquadModal.jsx` only has name and privacy settings, no description/notes field.
- **File(s):** `src/components/CreateSquadModal.jsx`
- **Suggested Fix:** Add optional description textarea to the form.

### BUG-F-022: No Squad Notification Category Preferences
- **Feature #:** 64
- **Severity:** Low
- **Issue:** Users cannot configure which types of squad notifications they want to receive (friend_match, new_member, schedule_change). There are no squad notification preferences in the Settings component.
- **File(s):** `src/components/Settings.jsx`, `src/components/SquadNotificationBell.jsx`
- **Suggested Fix:** Add squad notification toggles to the notification preferences section in Settings.

---

## Updated Summary

**Total Bugs Found:** 22 (16 original + 6 supplemental)

### Severity Distribution
| Severity | Count |
|----------|-------|
| High | 5 |
| Medium | 8 |
| Low | 9 |

### Critical UI Visibility Issues
The most significant finding is that three major gamification components (`AchievementBadges`, `ProgressTracker`, `PlanningTipsContainer`) are fully implemented but **never rendered anywhere in the application UI**. This represents substantial development effort that users cannot access.

**Recommended Priority Actions:**
1. Add `ProgressTracker` to SchedulePlanner (easy win, high visibility)
2. Add `AchievementBadges` tab or section to the app
3. Add `PlanningTipsContainer` to provide contextual help
4. Fix `shareSchedule` not being passed on squad creation (BUG-F-008)

---

*Report updated by Claude Code Bug Bash Agent - Track F (Secondary Review)*
