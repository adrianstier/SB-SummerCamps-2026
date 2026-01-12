# Implementation Checklist

Quick-reference checklist for development. See [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) for full requirements.

**Last Updated**: January 11, 2026
**Current Phase**: Phase 1.5 (Critical Gaps)

## Documentation Status

| Document | Status | Owner |
|----------|--------|-------|
| [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) | ✅ Complete | Project Manager |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | ✅ Complete | Business Analyst |
| [COMPONENT_SPECS.md](./COMPONENT_SPECS.md) | ✅ Complete | Project Manager |
| [UX_DESIGN_SPECS.md](./UX_DESIGN_SPECS.md) | ✅ Complete | UX Engineer |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) | ✅ Complete | Tech Lead |
| Database Migration | ✅ Ready | Tech Lead |

---

## Already Built (Reference)

### Core Features - Complete
- [x] Google OAuth authentication
- [x] User profiles with preferences
- [x] Multi-child family management (name, age, interests, allergies, colors)
- [x] Camp database (43+ camps)
- [x] Search and filter (category, age, price, features)
- [x] Visual summer calendar (11 weeks, June 8 - Aug 21)
- [x] Drag-and-drop scheduling
- [x] Multi-child calendar views (per-child and overlay)
- [x] Coverage gap detection
- [x] Block weeks (vacation, family, travel)
- [x] Camp status tracking (planned → registered → confirmed)
- [x] Cost calculation (total and per-week)
- [x] Favorites/hearts
- [x] Side-by-side camp comparison
- [x] Community reviews (5-dimension ratings)
- [x] Q&A feature
- [x] Squads (parent coordination groups)
- [x] "Looking for friends" feature
- [x] Onboarding wizard with sample data
- [x] Admin dashboard

### Database Tables - Exist
- [x] profiles, children, camps, camp_sessions (empty), scheduled_camps
- [x] favorites, reviews, review_helpful_votes
- [x] camp_questions, camp_answers
- [x] notifications, camp_watchlist, comparison_lists
- [x] squads, squad_members, squad_notifications, camp_interests
- [x] camp_edits, reported_content

---

## Phase 1: MVP Enhancements ✅ COMPLETE

### 1.1 School Date Configuration ✅
- [x] Add migration: `school_year_end`, `school_year_start` to profiles
- [x] Add migration: `school_name`, `school_year_end`, `school_year_start` to children
- [x] Create SchoolDatePicker component
- [x] Add to settings page or onboarding
- [x] Default to SB Unified dates (June 6 - Aug 12, 2026)
- [x] Update `getSummerWeeks2026()` to use user dates
- [x] Recalculate coverage gaps with custom dates
- [x] Test with different school calendars

### 1.2 Registration Deadline Visibility ✅
- [x] Add migration: `registration_opens DATE`, `registration_closes DATE` to camps
- [x] Script to parse `reg_date_2026` text into dates
- [x] Update camp cards to show registration date prominently
- [x] Add "Opens in X days" countdown badge
- [x] Add "Registration Open" badge for current registrations
- [x] Add sort/filter by registration date
- [x] Update camp discovery filters

### 1.3 Enhanced Cost Dashboard ✅
- [x] Add migration: `fsa_eligible BOOLEAN` to camps
- [x] Add migration: `summer_budget NUMERIC` to profiles
- [x] Research and populate FSA eligibility data
- [x] Create CostDashboard component
- [x] Show: total, per-child, per-week breakdown
- [x] Show: FSA-eligible subtotal
- [x] Add budget setting in profile
- [x] Show budget vs actual comparison

### 1.4 Work-Schedule-Friendly Filtering ✅
- [x] Add migration: `work_hours_start TIME`, `work_hours_end TIME` to profiles
- [x] Parse `drop_off`, `pick_up` fields to comparable times
- [x] Add filter: "Matches my work schedule"
- [x] Settings UI for custom work hours (default 8am-5:30pm)
- [x] Include camps with extended care that meet hours
- [x] Badge: "Covers 8am-5:30pm with extended care"

