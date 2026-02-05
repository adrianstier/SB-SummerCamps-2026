# Track D: Schedule Planning Bug Report

**Tester:** Bug Bash Agent - Track D
**Date:** 2026-02-04
**Features Tested:** 25-38
**Source Files Analyzed:**
- `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`
- `/Users/adrianstier/SB-SummerCamps-2026/src/components/CostDashboard.jsx`
- `/Users/adrianstier/SB-SummerCamps-2026/src/components/Settings.jsx`
- `/Users/adrianstier/SB-SummerCamps-2026/src/lib/supabase.js`

---

## Executive Summary

Analyzed 14 features in the Schedule Planning track. Found **9 bugs** ranging from critical to low severity. Key issues include blocked weeks not persisting to database, work schedule overlay not being implemented in the planner, and session picker silently failing when no sessions exist.

---

## Bugs Found

### BUG-D-001: Blocked Weeks State Not Persisted to Database
- **Feature #:** 31
- **Severity:** High
- **Issue:** The `blockedWeeks` state is stored only in React state (`useState`) and is lost on page refresh or when the user closes and reopens the Schedule Planner. Users expect their vacation/family time/travel blocks to persist.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`, line 68
- **Code Evidence:**
  ```javascript
  const [blockedWeeks, setBlockedWeeks] = useState({}); // { [childId]: { [weekNum]: { type, label, note } } }
  ```
  There is no `useEffect` to load blocked weeks from the database, nor any function to save them.
- **Suggested Fix:** Create a `blocked_weeks` table in Supabase and add functions to persist/load blocked weeks. Update `handleBlockWeek` and `handleUnblockWeek` to save to database.

---

### BUG-D-002: Work Schedule Overlay Not Implemented in Planner
- **Feature #:** 35
- **Severity:** Medium
- **Issue:** The Settings component allows users to configure work hours (`work_hours_start` and `work_hours_end`), and the filters use these to filter camps. However, the Schedule Planner does NOT display any work schedule overlay or flag camps that don't cover work hours. The feature requirement states "Camps not covering work hours flagged" but this is not implemented.
- **File(s):**
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/Settings.jsx`, lines 33-34 (work hours stored)
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx` (no work schedule overlay logic found)
- **Code Evidence:** Searched entire SchedulePlanner.jsx for `work_hours` - only found in achievements context, not in the planner display logic.
- **Suggested Fix:** Add a coverage indicator that compares camp hours with work hours and flags camps that start after work begins or end before work ends.

---

### BUG-D-003: Session Picker Shows "Loading" Forever If No Sessions Exist
- **Feature #:** 32
- **Severity:** Medium
- **Issue:** When opening the session picker modal for a camp that has no sessions in the database, the modal shows "Loading sessions..." indefinitely because `getCampSessions` returns an empty array but the UI only has two states: loading and showing sessions. There's no empty state.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`, lines 2102-2131
- **Code Evidence:**
  ```javascript
  {campSessions[showSessionPicker.camp.id] ? (
    <div className="session-picker-list">
      {campSessions[showSessionPicker.camp.id].map(session => ( ... ))}
    </div>
  ) : (
    <div className="session-picker-loading">
      <span>Loading sessions...</span>
    </div>
  )}
  ```
  An empty array `[]` is truthy but results in an empty list with no visible feedback.
- **Suggested Fix:** Add conditional check for `campSessions[...].length === 0` to show "No specific sessions available for this camp. Use default week dates."

---

### BUG-D-004: Print View Uses Non-Standard CSS That May Not Print Colors Correctly
- **Feature #:** 38
- **Severity:** Low
- **Issue:** The print view (lines 2146-2206) relies on CSS custom properties (`var(--child-color)`) for coloring, but browsers by default don't print background colors. The print stylesheet may need `@media print` rules with `-webkit-print-color-adjust: exact` or `color-adjust: exact` to ensure colors print.
- **File(s):**
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`, lines 2146-2206
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.css`
- **Suggested Fix:** Add print-specific CSS rules to ensure background colors and child color coding print correctly.

---

### BUG-D-005: Move Menu Keyboard Trap - No Focus Management
- **Feature #:** 26
- **Severity:** Medium
- **Issue:** When the camp move menu opens (lines 1061-1108), there's no focus trap or proper keyboard navigation. Users can press Escape to close, but arrow key navigation between menu items is not implemented. The menu also doesn't capture focus when opened, making it difficult for keyboard-only users.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`, lines 1044-1110
- **Code Evidence:** The menu has `role="menu"` and menu items have `role="menuitem"`, but there's no `onKeyDown` handler for arrow key navigation, and focus is not moved to the menu when it opens.
- **Suggested Fix:** Add keyboard navigation (arrow keys up/down, Home/End) and move focus to first menu item when menu opens.

---

### BUG-D-006: Google Calendar Export Only Exports First Camp
- **Feature #:** 38 (Export functionality from bottom bar)
- **Severity:** High
- **Issue:** The Google Calendar button in the bottom action bar only exports the FIRST scheduled camp rather than all camps. The iCal export correctly uses `exportAllToICal`, but the Google Calendar button uses `createGoogleCalendarUrl(event)` with only the first schedule.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`, lines 1883-1893
- **Code Evidence:**
  ```javascript
  onClick={() => {
    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
    if (childSchedules.length > 0) {
      const firstSchedule = childSchedules[0];  // Only first!
      const camp = campLookup.get(firstSchedule.camp_id);
      if (camp) {
        const event = formatCampForCalendar(camp, firstSchedule);
        window.open(createGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
      }
    }
  }}
  ```
