# Bug Bash Track A Report: Authentication & Onboarding

**Track:** A - Authentication & Onboarding (Features 1-5)
**Tested By:** Claude Code Agent (bug-bash-track-a)
**Date:** 2026-02-04
**Status:** Completed

---

## Summary

| Feature | Description | Status |
|---------|-------------|--------|
| Feature 1 | Google OAuth Sign-In | ISSUES FOUND |
| Feature 2 | Onboarding Wizard | ISSUES FOUND |
| Feature 3 | Profile Management | PASS (Minor Issues) |
| Feature 4 | Sample Data Option | ISSUES FOUND |
| Feature 5 | Session Persistence | PASS |

**Total Bugs Found:** 8
- Critical: 0
- High: 2
- Medium: 4
- Low: 2

---

## Bug Reports

### BUG-A-001: OAuth Error Displayed via alert() - Poor UX
- **Feature #:** 1
- **Severity:** Medium
- **Issue:** When OAuth fails, the error is displayed using `alert()` which is a poor UX pattern. The error message is shown via a browser alert dialog which blocks user interaction and looks unprofessional. This should be displayed as an inline error message or toast notification.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AuthContext.jsx` (lines 62-65)
- **Code:**
  ```javascript
  if (error || errorDescription) {
    console.error('OAuth error:', error, errorDescription);
    alert(`Sign in failed: ${errorDescription || error}`);
  }
  ```
- **Suggested Fix:** Replace `alert()` with a state-driven error display component or toast notification system. Consider adding an `authError` state that renders inline in the UI.

---

### BUG-A-002: Onboarding Wizard Missing Step 4 (Notification Preferences)
- **Feature #:** 2
- **Severity:** High
- **Issue:** The Bug Bash Plan specifies 5 steps for onboarding: (1) Welcome, (2) Add Children, (3) Category Preferences, (4) Notification Preferences, (5) Sample Data Option. However, the OnboardingWizard only has 4 steps defined. Step 4 (Notification Preferences) is missing as a dedicated step. While there is an email notification checkbox in the Preferences step, it does not match the expected dedicated notification preferences step.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/OnboardingWizard.jsx` (lines 7-12)
- **Code:**
  ```javascript
  const STEPS = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'children', title: 'Your Children' },
    { id: 'preferences', title: 'Preferences' },
    { id: 'complete', title: 'All Set!' }
  ];
  ```
- **Expected:** 5 steps including a dedicated "Notification Preferences" step
- **Suggested Fix:** Add a dedicated notification preferences step between "Preferences" and "All Set!" that allows users to configure registration alerts, price notifications, schedule notifications, etc. The NotificationPreferencesSchema in validation.js already supports extensive notification preferences.

---

### BUG-A-003: Missing Skip Button for Onboarding Steps
- **Feature #:** 2
- **Severity:** Medium
- **Issue:** The Bug Bash Plan states users should be able to "skip steps" during onboarding. However, the only skip-like behavior is on the final step where users can choose "Skip Tour, Start Planning". Individual steps cannot be skipped - the "Continue" button is disabled until children are added (children step requires at least 1 child to proceed).
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/OnboardingWizard.jsx` (lines 221-229)
- **Code:**
  ```javascript
  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'children':
        return children.length > 0;  // Forces user to add children
      case 'complete':
        return tourChoice !== null;
      default:
        return true;
    }
  };
  ```
- **Suggested Fix:** Add a "Skip" button alongside "Continue" that allows proceeding without adding children (with a warning that recommendations will be less personalized).

---

### BUG-A-004: ChildSchema Allows avatar_emoji Field But Not Validated as Emoji
- **Feature #:** 2
- **Severity:** Low
- **Issue:** The ChildSchema in validation.js does not include validation for the `avatar_emoji` field, yet this field is used extensively in the OnboardingWizard. While the ChildSchema has fields for name, birth_date, age, interests, notes, and color, it omits `avatar_emoji`. This means malicious or unexpected values could be stored.
- **File(s):**
  - `/Users/adrianstier/SB-SummerCamps-2026/src/lib/validation.js` (lines 55-65)
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/OnboardingWizard.jsx` (lines 52-58, 94-101)
- **Code (validation.js):**
  ```javascript
  export const ChildSchema = z.object({
    name: shortText,
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    age: z.number().int().min(0).max(18).optional(),
    age_as_of_summer: z.number().int().min(0).max(18).optional(),
    grade: z.string().max(20).optional(),
    interests: z.array(z.string().max(50)).max(20).optional(),
    notes: safeText.max(2000).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    is_sample: z.boolean().optional(),
    // MISSING: avatar_emoji validation
  });
  ```