### 1.5 Wishlist UX Improvements ✅
- [x] Rename "Favorites" → "Considering" in UI
- [x] Add notes to favorites (field exists, need UI)
- [x] Create WishlistView component
- [x] Show registration dates in wishlist view
- [x] "Schedule this camp" quick action
- [x] "Compare selected" button
- [x] Badge: "3 camps for Emma"

### 1.6 "What If" Planning Preview ✅
- [x] Add "Planning Mode" toggle to SchedulePlanner
- [x] Track pending changes in component state
- [x] Visual distinction for pending items (dashed border)
- [x] Show cost delta: "Current: $4,000 → Pending: $4,500"
- [x] "Apply Changes" button
- [x] "Discard Changes" button
- [x] Undo last action (Cmd+Z / Ctrl+Z)

---

## Phase 1.5: Critical Gap Closure 🔄 CURRENT

### 1.5.1 Extended Care Cost Tracking
- [ ] Add migration: `extended_care_am_price`, `extended_care_pm_price` to camps
- [ ] Research and populate extended care pricing
- [ ] Add migration: `needs_extended_care_am`, `needs_extended_care_pm` to scheduled_camps
- [ ] Create ExtendedCareToggle component for scheduled camps
- [ ] Update cost calculation to include extended care
- [ ] Show breakdown in CostDashboard: "Base + AM + PM = Total"
- [ ] Update calendar week blocks to show true cost
- [ ] Test with various extended care configurations

### 1.5.2 Schedule Conflict Detection (UI)
- [ ] Verify `check_schedule_conflict()` function works correctly
- [ ] Create `checkScheduleConflict()` helper in supabase.js
- [ ] Call conflict check before saving scheduled_camp
- [ ] Create ConflictWarningModal component
- [ ] Allow override with confirmation (AM/PM camps)
- [ ] Add `conflict_acknowledged` field to scheduled_camps
- [ ] Add visual indicator on calendar for conflicts
- [ ] Log conflicts for analytics

### 1.5.3 Sibling Logistics Warnings
- [ ] Add geocoding for camp addresses (or use existing lat/long if available)
- [ ] Create `calculateCampDistance()` helper function
- [ ] Check sibling schedules on save
- [ ] Create SiblingLogisticsAlert component
- [ ] Show warning if same-day camps > 10 miles apart
- [ ] Display distance and estimated drive time
- [ ] Suggest "sibling-friendly" camps filter
- [ ] Allow user to dismiss warning

### 1.5.4 Waitlist Workflow & Alternatives
- [ ] Promote `waitlisted` status in UI status dropdown
- [ ] Add `waitlist_position` field to scheduled_camps
- [ ] Create WaitlistManager component
- [ ] UI to enter/update waitlist position
- [ ] Create AlternativeCampSuggester component
- [ ] Query for alternatives: same week, same age, available
- [ ] Keep waitlisted camp visible (grayed) on calendar
- [ ] Quick action: "Schedule backup" from waitlist view

### 1.5.5 Payment Deadline Tracking
- [ ] Add migration: `deposit_amount`, `deposit_due_date`, `payment_due_date` to camps
- [ ] Add migration: `payment_status` to scheduled_camps
- [ ] Populate payment deadline data for camps
- [ ] Create PaymentTracker dashboard widget
- [ ] Show upcoming payments with due dates
- [ ] Add payment status dropdown on scheduled camp detail
- [ ] Create payment reminder notification type
- [ ] Flag overdue payments prominently

### 1.5.6 Camp Cancellation Handling
- [ ] Add migration: `cancelled_by`, `cancellation_reason` to scheduled_camps
- [ ] Add migration: `expected_refund`, `refund_received` to scheduled_camps
- [ ] Distinguish user vs camp cancellation in UI
- [ ] Create CampCancellationFlow component
- [ ] Auto-show coverage gap when camp-cancelled
- [ ] Create "camp_cancelled" notification type
- [ ] "Find replacement" quick action
- [ ] Refund tracking UI

---

