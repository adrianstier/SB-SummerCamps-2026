# Bug Bash Plan — Santa Barbara Summer Camps 2026

**Created:** 2026-02-04
**Status:** Ready for Execution
**Total Features:** 111
**Estimated Agents:** 8 parallel tracks

---

## Overview

Systematic testing of all 111 features across the application. Each track can be executed by a separate Claude Code instance in parallel.

### Execution Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      BUG BASH COORDINATOR                        │
│                    (Main Claude Instance)                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──► Track A: Auth & Onboarding (Features 1-5)
         ├──► Track B: Camp Discovery & Details (Features 6-16)
         ├──► Track C: Favorites & Children (Features 17-24)
         ├──► Track D: Schedule Planning (Features 25-38)
         ├──► Track E: Export, Recommendations, Dashboard (Features 39-51)
         ├──► Track F: Gamification & Social (Features 52-65)
         ├──► Track G: Family, Notifications, Settings (Features 66-87)
         └──► Track H: Admin, PWA, UX, Technical (Features 88-111)
```

---

## Pre-Requisites

### Environment Setup
```bash
# 1. Start local dev server
cd /Users/adrianstier/SB-SummerCamps-2026
npm run dev

# 2. Verify Supabase connection
# Check .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Open browser to http://localhost:5173
```

### Test Accounts Needed
- **Regular User:** Google OAuth test account
- **Admin User:** Account with admin role in Supabase
- **Second User:** For squad/family collaboration testing

---

## Bug Report Template

For each bug found, create an entry in this format:

```markdown
### BUG-XXX: [Brief Title]
- **Feature #:** [number]
- **Severity:** Critical / High / Medium / Low
- **Steps to Reproduce:**
  1. Step one
  2. Step two