- **Suggested Fix:** Add `avatar_emoji: z.string().max(10).optional()` to ChildSchema with appropriate validation.

---

### BUG-A-005: Sample Data Children Error Handling Missing
- **Feature #:** 4
- **Severity:** High
- **Issue:** In the `handleComplete` function of OnboardingWizard, when creating sample children via the tour option, if `addChild` returns data as `null` or an empty array, the code proceeds without proper handling. The check `if (data && data.length > 0)` silently skips failed insertions without notifying the user.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/components/OnboardingWizard.jsx` (lines 129-135)
- **Code:**
  ```javascript
  for (const child of sampleChildren) {
    const { data, error } = await addChild(child);
    if (error) throw new Error(error.message || 'Failed to add child');
    if (data && data.length > 0) {
      createdChildren.push(data[0]);
    }
    // Silent failure if data is null/empty but no error
  }
  ```
- **Suggested Fix:** Add explicit handling when `data` is null or empty:
  ```javascript
  if (!data || data.length === 0) {
    throw new Error('Failed to create sample child - no data returned');
  }
  ```

---

### BUG-A-006: Sample Data Not Clearly Labeled in UI After Creation
- **Feature #:** 4
- **Severity:** Medium
- **Issue:** The Bug Bash Plan specifies "Sample data is clearly labeled" but while the sampleData.js correctly adds `is_sample: true` and "(sample)" suffix to names, there is no verification that this labeling is prominently displayed in the UI after creation. The sample children have "(sample)" in their names, but scheduled camps created from sample data do not have any visual indicator.
- **File(s):**
  - `/Users/adrianstier/SB-SummerCamps-2026/src/lib/sampleData.js` (lines 14-35)
  - `/Users/adrianstier/SB-SummerCamps-2026/src/components/OnboardingWizard.jsx` (lines 141-144)
- **Suggested Fix:** Add visual indicators (badge, icon, or different styling) for sample scheduled camps in the SchedulePlanner component.

---

### BUG-A-007: No "Clear Sample Data" Functionality
- **Feature #:** 4
- **Severity:** Medium
- **Issue:** The Bug Bash Plan specifies "Can clear sample data" but there is no implementation for clearing sample data. The sampleData.js only contains generation functions (`generateSampleChildren`, `generateSampleSchedule`, `calculateSampleCost`) but no `clearSampleData` function. Users who choose the tour option have no way to remove the sample children and schedules.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/lib/sampleData.js`
- **Suggested Fix:** Add a `clearSampleData()` function that:
  1. Deletes all children where `is_sample = true`
  2. Deletes all scheduled_camps where `is_sample = true`
  3. Add a "Clear Sample Data" button in Settings or Dashboard

---

### BUG-A-008: Onboarding "New User" Detection Could Miss Users
- **Feature #:** 2
- **Severity:** Low
- **Issue:** The onboarding wizard only shows for users created within the last 10 minutes who haven't completed onboarding and have no children. If a user signs up, closes the browser immediately, and returns 15 minutes later, they won't see onboarding even though they never completed it.
- **File(s):** `/Users/adrianstier/SB-SummerCamps-2026/src/contexts/AuthContext.jsx` (lines 145-154)
- **Code:**
  ```javascript
  const isNewUser = profileData &&
    !profileData.onboarding_completed &&
    childrenData.length === 0 &&
    new Date(profileData.created_at) > new Date(Date.now() - 10 * 60 * 1000);

  if (isNewUser) {
    setShowOnboarding(true);
  }
  ```