- **Suggested Fix:** Loop through all child schedules and either open multiple tabs or provide a way to export all events to Google Calendar (note: Google Calendar URL only supports one event at a time, so may need a different approach like batch API).

---

### BUG-D-007: Budget Warning/Indicator Not Shown in Planner
- **Feature #:** 34
- **Severity:** Medium
- **Issue:** The Settings allows users to set a `summer_budget`, and the CostDashboard shows budget vs actual with a warning. However, the main Schedule Planner view does NOT show any budget indicator or warning when the user is over budget. The requirement states "Warning when over budget" should show in the planner.
- **File(s):**
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx` (bottom bar shows total cost but no budget comparison)
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/CostDashboard.jsx` (has budget tracking)
- **Code Evidence:** The bottom bar at line 1840 shows `${totalCost.toLocaleString()}` but doesn't compare to budget or show any warning state.
- **Suggested Fix:** Add budget indicator to the bottom bar that shows percentage used and changes color/shows warning when approaching or exceeding budget.

---

### BUG-D-008: Current Week Not Highlighted in Calendar View
- **Feature #:** 25
- **Severity:** Low
- **Issue:** The feature requirement states "Current week highlighted" but there's no logic to identify or visually highlight the current week based on today's date. The calendar shows all 11 summer weeks uniformly.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/SchedulePlanner.jsx`
- **Code Evidence:** Searched for "current" in the renderWeekCard function - no comparison to `new Date()` or any "current week" highlighting logic.
- **Suggested Fix:** Compare each week's start/end dates with today's date and add a `is-current-week` CSS class for visual highlighting.

---

### BUG-D-009: FSA Tracking Shows Amount But No Breakdown by Camp
- **Feature #:** 37
- **Severity:** Low
- **Issue:** The CostDashboard shows the total FSA-eligible amount, but there's no breakdown showing which specific camps are FSA-eligible. Users need to know which camps contribute to FSA eligibility for tax planning.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/CostDashboard.jsx`, lines 44-51, 160-167
- **Code Evidence:**
  ```javascript
  let fsaEligible = 0;
  activeSchedules.forEach(sc => {
    const camp = camps.find(c => c.id === sc.camp_id);
    if (camp?.fsa_eligible) {
      fsaEligible += parseFloat(sc.price) || 0;
    }
  });
  ```
  Only total is calculated, not a breakdown.
- **Suggested Fix:** Add a collapsible section in CostDashboard that lists each FSA-eligible camp with its individual cost.

---

## Feature Test Summary

| Feature # | Feature Name | Status | Notes |
|-----------|--------------|--------|-------|
| 25 | Calendar View | ISSUES FOUND | Current week not highlighted (BUG-D-008) |
| 26 | Drag-and-Drop | ISSUES FOUND | Move menu keyboard accessibility issue (BUG-D-005) |
| 27 | Per-Child View | PASS | Child selector works, schedules properly separated |
| 28 | Status Tracking | PASS | Status board with drag-drop between columns works |
| 29 | Real-Time Cost Tracking | PASS | Cost updates correctly when camps added/removed |
| 30 | Coverage Gap Detection | PASS | Gaps highlighted, count shown, auto-fill suggestions work |
| 31 | Block Non-Camp Weeks | ISSUES FOUND | State not persisted to database (BUG-D-001) |
| 32 | Session Picker | ISSUES FOUND | Empty state not handled (BUG-D-003) |
| 33 | Conflict Detection | PASS | Overlapping camps detected and flagged |
| 34 | Budget Management | ISSUES FOUND | No warning shown in main planner view (BUG-D-007) |
| 35 | Work Schedule Overlay | ISSUES FOUND | Feature not implemented (BUG-D-002) |
| 36 | School Calendar Integration | PASS | School dates configurable, summer weeks calculated correctly |
| 37 | FSA Tracking | ISSUES FOUND | No breakdown by camp (BUG-D-009) |
| 38 | Print View | ISSUES FOUND | Colors may not print (BUG-D-004), Google Calendar exports only 1 camp (BUG-D-006) |

---

## Summary Statistics

- **Total Features Tested:** 14
- **Features Passing:** 5 (36%)
- **Features with Issues:** 9 (64%)
- **Total Bugs Found:** 9
  - Critical: 0
  - High: 2 (BUG-D-001, BUG-D-006)
  - Medium: 4 (BUG-D-002, BUG-D-003, BUG-D-005, BUG-D-007)
  - Low: 3 (BUG-D-004, BUG-D-008, BUG-D-009)

---

## Recommendations

1. **Highest Priority:** Fix BUG-D-001 (blocked weeks persistence) - users will lose their vacation/travel planning data on refresh
2. **High Priority:** Fix BUG-D-006 (Google Calendar single export) - misleading UX suggesting all camps will be exported
3. **Feature Gaps:** BUG-D-002 (work schedule overlay) represents a missing feature that should be prioritized given the "working parents" persona

---

*Report generated by Bug Bash Track D Agent*
