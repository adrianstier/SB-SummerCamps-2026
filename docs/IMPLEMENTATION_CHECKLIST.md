# Implementation Checklist

Quick-reference checklist for development. See [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) for full requirements.

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

## Phase 1: MVP Enhancements

### 1.1 School Date Configuration
- [ ] Add migration: `school_year_end`, `school_year_start` to profiles
- [ ] Add migration: `school_name`, `school_year_end`, `school_year_start` to children
- [ ] Create SchoolDatePicker component
- [ ] Add to settings page or onboarding
- [ ] Default to SB Unified dates (June 6 - Aug 12, 2026)
- [ ] Update `getSummerWeeks2026()` to use user dates
- [ ] Recalculate coverage gaps with custom dates
- [ ] Test with different school calendars

### 1.2 Registration Deadline Visibility
- [ ] Add migration: `registration_opens DATE`, `registration_closes DATE` to camps
- [ ] Script to parse `reg_date_2026` text into dates
- [ ] Update camp cards to show registration date prominently
- [ ] Add "Opens in X days" countdown badge
- [ ] Add "Registration Open" badge for current registrations
- [ ] Add sort/filter by registration date
- [ ] Update camp discovery filters

### 1.3 Enhanced Cost Dashboard
- [ ] Add migration: `fsa_eligible BOOLEAN` to camps
- [ ] Add migration: `summer_budget NUMERIC` to profiles
- [ ] Research and populate FSA eligibility data
- [ ] Create CostDashboard component
- [ ] Show: total, per-child, per-week breakdown
- [ ] Show: FSA-eligible subtotal
- [ ] Add budget setting in profile
- [ ] Show budget vs actual comparison
- [ ] Include extended care costs when applicable

### 1.4 Work-Schedule-Friendly Filtering
- [ ] Add migration: `work_hours_start TIME`, `work_hours_end TIME` to profiles
- [ ] Parse `drop_off`, `pick_up` fields to comparable times
- [ ] Add filter: "Matches my work schedule"
- [ ] Settings UI for custom work hours (default 8am-5:30pm)
- [ ] Include camps with extended care that meet hours
- [ ] Badge: "Covers 8am-5:30pm with extended care"

### 1.5 Wishlist UX Improvements
- [ ] Rename "Favorites" → "Considering" in UI
- [ ] Add notes to favorites (field exists, need UI)
- [ ] Create WishlistView component
- [ ] Show registration dates in wishlist view
- [ ] "Schedule this camp" quick action
- [ ] "Compare selected" button
- [ ] Badge: "3 camps for Emma"

### 1.6 "What If" Planning Preview
- [ ] Add "Planning Mode" toggle to SchedulePlanner
- [ ] Track pending changes in component state
- [ ] Visual distinction for pending items (dashed border)
- [ ] Show cost delta: "Current: $4,000 → Pending: $4,500"
- [ ] "Apply Changes" button
- [ ] "Discard Changes" button
- [ ] Undo last action (Cmd+Z / Ctrl+Z)

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
- [ ] "Export to Google Calendar" button
- [ ] Generate .ics file for download
- [ ] Include: camp name, location, drop-off/pick-up times
- [ ] Child name in event title
- [ ] Handle multi-week camps as recurring events
- [ ] Test with Google Calendar, Apple Calendar, Outlook

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

---

## Data Population Tasks

### Camp Data Enrichment
- [ ] Parse `reg_date_2026` into `registration_opens` dates
- [ ] Research FSA eligibility per camp
- [ ] Populate `camp_sessions` with actual session dates
- [ ] Geocode all camp addresses
- [ ] Normalize `drop_off` and `pick_up` to TIME format

### Default Data
- [ ] Santa Barbara Unified 2026 calendar dates
- [ ] Common extended care hours patterns
- [ ] Category-based FSA eligibility defaults

---

## Testing Checklist

### Phase 1 Testing
- [ ] School date picker saves and loads correctly
- [ ] Coverage gaps recalculate with custom school dates
- [ ] Registration dates display on camp cards
- [ ] Work hours filter shows correct camps
- [ ] Planning mode tracks changes without saving
- [ ] Planning mode apply/discard works correctly
- [ ] Cost dashboard shows accurate totals

### Phase 2 Testing
- [ ] Push notifications received on mobile
- [ ] Push notifications received on desktop
- [ ] Email fallback works when push disabled
- [ ] Registration alerts fire at correct times
- [ ] Calendar export opens in Google Calendar
- [ ] Calendar export works in Apple Calendar

### Phase 3 Testing
- [ ] Daily schedule shows correct camps
- [ ] Route optimization gives logical order
- [ ] Document uploads work under 10MB
- [ ] Document download generates correct PDF
- [ ] Carpool matching finds relevant partners

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