- **Suggested Fix:** Remove the 10-minute time restriction or provide an alternative way to access onboarding. The check for `!onboarding_completed && childrenData.length === 0` should be sufficient for determining if a user needs onboarding.

---

## Features Tested - Detailed Results

### Feature 1: Google OAuth Sign-In
| Test Case | Status | Notes |
|-----------|--------|-------|
| "Sign In" button displays Google OAuth popup | PASS | Button renders correctly with Google icon |
| Successful sign-in redirects to app | PASS | Uses `window.location.origin` for redirect |
| User profile photo displays in header | PASS | Shows avatar_url or fallback initial |
| Sign out clears session | PASS | Properly clears all state |
| Sign in persists across page refresh | PASS | Uses Supabase session management |
| Error handling for OAuth failures | ISSUES | BUG-A-001: Uses alert() for errors |

### Feature 2: Onboarding Wizard
| Test Case | Status | Notes |
|-----------|--------|-------|
| New user sees onboarding wizard on first login | ISSUES | BUG-A-008: 10-minute restriction |
| Step 1: Welcome screen displays correctly | PASS | Shows personalized greeting |
| Step 2: Add children (name, age, color) | PASS | Works with emoji picker and color selection |
| Step 3: Select category preferences (12 categories) | PASS | 12 categories available |
| Step 4: Notification preferences | MISSING | BUG-A-002: No dedicated step |
| Step 5: Sample data option works | PASS | Tour option available on final step |
| Can skip steps | ISSUES | BUG-A-003: Cannot skip children step |
| Progress indicator updates | PASS | Visual step indicators update |
| Completion saves to database | PASS | Calls completeOnboarding() |

### Feature 3: Profile Management
| Test Case | Status | Notes |
|-----------|--------|-------|
| Profile data loads on sign-in | PASS | Loaded via loadUserData() |
| Can update display name | PASS | full_name in allowlist |
| Can update avatar | PASS | avatar_url in allowlist |
| Changes persist after refresh | PASS | Updates saved to Supabase |

### Feature 4: Sample Data Option
| Test Case | Status | Notes |
|-----------|--------|-------|
| "Add sample data" creates demo children | ISSUES | BUG-A-005: Missing error handling |
| Sample schedule gets created | PASS | generateSampleSchedule() works |
| Sample data is clearly labeled | ISSUES | BUG-A-006: Camps not labeled |
| Can clear sample data | MISSING | BUG-A-007: No clear function |

### Feature 5: Session Persistence
| Test Case | Status | Notes |
|-----------|--------|-------|
| Closing browser maintains session | PASS | Supabase handles persistence |
| Session survives page refresh | PASS | getSession() called on mount |
| Token refresh works for long sessions | PASS | onAuthStateChange handles this |

---

## Code Quality Observations

### Strengths
1. **Good security practices**: Profile updates use an allowlist of safe fields
2. **Proper validation**: Zod schemas validate child data
3. **Clean state management**: AuthContext provides centralized auth state
4. **Accessibility**: ARIA labels present on interactive elements
5. **Error boundaries**: ErrorBoundary component available for catching React errors

### Areas for Improvement
1. Error display should use UI components instead of alert()
2. Sample data management needs clear data functionality
3. Onboarding step count doesn't match specification
4. Some validation schemas missing fields used in UI

---

## Recommendations

### Priority 1 (High)
1. Fix BUG-A-002: Add notification preferences step to onboarding
2. Fix BUG-A-005: Add proper error handling for sample data creation
3. Fix BUG-A-007: Implement clear sample data functionality

### Priority 2 (Medium)
1. Fix BUG-A-001: Replace alert() with proper error UI
2. Fix BUG-A-003: Add skip option for onboarding steps
3. Fix BUG-A-006: Add visual indicators for sample scheduled camps

### Priority 3 (Low)
1. Fix BUG-A-004: Add avatar_emoji validation to ChildSchema
2. Fix BUG-A-008: Remove or relax 10-minute onboarding restriction

---

*Report generated by Claude Code Bug Bash Agent - Track A*