## Phase 2: Notifications & Registration

### 2.1 Push Notification Infrastructure
- [ ] Add VAPID key pair to environment variables
- [ ] Create service worker (sw.js) for push
- [ ] Register service worker in main app
- [ ] Add migration: `push_subscription JSONB` to profiles
- [ ] NotificationPermission component (request permission)
- [ ] Integrate during onboarding
- [ ] Backend: install `web-push` package
- [ ] Create notification sending Edge Function or API
- [ ] Notification preferences UI enhancements
- [ ] Email fallback for non-push users

### 2.2 Registration Countdown Alerts
- [ ] Scheduled job: check registration dates daily
- [ ] Create notifications for: 7 days, 1 day, morning-of
- [ ] Push content: "UCSB Arts Camp registration opens tomorrow"
- [ ] Deep link to camp detail page
- [ ] Per-camp "Set reminder" button
- [ ] Per-camp reminder disable option

### 2.3 Watchlist Notifications
- [ ] UI: "Watch this camp" button (separate from favorites)
- [ ] Watch options: price drop, spots available, registration opens
- [ ] Target price setting for price alerts
- [ ] Backend job to check for changes (scraper integration)
- [ ] Trigger notifications when criteria met
- [ ] Watchlist management page

### 2.4 Camp Session Data
- [ ] Populate `camp_sessions` table with real data
- [ ] Session fields: session_name, start_date, end_date, price, spots_remaining
- [ ] UI to select specific session when scheduling
- [ ] Show availability: "Week 3: 5 spots left"
- [ ] Update scheduled_camps to link to session_id

### 2.5 Calendar Export
- [ ] "Export to Google Calendar" button (code exists, need UI)
- [ ] Generate .ics file for download
- [ ] Include: camp name, location, drop-off/pick-up times
- [ ] Child name in event title
- [ ] Handle multi-week camps as recurring events
- [ ] Test with Google Calendar, Apple Calendar, Outlook

### 2.6 Registration Success Tracking (NEW)
- [ ] "Did you get in?" prompt after registration date
- [ ] Track: registered → confirmed vs registered → waitlisted
- [ ] Auto-suggest alternatives when waitlisted
- [ ] Registration success analytics

### 2.7 Backup Camp Suggestions (NEW)
- [ ] Create BackupCampList component
- [ ] Pre-identify backup camps per wishlist item
- [ ] Auto-suggest when primary camp unavailable
- [ ] Quick-swap from backup to primary

---

## Phase 3: Logistics & Paperwork

### 3.1 Daily Schedule View
- [ ] Create DailySchedule component
- [ ] "Today" view with drop-offs and pickups
- [ ] Per-child cards with time, location, camp name
- [ ] "Tomorrow" preview
- [ ] Week-at-a-glance summary
- [ ] Link to map directions

### 3.2 Route Optimization
- [ ] Add migration: `latitude`, `longitude` to camps
- [ ] Geocode all camp addresses (Google Maps API)
- [ ] Create RouteMap component
- [ ] Calculate optimal drop-off order
- [ ] Show estimated drive times between stops
- [ ] "Open in Maps" deep link

### 3.3 Carpool Matching
- [ ] Add migration: `home_zip`, `home_area` to profiles
- [ ] Extend squads with carpool interest
- [ ] CarpoolFinder component
- [ ] Match by: same camp, same week, nearby area
- [ ] Opt-in visibility (zip code, not address)
- [ ] In-app messaging or contact exchange

### 3.4 Child Profile Export
- [ ] Add migration: `emergency_contacts JSONB`, `physician_name`, `physician_phone`, `insurance_info JSONB` to children
- [ ] UI to enter extended medical info
- [ ] ChildProfileExport component
- [ ] Generate PDF with camp form fields
- [ ] Pre-fill: name, DOB, allergies, emergency contacts
- [ ] Export as PDF or copy to clipboard