- **Expected:** What should happen
- **Actual:** What actually happens
- **Screenshot/Error:** [if applicable]
- **File(s):** [relevant source files]
```

---

## Track A: Authentication & Onboarding (Features 1-5)

**Agent Assignment:** `bug-bash-track-a`
**Estimated Time:** 30 minutes
**Dependencies:** None (start first)

### Feature 1: Google OAuth Sign-In
- [ ] Click "Sign In" button displays Google OAuth popup
- [ ] Successful sign-in redirects to app
- [ ] User profile photo displays in header
- [ ] Sign out clears session
- [ ] Sign in persists across page refresh
- [ ] Error handling for OAuth failures
- [ ] **Files:** `src/components/AuthButton.jsx`, `src/contexts/AuthContext.jsx`

### Feature 2: Onboarding Wizard
- [ ] New user sees onboarding wizard on first login
- [ ] Step 1: Welcome screen displays correctly
- [ ] Step 2: Add children (name, age, color)
- [ ] Step 3: Select category preferences (12 categories)
- [ ] Step 4: Notification preferences
- [ ] Step 5: Sample data option works
- [ ] Can skip steps
- [ ] Progress indicator updates
- [ ] Completion saves to database
- [ ] **Files:** `src/components/OnboardingWizard.jsx`

### Feature 3: Profile Management
- [ ] Profile data loads on sign-in
- [ ] Can update display name
- [ ] Can update avatar
- [ ] Changes persist after refresh
- [ ] **Files:** `src/contexts/AuthContext.jsx`, `src/lib/supabase.js`

### Feature 4: Sample Data Option
- [ ] "Add sample data" creates demo children
- [ ] Sample schedule gets created
- [ ] Sample data is clearly labeled
- [ ] Can clear sample data
- [ ] **Files:** `src/lib/sampleData.js`

### Feature 5: Session Persistence
- [ ] Closing browser maintains session
- [ ] Session survives page refresh
- [ ] Token refresh works for long sessions
- [ ] **Files:** `src/contexts/AuthContext.jsx`

---

## Track B: Camp Discovery & Details (Features 6-16)

**Agent Assignment:** `bug-bash-track-b`
**Estimated Time:** 45 minutes
**Dependencies:** Track A (need signed-in user)

### Feature 6: Camp Listing
- [ ] All 46 camps display
- [ ] Camp cards show: name, category, price, age range
- [ ] Images load (or fallback displays)
- [ ] Cards are clickable
- [ ] Responsive grid layout (mobile/tablet/desktop)
- [ ] **Files:** `src/App.jsx`

### Feature 7: Advanced Filtering
- [ ] Category filter works (single select)
- [ ] Category filter works (multi-select)
- [ ] Age range slider filters correctly
- [ ] Price range slider filters correctly
- [ ] Extended care toggle filters
- [ ] Food included toggle filters
- [ ] Transportation toggle filters
- [ ] Sibling discount toggle filters
- [ ] Registration status filter (open/closed)
- [ ] Location/distance filter works
- [ ] Clear filters button resets all
- [ ] Filter count badge updates
- [ ] **Files:** `src/components/AdvancedFilters.jsx`, `src/hooks/useFilters.js`

### Feature 8: Filter Presets
- [ ] "Working parents" preset applies correct filters
- [ ] "Budget-friendly" preset works
- [ ] "Beach lovers" preset works
- [ ] "STEM lovers" preset works
- [ ] Preset selection updates filter UI
- [ ] **Files:** `src/components/AdvancedFilters.jsx`

### Feature 9: Full-Text Search
- [ ] Search by camp name works
- [ ] Search by description works
- [ ] Search is case-insensitive
- [ ] Clear search button works
- [ ] No results state displays
- [ ] Search + filters combine correctly
- [ ] **Files:** `src/App.jsx`

### Feature 10: Camp Comparison
- [ ] Can add camps to comparison (checkbox)
- [ ] Comparison bar appears with count
- [ ] Can add up to 6 camps
- [ ] "Compare" button opens comparison view
- [ ] Side-by-side comparison displays all fields
- [ ] Can remove camps from comparison
- [ ] Close comparison returns to list
- [ ] **Files:** `src/components/CampComparison.jsx`

### Feature 11: Camp Insights
- [ ] Insights panel opens
- [ ] Category breakdown chart displays
- [ ] Price distribution shows
- [ ] Age distribution shows
- [ ] Hours distribution shows
- [ ] Availability stats accurate
- [ ] Map view displays camp locations
- [ ] **Files:** `src/components/CampInsights.jsx`

### Feature 12: Swipeable Camp Cards
- [ ] Swipe right saves to favorites
- [ ] Swipe left dismisses
- [ ] Swipe animation is smooth
- [ ] Card stack updates after swipe
- [ ] Works on touch devices
- [ ] **Files:** `src/components/SwipeableCampCard.jsx`

### Feature 13: Detail Modal
- [ ] Click camp card opens modal
- [ ] All camp info displays correctly
- [ ] Image displays (or fallback)
- [ ] Website link opens in new tab
- [ ] Contact info (email, phone) displays
- [ ] Close button works
- [ ] Click outside closes modal
- [ ] Escape key closes modal
- [ ] **Files:** `src/App.jsx`

### Feature 14: Reviews & Ratings
- [ ] Reviews section displays in modal
- [ ] Can submit a new review
- [ ] Star rating selector works (1-5)
- [ ] Review text submits correctly
- [ ] Reviews display with author, date, rating
- [ ] Can mark review as helpful
- [ ] Average rating calculates correctly
- [ ] **Files:** `src/components/Reviews.jsx`

### Feature 15: Rating Summary
- [ ] Rating distribution chart shows
- [ ] Breakdown by category displays
- [ ] Percentages are accurate
- [ ] **Files:** `src/components/Reviews.jsx`

### Feature 16: Registration Status
- [ ] "Registration Open" badge shows for open camps
- [ ] "Registration Closed" shows for closed
- [ ] Early bird deadline displays
- [ ] Registration dates accurate
- [ ] **Files:** `src/lib/supabase.js`

---

## Track C: Favorites & Children (Features 17-24)

**Agent Assignment:** `bug-bash-track-c`
**Estimated Time:** 30 minutes
**Dependencies:** Track A

### Feature 17: Favorites (Heart Toggle)
- [ ] Heart icon displays on camp cards
- [ ] Click toggles favorite state
- [ ] Heart fills when favorited
- [ ] Favorite persists after refresh
- [ ] Can unfavorite
- [ ] **Files:** `src/components/FavoriteButton.jsx`

### Feature 18: Wishlist View
- [ ] Navigate to Wishlist tab/view
- [ ] All favorited camps display
- [ ] Can sort by name
- [ ] Can sort by price
- [ ] Can sort by registration status
- [ ] Empty state shows when no favorites
- [ ] **Files:** `src/components/Wishlist.jsx`

### Feature 19: Per-Child Favorites
- [ ] Can assign favorite to specific child
- [ ] Filter wishlist by child
- [ ] "All children" view shows all
- [ ] **Files:** `src/components/Wishlist.jsx`

### Feature 20: Wishlist Notes
- [ ] Can add note to favorited camp
- [ ] Note persists after refresh
- [ ] Can edit note
- [ ] Can delete note
- [ ] **Files:** `src/components/Wishlist.jsx`

### Feature 21: Children Manager
- [ ] Navigate to children management
- [ ] Can add new child
- [ ] Name field required
- [ ] Age field validates (reasonable range)
- [ ] Can edit existing child
- [ ] Can delete child (with confirmation)
- [ ] Changes persist after refresh
- [ ] **Files:** `src/components/ChildrenManager.jsx`

### Feature 22: Color Coding
- [ ] Color picker displays 6 options
- [ ] Selected color applies to child
- [ ] Color shows in schedule planner
- [ ] Color shows in wishlist
- [ ] **Files:** `src/components/ChildrenManager.jsx`

### Feature 23: Age-as-of-Summer
- [ ] Age calculated as of summer start
- [ ] Updates when birthdate changed
- [ ] Used correctly in age filtering
- [ ] **Files:** `src/components/ChildrenManager.jsx`

### Feature 24: Interest Tracking
- [ ] 12 category checkboxes in onboarding
- [ ] Interests saved to profile
- [ ] Interests used in recommendations
- [ ] Can update interests in settings
- [ ] **Files:** `src/components/OnboardingWizard.jsx`

---

## Track D: Schedule Planning (Features 25-38)

**Agent Assignment:** `bug-bash-track-d`
**Estimated Time:** 60 minutes
**Dependencies:** Track A, Track C (need children)

### Feature 25: Calendar View
- [ ] 11-week calendar displays (Jun 8 - Aug 21)
- [ ] Week headers show dates
- [ ] Grid layout is responsive
- [ ] Current week highlighted
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 26: Drag-and-Drop
- [ ] Can drag camp from sidebar
- [ ] Drop zone highlights on hover
- [ ] Camp appears in dropped week
- [ ] Visual feedback during drag
- [ ] Can drag to reposition
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 27: Per-Child View
- [ ] Child selector displays all children
- [ ] Switching child shows their schedule
- [ ] "All children" view combines schedules
- [ ] Child color coding visible
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 28: Status Tracking
- [ ] Default status is "Planned"
- [ ] Can change to "Registered"
- [ ] Can change to "Confirmed"
- [ ] Can change to "Waitlisted"
- [ ] Can change to "Cancelled"
- [ ] Status badge displays correctly
- [ ] Status persists after refresh
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 29: Real-Time Cost Tracking
- [ ] Total cost displays
- [ ] Updates when camp added
- [ ] Updates when camp removed
- [ ] Per-child totals accurate
- [ ] **Files:** `src/components/SchedulePlanner.jsx`, `src/components/CostDashboard.jsx`

### Feature 30: Coverage Gap Detection
- [ ] Gaps highlighted visually
- [ ] Gap count displayed
- [ ] Gap alert/warning shows
- [ ] Clicking gap suggests camps
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 31: Block Non-Camp Weeks
- [ ] Can mark week as "Vacation"
- [ ] Can mark as "Family time"
- [ ] Can mark as "Travel"
- [ ] Can mark as "Other"
- [ ] Blocked weeks not counted as gaps
- [ ] Can unblock week
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 32: Session Picker
- [ ] Camps with multiple sessions show picker
- [ ] Can select specific session dates
- [ ] Session themes display
- [ ] Selected session saves correctly
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 33: Conflict Detection
- [ ] Warning for overlapping camps
- [ ] Warning for same week different times
- [ ] Can proceed despite warning
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 34: Budget Management
- [ ] Can set budget in settings
- [ ] Budget displays in planner
- [ ] Warning when over budget
- [ ] Percentage used shows
- [ ] **Files:** `src/components/Settings.jsx`, `src/components/CostDashboard.jsx`

### Feature 35: Work Schedule Overlay
- [ ] Can set work hours in settings
- [ ] Camps not covering work hours flagged
- [ ] Coverage indicator shows
- [ ] **Files:** `src/components/Settings.jsx`, `src/lib/supabase.js`

### Feature 36: School Calendar Integration
- [ ] School selector in settings
- [ ] Pre-set schools load correct dates
- [ ] Custom dates option works
- [ ] Summer dates update accordingly
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 37: FSA Tracking
- [ ] FSA-eligible camps marked
- [ ] FSA total calculated
- [ ] FSA breakdown in cost dashboard
- [ ] **Files:** `src/components/CostDashboard.jsx`

### Feature 38: Print View
- [ ] Print button available
- [ ] Print layout is clean
- [ ] All schedule info included
- [ ] Colors print correctly
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

---

## Track E: Export, Recommendations, Dashboard (Features 39-51)

**Agent Assignment:** `bug-bash-track-e`
**Estimated Time:** 45 minutes
**Dependencies:** Track D (need scheduled camps)

### Feature 39: Google Calendar Export
- [ ] Export button available
- [ ] Opens Google Calendar auth (if needed)
- [ ] Events created in calendar
- [ ] Event details correct (name, dates, location)
- [ ] **Files:** `src/lib/googleCalendar.js`

### Feature 40: iCal Export
- [ ] Download .ics button available
- [ ] File downloads successfully
- [ ] File opens in calendar apps
- [ ] Events are correct
- [ ] **Files:** `src/lib/googleCalendar.js`

### Feature 41: Shareable Summer Card
- [ ] Generate card button works
- [ ] 5 theme options available
- [ ] Card shows schedule summary
- [ ] Achievement badges display
- [ ] Top categories shown
- [ ] Stats accurate
- [ ] Can download as image
- [ ] **Files:** `src/components/ShareableSummerCard.jsx`

### Feature 42: Share Schedule Link
- [ ] Generate link button works
- [ ] Link is copyable
- [ ] Link opens read-only view
- [ ] Shared view shows correct data
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 43: Personalized Recommendations
- [ ] Recommendations section displays
- [ ] Recommendations match child's age
- [ ] Recommendations match interests
- [ ] Recommendations fit budget
- [ ] Score/reasoning shown
- [ ] **Files:** `src/lib/recommendations.js`, `src/components/RecommendationSection.jsx`

### Feature 44: Gap-Filling Suggestions
- [ ] Suggestions appear for gap weeks
- [ ] Suggestions are age-appropriate
- [ ] Can add suggested camp directly
- [ ] **Files:** `src/lib/recommendations.js`

### Feature 45: Popular/Trending Camps
- [ ] Trending section displays
- [ ] Based on actual usage data
- [ ] Updates periodically
- [ ] **Files:** `src/lib/recommendations.js`

### Feature 46: Similar Camps
- [ ] "Similar camps" shown in detail view
- [ ] Similarity based on category/age/price
- [ ] Can navigate to similar camp
- [ ] **Files:** `src/lib/recommendations.js`

### Feature 47: Personalized Homepage
- [ ] Homepage shows relevant camps first
- [ ] Based on preferences and history
- [ ] Updates as preferences change
- [ ] **Files:** `src/App.jsx`

### Feature 48: Dashboard Home
- [ ] Dashboard displays on login
- [ ] Greeting with user name
- [ ] **Files:** `src/components/Dashboard.jsx`

### Feature 49: Quick Stats
- [ ] Children count accurate
- [ ] Camps scheduled count accurate
- [ ] Total cost accurate
- [ ] Gaps count accurate
- [ ] **Files:** `src/components/Dashboard.jsx`

### Feature 50: Upcoming Preview
- [ ] Next 3 camps displayed
- [ ] Sorted by date
- [ ] Shows camp name and date
- [ ] Click navigates to schedule
- [ ] **Files:** `src/components/Dashboard.jsx`

### Feature 51: Recommendation Cards
- [ ] 4 recommendations displayed
- [ ] Cards show camp info
- [ ] Can favorite from card
- [ ] Can view details from card
- [ ] **Files:** `src/components/Dashboard.jsx`

---

## Track F: Gamification & Social (Features 52-65)

**Agent Assignment:** `bug-bash-track-f`
**Estimated Time:** 45 minutes
**Dependencies:** Track D (need scheduled camps for achievements)

### Feature 52: Achievement System
- [ ] Achievements section accessible
- [ ] Unlocked achievements display
- [ ] Locked achievements show (grayed)
- [ ] Total count accurate
- [ ] **Files:** `src/contexts/AchievementsContext.jsx`, `src/components/AchievementBadges.jsx`

### Feature 53: Achievement Types
- [ ] Milestone achievements work (First Camp, Week Covered, etc.)
- [ ] Planning achievements work (Multi-Child, Variety Seeker, etc.)
- [ ] Timing achievements work (Early Bird)
- [ ] Engagement achievements work (Favorite Five, Comparison Pro)
- [ ] Streak achievements work (3-day, 7-day)
- [ ] **Files:** `src/contexts/AchievementsContext.jsx`

### Feature 54: Badge Display
- [ ] Badges have icons
- [ ] Badges have names
- [ ] Celebration message on unlock
- [ ] **Files:** `src/components/AchievementBadges.jsx`

### Feature 55: Streak Tracking
- [ ] Current streak displays
- [ ] Streak increments daily with activity
- [ ] Streak resets after missed day
- [ ] Best streak tracked
- [ ] **Files:** `src/contexts/AchievementsContext.jsx`

### Feature 56: Progress Tracker
- [ ] Coverage percentage accurate
- [ ] Progress bar fills correctly
- [ ] Milestone markers show
- [ ] Updates in real-time
- [ ] **Files:** `src/components/ProgressTracker.jsx`

### Feature 57: Planning Tips
- [ ] Tips display in planner
- [ ] Can navigate between tips
- [ ] Tips are contextually relevant
- [ ] Can dismiss tips
- [ ] **Files:** `src/components/PlanningTips.jsx`

### Feature 58: Squads (Groups)
- [ ] Squads panel accessible
- [ ] Can view existing squads
- [ ] Squad count shows
- [ ] **Files:** `src/components/SquadsPanel.jsx`

### Feature 59: Squad Creation
- [ ] "Create Squad" button works
- [ ] Name field required
- [ ] Description optional
- [ ] Privacy settings available
- [ ] Squad created successfully
- [ ] **Files:** `src/components/CreateSquadModal.jsx`

### Feature 60: Join via Code
- [ ] "Join Squad" option available
- [ ] Can enter invite code
- [ ] Invalid code shows error
- [ ] Valid code joins squad
- [ ] **Files:** `src/components/JoinSquad.jsx`

### Feature 61: Member Management
- [ ] Member list displays
- [ ] Can see member roles
- [ ] Can invite more members
- [ ] Owner can remove members
- [ ] **Files:** `src/components/SquadDetail.jsx`

### Feature 62: Looking for Friends
- [ ] Toggle available in settings/planner
- [ ] Status visible to squad members
- [ ] Can turn off
- [ ] **Files:** `src/components/SchedulePlanner.jsx`

### Feature 63: Schedule Visibility
- [ ] Can control visibility per squad
- [ ] "Share schedule" toggle works
- [ ] Hidden schedules not visible to others
- [ ] **Files:** `src/components/JoinSquad.jsx`

### Feature 64: Squad Notifications
- [ ] Notifications for new members
- [ ] Notifications for schedule changes
- [ ] Can configure in settings
- [ ] **Files:** `src/components/SquadNotificationBell.jsx`

### Feature 65: Friend Matching
- [ ] Notified when friend at same camp
- [ ] Match shows in notifications
- [ ] Can view friend's profile
- [ ] **Files:** `src/lib/supabase.js`

---

## Track G: Family, Notifications, Settings (Features 66-87)

**Agent Assignment:** `bug-bash-track-g`
**Estimated Time:** 60 minutes
**Dependencies:** Track A, second test user for collaboration

### Feature 66: Family Workspace
- [ ] Family workspace tab accessible
- [ ] Shows all family members
- [ ] Real-time updates work
- [ ] **Files:** `src/components/FamilyWorkspace.jsx`

### Feature 67: Activity Feed
- [ ] Feed displays recent activity
- [ ] Shows who did what
- [ ] Timestamps accurate
- [ ] Updates in real-time
- [ ] **Files:** `src/components/FamilyActivityFeed.jsx`

### Feature 68: Comments
- [ ] Can add comment
- [ ] Comments display with author
- [ ] Can delete own comment
- [ ] Threading works (if applicable)
- [ ] **Files:** `src/components/FamilyComments.jsx`

### Feature 69: Camp Suggestions
- [ ] Can suggest camp to family member
- [ ] Suggestion appears in their view
- [ ] Can approve suggestion
- [ ] Can reject suggestion
- [ ] **Files:** `src/components/FamilySuggestions.jsx`

### Feature 70: Approval Requests
- [ ] Can request approval
- [ ] Request shows to approvers
- [ ] Can approve request
- [ ] Can reject with comment
- [ ] Status updates correctly
- [ ] **Files:** `src/components/FamilyApprovals.jsx`

### Feature 71: Family Notifications
- [ ] Notified of comments
- [ ] Notified of suggestions
- [ ] Notified of approvals
- [ ] Real-time delivery
- [ ] **Files:** `src/contexts/FamilyContext.jsx`

### Feature 72: Member Invitations
- [ ] Can invite by email
- [ ] Invite code generated
- [ ] Invited user can join
- [ ] Permissions set correctly
- [ ] **Files:** `src/components/FamilyWorkspace.jsx`

### Feature 73: Registration Notifications
- [ ] Notified when registration opens
- [ ] Notified of early bird deadlines
- [ ] Notified before registration closes
- [ ] **Files:** `src/lib/supabase.js`

### Feature 74: Pricing Notifications
- [ ] Notified of price drops
- [ ] Budget warning notifications
- [ ] Early bird deadline reminders
- [ ] **Files:** `src/lib/supabase.js`

### Feature 75: Availability Notifications
- [ ] Notified of spots available
- [ ] Waitlist updates
- [ ] Session filling warnings
- [ ] **Files:** `src/lib/supabase.js`

### Feature 76: Schedule Notifications
- [ ] Schedule reminders work
- [ ] Conflict alerts work
- [ ] Coverage gap reminders
- [ ] **Files:** `src/lib/supabase.js`

### Feature 77: Social Notifications
- [ ] Friend activity notifications
- [ ] Friend match notifications
- [ ] Squad activity notifications
- [ ] **Files:** `src/lib/supabase.js`

### Feature 78: Content Notifications
- [ ] New camp match notifications
- [ ] Camp update notifications
- [ ] Review reply notifications
- [ ] **Files:** `src/lib/supabase.js`

### Feature 79: System Notifications
- [ ] Weekly digest works
- [ ] System announcements display
- [ ] **Files:** `src/lib/supabase.js`

### Feature 80: Notification Bell
- [ ] Bell icon displays
- [ ] Unread count badge shows
- [ ] Dropdown lists notifications
- [ ] Can filter by category
- [ ] **Files:** `src/components/NotificationBell.jsx`

### Feature 81: Notification Preferences
- [ ] Can toggle email notifications
- [ ] Can toggle push notifications
- [ ] Per-category settings
- [ ] Frequency options
- [ ] Settings persist
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 82: Notification Dismissal
- [ ] Can dismiss individual notification
- [ ] "Dismiss all" works
- [ ] Dismissed notifications don't reappear
- [ ] **Files:** `src/lib/supabase.js`

### Feature 83: User Settings Panel
- [ ] Settings accessible from menu
- [ ] Tabs work (school, work, budget, notifications)
- [ ] Changes save correctly
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 84: School Calendar Config
- [ ] School dropdown works
- [ ] Dates populate correctly
- [ ] Custom dates option works
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 85: Work Hours Setting
- [ ] Start time picker works
- [ ] End time picker works
- [ ] Saves correctly
- [ ] Used in coverage checking
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 86: Budget Configuration
- [ ] Can enter budget amount
- [ ] Validates input
- [ ] Saves correctly
- [ ] Shows in dashboard/planner
- [ ] **Files:** `src/components/Settings.jsx`

### Feature 87: Notification Preferences
- [ ] Email toggle per category
- [ ] Push toggle per category
- [ ] Frequency selector works
- [ ] **Files:** `src/components/Settings.jsx`

---

## Track H: Admin, PWA, UX, Technical (Features 88-111)

**Agent Assignment:** `bug-bash-track-h`
**Estimated Time:** 60 minutes
**Dependencies:** Admin account, mobile device/emulator

### Feature 88: Admin Dashboard
- [ ] Admin-only access enforced
- [ ] Dashboard loads for admin
- [ ] Regular user cannot access
- [ ] **Files:** `src/components/AdminDashboard.jsx`

### Feature 89: Admin Statistics
- [ ] User count accurate
- [ ] Review count accurate
- [ ] Children count accurate
- [ ] Camp count accurate
- [ ] Scheduled camps count accurate
- [ ] **Files:** `src/components/AdminDashboard.jsx`

### Feature 90: User Management
- [ ] User list displays
- [ ] Can search users
- [ ] Can view user details
- [ ] Can change user role
- [ ] **Files:** `src/components/AdminDashboard.jsx`

### Feature 91: Review Moderation
- [ ] Pending reviews list
- [ ] Can approve review
- [ ] Can reject review
- [ ] Flagged reviews highlighted
- [ ] **Files:** `src/components/AdminDashboard.jsx`

### Feature 92: Content Reporting
- [ ] Reported content displays
- [ ] Can resolve report
- [ ] Can take action (delete, warn)
- [ ] **Files:** `src/components/AdminDashboard.jsx`

### Feature 93: Mobile Navigation
- [ ] Bottom tabs display on mobile
- [ ] All tabs work (Browse, Schedule, Dashboard, Wishlist, More)
- [ ] Active tab highlighted
- [ ] **Files:** `src/components/MobileNav.jsx`

### Feature 94: Install to Home Screen
- [ ] Install prompt appears (iOS/Android)
- [ ] Can add to home screen
- [ ] App opens from home screen icon
- [ ] **Files:** `src/hooks/usePWA.js`

### Feature 95: Offline Support
- [ ] App loads when offline
- [ ] Cached data displays
- [ ] Offline indicator shows
- [ ] Syncs when back online
- [ ] **Files:** `public/sw.js`

### Feature 96: Online/Offline Indicator
- [ ] Shows when offline
- [ ] Hides when online
- [ ] Updates in real-time
- [ ] **Files:** `src/components/MobileNav.jsx`

### Feature 97: Pull-to-Refresh
- [ ] Pull gesture detected
- [ ] Loading indicator shows
- [ ] Data refreshes
- [ ] Works on all views
- [ ] **Files:** `src/hooks/usePWA.js`

### Feature 98: Haptic Feedback
- [ ] Vibration on key actions
- [ ] Works on supported devices
- [ ] Doesn't error on unsupported
- [ ] **Files:** `src/hooks/usePWA.js`

### Feature 99: Update Toast
- [ ] Shows when update available
- [ ] Can refresh to update
- [ ] Can dismiss
- [ ] **Files:** `src/components/MobileNav.jsx`

### Feature 100: Guided Tour
- [ ] Tour starts for new users
- [ ] Steps progress correctly
- [ ] Highlights correct elements
- [ ] Can skip tour
- [ ] Can restart tour
- [ ] **Files:** `src/components/GuidedTour.jsx`

### Feature 101: Confetti Animation
- [ ] Confetti on achievement unlock
- [ ] Animation smooth
- [ ] Doesn't block interaction
- [ ] **Files:** `src/components/Confetti.jsx`

### Feature 102: Error Boundary
- [ ] Catches React errors
- [ ] Displays friendly error message
- [ ] Offers retry/refresh option
- [ ] Logs error details
- [ ] **Files:** `src/components/ErrorBoundary.jsx`

### Feature 103: Loading States
- [ ] Spinners display during load
- [ ] Skeleton placeholders (if used)
- [ ] Loading doesn't flash
- [ ] **Files:** Throughout app

### Feature 104: Empty States
- [ ] "No camps found" message
- [ ] "No favorites" message
- [ ] "No scheduled camps" message
- [ ] Helpful CTAs in empty states
- [ ] **Files:** Throughout app

### Feature 105: Input Validation
- [ ] Invalid inputs show errors
- [ ] Error messages are helpful
- [ ] Can correct and resubmit
- [ ] **Files:** `src/lib/validation.js`

### Feature 106: Data Sanitization
- [ ] XSS attempts blocked
- [ ] HTML stripped from inputs
- [ ] Special characters handled
- [ ] **Files:** `src/lib/validation.js`

### Feature 107: Row Level Security
- [ ] Users can only see their data
- [ ] Cannot access other user's children
- [ ] Cannot access other user's schedules
- [ ] Admin can access all
- [ ] **Files:** `supabase/schema.sql`, `supabase/migrations/`

### Feature 108: URL Validation
- [ ] External links validated
- [ ] No javascript: URLs
- [ ] Links open safely
- [ ] **Files:** `src/App.jsx`

### Feature 109: Real-Time Subscriptions
- [ ] Family activity updates live
- [ ] Notifications arrive in real-time
- [ ] Squad changes update live
- [ ] **Files:** `src/contexts/FamilyContext.jsx`

### Feature 110: Lazy Loading
- [ ] Modals load on demand
- [ ] Heavy components deferred
- [ ] Initial load is fast
- [ ] **Files:** `src/App.jsx`

### Feature 111: Error Handling
- [ ] API errors handled gracefully
- [ ] Network errors show message
- [ ] Errors logged to console
- [ ] User-friendly error messages
- [ ] **Files:** `src/lib/errorHandler.js`

---

## Execution Instructions

### For Each Track Agent

1. **Start the dev server** if not running:
   ```bash
   cd /Users/adrianstier/SB-SummerCamps-2026
   npm run dev
   ```

2. **Open browser** to http://localhost:5173

3. **Sign in** with test account

4. **Work through checklist** for your assigned track

5. **Document bugs** using the template above

6. **Create bug report file** when done:
   ```
   docs/bugs/BUG_BASH_TRACK_[X]_REPORT.md
   ```

### Parallel Execution

Each track can run independently after Track A completes (auth setup). Suggested parallelization:

```
Time 0:   Track A starts (Auth)
Time 30m: Track A done → Tracks B, C, F, G, H start
Time 45m: Track C done → Track D starts
Time 60m: Track D done → Track E starts
Time 90m: All tracks complete
```

### Final Consolidation

After all tracks complete, coordinator should:

1. Merge all bug reports into `docs/bugs/BUG_BASH_CONSOLIDATED.md`
2. Prioritize by severity
3. Create GitHub issues for Critical/High bugs
4. Update this plan with completion status

---

## Bug Severity Guide

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | App unusable, data loss | Sign-in broken, data not saving |
| **High** | Major feature broken | Schedule planner won't load |
| **Medium** | Feature partially broken | Filter doesn't reset properly |
| **Low** | Minor issue, cosmetic | Alignment off on mobile |

---

## Completion Checklist

- [x] Track A: Auth & Onboarding (8 bugs found)
- [x] Track B: Camp Discovery & Details (12 bugs found)
- [x] Track C: Favorites & Children (5 bugs found)
- [x] Track D: Schedule Planning (9 bugs found)
- [x] Track E: Export, Recommendations, Dashboard (9 bugs found)
- [x] Track F: Gamification & Social (22 bugs found)
- [x] Track G: Family, Notifications, Settings (11 bugs found)
- [x] Track H: Admin, PWA, UX, Technical (7 bugs found)
- [x] Bug reports consolidated (see `docs/bugs/CONSOLIDATED_REPORT.md`)
- [x] Critical bugs triaged (0 Critical, 13 High severity)
- [x] GitHub issues created (9 issues for High severity bugs)

**Total Bugs Found: 83**
- Critical: 0
- High: 13
- Medium: 37
- Low: 33

**GitHub Issues Created:**
- #1: BUG-A-002 - Onboarding Missing Notification Step
- #2: BUG-A-005 - Sample Data Error Handling
- #3: BUG-B-001 - Camp Comparison Limit Mismatch
- #4: BUG-C-002 - No UI for Per-Child Favorites
- #5: BUG-D-001 - Blocked Weeks Not Persisted
- #6: BUG-D-006 - Google Calendar Single Export
- #7: BUG-E-005 - Share Link Non-Routable
- #8: BUG-F-011 - Squad Member Removal UI Missing
- #9: BUG-F-017/F-018 - Gamification Components Not Visible

---

*Bug Bash Completed: 2026-02-04*
*Plan created by Claude Code Bug Bash Orchestrator*