### 3.5 Document Vault
- [ ] Create `documents` table with RLS
- [ ] Set up Supabase Storage bucket
- [ ] DocumentVault component
- [ ] Upload: immunization records, insurance cards
- [ ] Per-child document association
- [ ] Secure sharing links for camps
- [ ] Expiration tracking for immunizations

### 3.6 Packing List Generator (NEW)
- [ ] Create PackingListGenerator component
- [ ] Per-camp checklist templates (swimsuit, sunscreen, etc.)
- [ ] Category-based defaults (beach, sports, art)
- [ ] User customization per camp
- [ ] Export/print packing list

### 3.7 First Day Reminders (NEW)
- [ ] Create FirstDayReminder notification type
- [ ] Trigger evening before first day of each camp
- [ ] Include: what to bring, drop-off time/location
- [ ] Link to camp details
- [ ] Per-camp custom notes

---

## Data Population Tasks

### Phase 1 Data (✅ COMPLETE)
- [x] Parse `reg_date_2026` into `registration_opens` dates
- [x] Research FSA eligibility per camp
- [x] Normalize `drop_off` and `pick_up` to TIME format

### Phase 1.5 Data (CURRENT)
- [ ] Research extended care pricing per camp
- [ ] Populate `extended_care_am_price`, `extended_care_pm_price`
- [ ] Research deposit amounts and due dates
- [ ] Populate `deposit_amount`, `deposit_due_date`, `payment_due_date`

### Phase 2 Data
- [ ] Populate `camp_sessions` with actual session dates
- [ ] Populate spots_remaining where available
- [ ] Add popularity indicators

### Phase 3 Data
- [ ] Geocode all camp addresses
- [ ] Populate `latitude`, `longitude`
- [ ] Create packing list templates per category

### Default Data
- [x] Santa Barbara Unified 2026 calendar dates
- [ ] Common extended care hours patterns
- [ ] Category-based FSA eligibility defaults
- [ ] Default packing lists by camp category

---

## Testing Checklist

### Phase 1 Testing ✅ COMPLETE
- [x] School date picker saves and loads correctly
- [x] Coverage gaps recalculate with custom school dates
- [x] Registration dates display on camp cards
- [x] Work hours filter shows correct camps
- [x] Planning mode tracks changes without saving
- [x] Planning mode apply/discard works correctly
- [x] Cost dashboard shows accurate totals

### Phase 1.5 Testing (CURRENT)
- [ ] Extended care toggle updates cost correctly
- [ ] Cost breakdown shows base + extended care
- [ ] Conflict detection prevents double-booking
- [ ] Conflict override works for AM/PM camps
- [ ] Sibling logistics warning appears for distant camps
- [ ] Waitlist status displays correctly
- [ ] Alternative camp suggestions are relevant
- [ ] Payment status updates correctly
- [ ] Payment reminders fire at correct times
- [ ] Camp cancellation flow shows gap
- [ ] Refund tracking saves correctly

### Phase 2 Testing
- [ ] Push notifications received on mobile
- [ ] Push notifications received on desktop
- [ ] Email fallback works when push disabled
- [ ] Registration alerts fire at correct times
- [ ] Calendar export opens in Google Calendar
- [ ] Calendar export works in Apple Calendar
- [ ] Registration success tracking logs correctly
- [ ] Backup camp suggestions are relevant

### Phase 3 Testing
- [ ] Daily schedule shows correct camps
- [ ] Route optimization gives logical order
- [ ] Document uploads work under 10MB
- [ ] Document download generates correct PDF
- [ ] Carpool matching finds relevant partners
- [ ] Packing list generates correctly
- [ ] First day reminders fire at correct time

---

## Deployment Checklist

### Environment Variables Needed
```
# Phase 2 additions
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
GOOGLE_MAPS_API_KEY=  # Phase 3
```

### Supabase Configuration
- [ ] Run Phase 1 migrations
- [ ] Update RLS policies for new tables
- [ ] Create Edge Functions for notifications
- [ ] Set up Storage bucket for documents

### Vercel Configuration
- [ ] Add new environment variables
- [ ] Configure cron jobs for scheduled tasks
- [ ] Update build settings if needed
