# Santa Barbara Summer Camps 2026 - Product Plan

**Document Version**: 2.1
**Last Updated**: January 11, 2026
**Status**: Approved for Implementation (Phase 1.5 Execution Framework Added)

---

## Executive Summary

This document outlines the comprehensive product plan for SB Summer Camps, a planning tool for Santa Barbara parents coordinating summer childcare across multiple camps. Based on user research and a gap analysis of the existing codebase, this plan identifies what's already built, what's partially implemented, and what new features are needed to solve the core user problems.

**The Core Problem**: Parents—primarily mothers managing 71% of household scheduling—are struggling to coordinate summer childcare across 3-7 different camps per child. Each camp has its own registration system, timeline, forms, and logistics. Parents are forced to cobble together spreadsheets, generic calendars, and mental gymnastics to ensure continuous coverage.

**The Opportunity**: Nothing purpose-built exists for parents managing across multiple camps. The spreadsheets parents build themselves prove there's demand—they're hacking together solutions because nothing exists.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis](#2-gap-analysis)
3. [Feature Roadmap](#3-feature-roadmap)
4. [Phase 1: MVP Enhancements](#4-phase-1-mvp-enhancements)
5. [Phase 2: Registration & Alerts](#5-phase-2-registration--alerts)
6. [Phase 3: Logistics & Paperwork](#6-phase-3-logistics--paperwork)
7. [Data Requirements](#7-data-requirements)
8. [Technical Considerations](#8-technical-considerations)
9. [Success Metrics](#9-success-metrics)
10. [Open Questions](#10-open-questions)

---

## 1. Current State Analysis

### What's Already Built

The platform has a solid foundation with many core features already implemented:

#### Authentication & User Management
| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth | ✅ Complete | Via Supabase Auth |
| User profiles | ✅ Complete | Includes preferences, notification settings |
| Role-based access | ✅ Complete | user, admin, camp_owner roles |
| Onboarding wizard | ✅ Complete | Multi-step with sample data |

#### Family Management
| Feature | Status | Notes |
|---------|--------|-------|
| Add/edit children | ✅ Complete | Name, birth date, age, interests, allergies, notes |
| Child colors | ✅ Complete | For calendar visualization |
| Per-child filtering | ✅ Complete | Age-appropriate camp filtering |
| Sample data for onboarding | ✅ Complete | Emma & Jake sample children |

#### Camp Discovery
| Feature | Status | Notes |
|---------|--------|-------|
| Camp database | ✅ Complete | 43+ camps in Supabase |
| Search by name/description | ✅ Complete | Full-text search |
| Filter by category | ✅ Complete | Beach, Sports, Art, STEM, etc. |
| Filter by age range | ✅ Complete | min_age/max_age filtering |
| Filter by price | ✅ Complete | min_price/max_price |
| Filter by features | ✅ Complete | Extended care, food, transport, sibling discount |
| Camp detail cards | ✅ Complete | Comprehensive info display |

#### Calendar & Scheduling
| Feature | Status | Notes |
|---------|--------|-------|
| Visual summer calendar | ✅ Complete | 11 weeks (June 8 - Aug 21, 2026) |
| Drag-and-drop scheduling | ✅ Complete | From sidebar or search |
| Multi-child views | ✅ Complete | Per-child and overlay views |
| Coverage gap detection | ✅ Complete | Uncovered weeks highlighted |
| Block non-camp weeks | ✅ Complete | Vacation, Family, Travel, Other |
| Camp status tracking | ✅ Complete | planned → registered → confirmed → cancelled |
| Cost per week display | ✅ Complete | On calendar blocks |
| Total cost calculation | ✅ Complete | Dashboard shows total |

#### Community Features
| Feature | Status | Notes |
|---------|--------|-------|
| Camp reviews | ✅ Complete | 5-dimension ratings (overall, value, staff, activities, safety) |
| Review helpfulness voting | ✅ Complete | "Was this helpful?" |
| Camp Q&A | ✅ Complete | Ask/answer questions |
| Content moderation | ✅ Complete | Report inappropriate content |

#### Social/Coordination (Squads)
| Feature | Status | Notes |
|---------|--------|-------|
| Create squads | ✅ Complete | Parent coordination groups |
| Join via invite code | ✅ Complete | 6-character hex codes |
| Privacy controls | ✅ Complete | reveal_identity, share_schedule flags |
| "Looking for friends" | ✅ Complete | Signal interest in camps |
| Squad notifications | ✅ Complete | Member activity alerts |

#### Favorites & Comparisons
| Feature | Status | Notes |
|---------|--------|-------|
| Heart/favorite camps | ✅ Complete | Per-child favorites |
| Side-by-side comparison | ✅ Complete | Compare 2-3 camps |
| Share comparison lists | ✅ Complete | Secure token-based sharing |

### Database Schema (Existing Tables)

```
profiles          - User accounts with preferences
children          - Child profiles (age, interests, allergies)
camps             - 43+ camp listings with full details
camp_sessions     - Specific dates/weeks per camp (empty - needs population)
scheduled_camps   - User's planned camps per child
favorites         - Saved/hearted camps
reviews           - Community reviews with ratings
review_helpful_votes
camp_questions    - Q&A questions
camp_answers      - Q&A answers
notifications     - User notification queue
camp_watchlist    - Price/availability watch (table exists, limited UI)
comparison_lists  - Saved comparisons
squads            - Parent coordination groups
squad_members     - Squad membership
squad_notifications
camp_interests    - "Looking for friends" signals
camp_edits        - Admin edit history
reported_content  - Moderation reports
```

---

## 2. Gap Analysis

### Research-Identified Pain Points vs. Current State

| Pain Point | Current State | Gap |
|------------|---------------|-----|
| **The Puzzle Problem**: Juggling 3-7 camps per child | ✅ Calendar handles multi-camp scheduling | Minor polish needed |
| **Coverage Gaps**: Weeks between school/camp | ✅ Gaps detected and highlighted | Need school date configuration |
| **Registration Blood Sport**: Miss deadlines | ⚠️ Partial - camps have `reg_date_2026` field | No alerts, no countdown, no push notifications |
| **Cost Tracking Nightmare**: $5-8K summers | ✅ Total cost displayed | Missing: FSA flagging, extended care costs, payment deadlines |
| **Logistics Chaos**: Multi-stop drop-offs | ❌ Not implemented | Phase 3 |
| **Forms Per Camp**: Re-entering info 5-7x | ❌ Not implemented | Phase 3 (child profile exists but no export) |
| **Sibling Logistics**: Different camps, same morning | ⚠️ Multi-child view exists | No proximity warnings or sibling-friendly filtering |
| **Waitlist Limbo**: Registered but uncertain | ⚠️ Status exists | No waitlist tracking or alternative suggestions |
| **Payment Deadlines**: Deposit due dates | ❌ Not tracked | Need payment deadline alerts |

### Feature Gap Matrix

| Feature | Research Priority | Current Status | Gap Level |
|---------|-------------------|----------------|-----------|
| Visual summer calendar | HIGH | ✅ Complete | None |
| Multi-child view | HIGH | ✅ Complete | None |
| Coverage gap detection | HIGH | ✅ Complete | Minor (school dates) |
| Registration deadline tracking | HIGH | ⚠️ Data exists | **MAJOR** - No alerts |
| Push notifications | HIGH | ❌ Schema only | **MAJOR** |
| Cost dashboard | MEDIUM | ✅ Basic | Minor (FSA, extended care, per-week) |
| Wishlist/considering | MEDIUM | ✅ Via favorites | Rename/UX only |
| "What if" scenario planning | MEDIUM | ⚠️ Drag works | Need undo/preview |
| Camp hours matching work schedule | MEDIUM | ⚠️ Data exists | Need filter |
| Commute/location filter | MEDIUM | ❌ No geocoding | **MEDIUM** |
| Drop-off/pickup route optimizer | LOWER | ❌ Not implemented | Phase 3 |
| Carpool coordination | LOWER | ⚠️ Squads exist | Extend squads |
| Gap coverage marketplace | LOWER | ❌ Not implemented | Phase 4 |
| Master child profile export | LOWER | ⚠️ Data exists | **MEDIUM** |
| Document vault | LOWER | ❌ Not implemented | Phase 3 |
| Co-parent shared visibility | LOWER | ⚠️ Squads exist | Extend for households |
| Expense splitting | LOWER | ❌ Not implemented | Phase 4 |
| Sibling scheduling coordination | MEDIUM | ⚠️ Calendar exists | Need logistics warnings |
| Waitlist/alternative tracking | MEDIUM | ⚠️ Status exists | Need workflow |
| Payment deadline tracking | MEDIUM | ❌ Not implemented | **MEDIUM** |
| Extended care cost tracking | MEDIUM | ❌ Not implemented | **MEDIUM** |
| Schedule conflict detection | HIGH | ⚠️ Function exists | Need UI integration |
| Camp cancellation handling | MEDIUM | ⚠️ Status exists | Need workflow |
| Scholarship tracking | LOWER | ❌ Not implemented | Phase 4 |

---

## 3. Feature Roadmap

### Phase Overview

```
PHASE 1 (MVP Enhancement) - ✅ COMPLETE
├── ✅ School date configuration
├── ✅ Registration deadline visibility
├── ✅ Enhanced cost dashboard
├── ✅ Work-schedule-friendly filtering
├── ✅ Wishlist UX improvements
└── ✅ "What if" planning preview

PHASE 1.5 (Critical Gaps) - CURRENT PRIORITY
├── Extended care cost tracking
├── Schedule conflict detection (UI)
├── Sibling logistics warnings
├── Waitlist workflow & alternatives
├── Payment deadline tracking
└── Camp cancellation handling

PHASE 2 (Notifications & Registration)
├── Push notification infrastructure
├── Registration countdown alerts
├── Watchlist notifications (price, spots)
├── Email notification delivery
├── Camp session data population
├── Calendar export (Google, iCal)
├── Registration success tracking
└── Backup camp suggestions

PHASE 3 (Logistics & Coordination)
├── Daily schedule view (today's logistics)
├── Route optimization suggestions
├── Carpool matching within squads
├── Co-parent household sharing
├── Child profile form export
├── Document vault (medical, immunization)
├── Packing list generator
└── First day reminders

PHASE 4 (Marketplace & Advanced) - Future
├── Gap coverage sitter marketplace
├── Expense splitting/tracking
├── Camp owner portal
├── Scholarship application tracking
├── Multi-year planning
├── Post-season review prompts
└── Multi-region expansion
```

---

## 4. Phase 1: MVP Enhancements

**Timeline**: 4-6 weeks
**Goal**: Polish existing features and close critical UX gaps

### 4.1 School Date Configuration

**Problem**: Coverage gaps are calculated but users can't set their school's actual end/start dates.

**Current State**: Hardcoded to June 8 - August 21, 2026

**Requirements**:
- [ ] Add `school_year_end` and `school_year_start` fields to profiles table
- [ ] UI to set school dates in settings or onboarding
- [ ] Default to Santa Barbara Unified dates (June 6 - Aug 12, 2026 typical)
- [ ] Recalculate coverage gaps based on user's school dates
- [ ] Show "Before school ends" and "After camp season" periods

**User Story**:
```
As a parent, I want to set my children's school end/start dates
so the calendar accurately shows which weeks need coverage.

Acceptance Criteria:
- I can set dates per child (different schools = different dates)
- Calendar boundaries adjust to my school dates
- Coverage gaps recalculate automatically
- Defaults to SB Unified dates if not set
```

### 4.2 Registration Deadline Visibility

**Problem**: Parents miss registration deadlines because each camp opens at different times.

**Current State**: `reg_date_2026` field exists but isn't prominently displayed.

**Requirements**:
- [ ] Parse `reg_date_2026` into structured date where possible
- [ ] Add `registration_opens` date field to camps table
- [ ] Display "Registration opens: Jan 15" on camp cards
- [ ] Sort/filter by "opens soon"
- [ ] Countdown badge for camps opening in next 7 days
- [ ] "Registration open now" badge
- [ ] Calendar integration: show registration windows

**User Story**:
```
As a parent, I want to see when each camp's registration opens
so I can be ready to register before spots fill.

Acceptance Criteria:
- Camp cards show registration date prominently
- I can sort camps by registration date
- Camps opening in next 7 days have a countdown
- Already-open camps show "Register Now" badge
```

### 4.3 Enhanced Cost Dashboard

**Problem**: Parents need to track FSA eligibility, sibling discounts, and per-child spending.

**Current State**: Total cost displayed, per-week on calendar blocks.

**Requirements**:
- [ ] Dashboard widget: Total summer cost, per-child breakdown
- [ ] Add `fsa_eligible` boolean to camps table (with data population)
- [ ] Show FSA-eligible subtotal separately
- [ ] Extended care cost addition when selected
- [ ] Sibling discount indication (manual entry or auto-calculate)
- [ ] Budget comparison: "Your budget: $6,000 | Current: $4,850"

**User Story**:
```
As a parent, I want to see my total summer cost with FSA breakdown
so I can budget accurately and maximize FSA reimbursement.

Acceptance Criteria:
- Dashboard shows total cost, per-child, per-week
- FSA-eligible amount is shown separately
- Extended care costs are included when enabled
- I can set a budget and see remaining
```

### 4.4 Work-Schedule-Friendly Filtering

**Problem**: Working parents need camps that match their work hours (8am-5pm+).

**Current State**: `hours`, `drop_off`, `pick_up` fields exist but no filter.

**Requirements**:
- [ ] Parse drop_off/pick_up times into comparable format
- [ ] Add filter: "Matches work schedule" (configurable hours)
- [ ] Default work schedule: 8:00am - 5:30pm
- [ ] Allow custom work hours in settings
- [ ] Show camps with extended care that extend to match
- [ ] Visual indicator on cards: "Covers 8am-5:30pm with extended care"

**User Story**:
```
As a working parent, I want to filter camps that cover my work hours
so I can find childcare without coverage gaps during the workday.

Acceptance Criteria:
- I can set my required coverage hours (e.g., 8am-5:30pm)
- Filter shows camps that cover those hours (with or without extended care)
- Results show if extended care is needed to meet my hours
- Camps with gaps in my hours are excluded
```

### 4.5 Wishlist UX Improvements

**Problem**: "Favorites" isn't intuitive for the "considering before committing" use case.

**Current State**: Heart icon adds to favorites, works per-child.

**Requirements**:
- [ ] Rename "Favorites" to "Considering" or "Wishlist" in UI
- [ ] Add notes field to favorites (already in schema)
- [ ] Wishlist view shows registration dates prominently
- [ ] One-click "Schedule this camp" from wishlist
- [ ] Compare button for wishlisted camps
- [ ] Show "3 in wishlist for Emma" badge

**User Story**:
```
As a parent, I want to save camps I'm considering before scheduling
so I can compare options and track registration dates.

Acceptance Criteria:
- Saved camps appear in "Considering" section
- I can add notes to each saved camp
- Registration dates are visible in the list
- I can move from "Considering" to "Scheduled" easily
```

### 4.6 "What If" Planning Preview

**Problem**: Parents want to experiment with schedules without committing.

**Current State**: Drag-and-drop works but commits immediately.

**Requirements**:
- [ ] Add "Planning Mode" toggle
- [ ] Changes in planning mode are highlighted (dashed border, different color)
- [ ] Show cost impact of pending changes
- [ ] "Apply Changes" or "Discard" buttons
- [ ] Undo last action (Cmd+Z)
- [ ] Session-based: pending changes persist until applied/discarded

**User Story**:
```
As a parent, I want to experiment with different camp combinations
so I can see cost/coverage implications before committing.

Acceptance Criteria:
- I can toggle "Planning Mode" on
- Changes are shown as pending (visual distinction)
- Cost updates show "Current: $4,000 → Pending: $4,500"
- I can apply all changes or discard
- Undo works for recent actions
```

---

## 4.5 Phase 1.5: Critical Gap Closure

**Goal**: Address high-impact gaps identified in business analysis before moving to Phase 2

### 4.5.1 Extended Care Cost Tracking

**Problem**: Many camps charge $10-30/day extra for extended care, but this isn't reflected in cost totals.

**Current State**: `extended_care` field exists as text description, no pricing.

**Requirements**:
- [ ] Add `extended_care_am_price` and `extended_care_pm_price` NUMERIC fields to camps
- [ ] Populate extended care pricing from camp websites
- [ ] Add toggle on scheduled_camps: `needs_extended_care_am`, `needs_extended_care_pm`
- [ ] Include extended care in cost calculations when enabled
- [ ] Show breakdown: "Base: $350 + AM Care: $50 + PM Care: $75 = $475/week"

**User Story**:
```
As a working parent who needs extended care at most camps, I want to see
accurate total costs including before/after care fees, so I can budget correctly.

Acceptance Criteria:
- I can mark which scheduled camps need extended care
- Cost dashboard shows extended care as line item
- Total accurately reflects all fees
- Per-week calendar blocks show true cost
```

### 4.5.2 Schedule Conflict Detection (UI Integration)

**Problem**: A child can be accidentally scheduled at two camps in the same week with no warning.

**Current State**: `check_schedule_conflict()` function exists in database, not wired to UI.

**Requirements**:
- [ ] Call conflict check before saving scheduled_camp
- [ ] Show warning modal if conflict detected
- [ ] Allow override with confirmation (e.g., "half-day camps")
- [ ] Visual indicator on calendar for double-booked weeks
- [ ] Conflict reason in warning: "Emma is already at Surf Camp this week"

**User Story**:
```
As a parent scheduling camps, I want to be warned if I accidentally
double-book my child, so I don't create impossible schedules.

Acceptance Criteria:
- Warning appears before saving conflicting schedule
- I can dismiss if intentional (AM/PM camps)
- Calendar shows visual warning for conflicts
- Conflicts are logged for review
```

### 4.5.3 Sibling Logistics Warnings

**Problem**: Parents schedule siblings at camps 20+ miles apart without realizing drop-off is impractical.

**Current State**: Multi-child view exists but no proximity analysis.

**Requirements**:
- [ ] Calculate distance between camps scheduled same week for different children
- [ ] Warn if same-morning drop-offs exceed threshold (e.g., 10 miles apart)
- [ ] Show estimated drive time between camps
- [ ] Suggest "sibling-friendly" camps that accept both ages
- [ ] Filter option: "Show camps near [sibling's camp]"

**User Story**:
```
As a parent with multiple children, I want to be warned when I've scheduled
camps that are far apart on the same day, so I can avoid impossible logistics.

Acceptance Criteria:
- Warning shows when siblings have distant camps same week
- Distance and drive time are displayed
- Alternative camps are suggested
- I can filter for camps near sibling's scheduled camp
```

### 4.5.4 Waitlist Workflow & Alternatives

**Problem**: Parents register for popular camps, get waitlisted, and have no tracking or backup plan.

**Current State**: `waitlisted` status exists in schema but is underutilized.

**Requirements**:
- [ ] Promote `waitlisted` as distinct status in UI (not just cancelled variant)
- [ ] Track waitlist position if available (manual entry)
- [ ] "Find alternatives" button when waitlisted
- [ ] Auto-suggest backup camps for same week/age/category
- [ ] Notification when waitlist clears (if integrated with camp)
- [ ] Keep waitlisted camp visible on calendar (grayed out) while showing alternative

**User Story**:
```
As a parent who got waitlisted at a popular camp, I want to quickly find
alternative camps for that week, so I don't have a coverage gap.

Acceptance Criteria:
- I can mark a camp as "Waitlisted" with position
- System suggests alternatives for that week
- Waitlisted camp stays visible but marked
- I can easily schedule backup and remove if waitlist clears
```

### 4.5.5 Payment Deadline Tracking

**Problem**: Camps require deposits/full payment by specific dates. Missing payment = losing spot.

**Current State**: No payment tracking at all.

**Requirements**:
- [ ] Add `deposit_amount` and `deposit_due_date` to camps table
- [ ] Add `payment_due_date` to camps table
- [ ] Add `payment_status` to scheduled_camps: unpaid → deposit_paid → full_paid
- [ ] Dashboard widget: "Upcoming payments this month"
- [ ] Notification: "Deposit due in 3 days for UCSB Arts Camp"
- [ ] Mark camps at risk when payment overdue

**User Story**:
```
As a parent juggling multiple camp payments, I want reminders before
payment deadlines, so I don't lose my spot due to missed payment.

Acceptance Criteria:
- I can see all upcoming payment deadlines
- Reminders sent 7 days and 1 day before due
- Payment status is tracked per scheduled camp
- Overdue payments are flagged prominently
```

### 4.5.6 Camp Cancellation Handling

**Problem**: Camps cancel sessions due to weather, low enrollment, etc. No workflow exists.

**Current State**: `cancelled` status exists but no notification or recovery flow.

**Requirements**:
- [ ] "Camp Cancelled" notification type
- [ ] Distinguish: user cancelled vs camp cancelled
- [ ] Show cancelled weeks as coverage gaps immediately
- [ ] "Find replacement" quick action from notification
- [ ] Track cancellation reason (weather, enrollment, other)
- [ ] Refund tracking: expected refund amount, received status

**User Story**:
```
As a parent whose camp was cancelled by the provider, I want to be
notified immediately and helped to find a replacement.

Acceptance Criteria:
- I'm notified when camp marks session cancelled
- The week shows as a gap needing coverage
- "Find replacement" shows available alternatives
- Refund status is tracked
```

---

## 4.6 Phase 1.5 Execution Framework

**Prepared by**: Project Manager
**Date**: January 11, 2026
**Status**: Ready for Implementation

### Work Breakdown Structure

Phase 1.5 is organized into six parallel work streams that can be developed concurrently where dependencies allow:

```
PHASE 1.5: CRITICAL GAP CLOSURE
│
├── STREAM A: Cost Accuracy (HIGH PRIORITY)
│   ├── A1: Extended Care Cost Schema Migration
│   ├── A2: Extended Care Cost Data Population (43 camps)
│   ├── A3: ExtendedCareToggle UI Component
│   └── A4: Cost Dashboard Integration
│
├── STREAM B: Schedule Integrity (HIGH PRIORITY)
│   ├── B1: Conflict Detection Schema (conflict_acknowledged)
│   ├── B2: ConflictWarningModal Component
│   └── B3: Calendar Conflict Visual Indicators
│
├── STREAM C: Waitlist & Cancellation Workflows (MEDIUM PRIORITY)
│   ├── C1: Waitlist/Cancellation Schema Migration
│   ├── C2: WaitlistManager Component
│   ├── C3: AlternativeCampSuggester Component
│   └── C4: CampCancellationFlow Component
│
├── STREAM D: Payment Tracking (MEDIUM PRIORITY)
│   ├── D1: Payment Schema Migration
│   ├── D2: Payment Data Population
│   ├── D3: PaymentTracker Dashboard Widget
│   └── D4: Payment Status UI Integration
│
├── STREAM E: Sibling Logistics (MEDIUM PRIORITY)
│   ├── E1: Distance Calculation Helper (ZIP-code based)
│   ├── E2: SiblingLogisticsAlert Component
│   └── E3: "Near sibling's camp" Filter
│
└── STREAM F: Data Population (PARALLEL TRACK)
    ├── F1: Extended care pricing research
    ├── F2: Payment deadline research
    └── F3: Camp address/ZIP verification
```

### Critical Path

```
Day 1-2:   Schema Migrations (A1, B1, C1, D1) ─────────────────────────┐
              │                                                         │
Day 1-5:     │    Data Research (F1, F2, F3) ──────────────────────────┼──► Parallel
              │                                                         │
Day 3-8:   Cost Features (A3, A4) ◄── Depends on A1, F1               │
              │                                                         │
Day 3-8:   Conflict Detection (B2, B3) ◄── Depends on B1              │
              │                                                         │
Day 6-12:  Waitlist/Cancellation (C2, C3, C4) ◄── Depends on C1       │
              │                                                         │
Day 10-16: Payment Tracking (D3, D4) ◄── Depends on D1, F2            │
              │                                                         │
Day 14-18: Sibling Logistics (E1, E2, E3) ◄── Depends on F3           │
              │                                                         │
Day 19-20: Integration Testing & Polish ◄─────────────────────────────┘
```

### Effort Estimates by Stream

| Stream | Task | Owner | Effort | Dependencies |
|--------|------|-------|--------|--------------|
| **A: Extended Care** | | | | |
| A1 | Schema migration | Tech Lead | 1 hr | None |
| A2 | Data population | BA/Data | 6-8 hrs | A1 |
| A3 | ExtendedCareToggle component | Frontend | 4 hrs | A1 |
| A4 | CostDashboard integration | Frontend | 2 hrs | A3 |
| **B: Conflict Detection** | | | | |
| B1 | Add conflict_acknowledged column | Tech Lead | 30 min | None |
| B2 | ConflictWarningModal | Frontend | 4 hrs | B1 |
| B3 | Calendar visual indicators | Frontend | 2 hrs | B2 |
| **C: Waitlist/Cancel** | | | | |
| C1 | Schema migration | Tech Lead | 1 hr | None |
| C2 | WaitlistManager | Frontend | 6 hrs | C1 |
| C3 | AlternativeCampSuggester | Frontend | 4 hrs | C1 |
| C4 | CampCancellationFlow | Frontend | 4 hrs | C1 |
| **D: Payment Tracking** | | | | |
| D1 | Schema migration | Tech Lead | 1 hr | None |
| D2 | Data population | BA/Data | 6-8 hrs | D1 |
| D3 | PaymentTracker widget | Frontend | 4 hrs | D1 |
| D4 | Payment status UI | Frontend | 2 hrs | D3 |
| **E: Sibling Logistics** | | | | |
| E1 | Distance helper (ZIP-based) | Tech Lead | 3 hrs | None |
| E2 | SiblingLogisticsAlert | Frontend | 3 hrs | E1 |
| E3 | Filter integration | Frontend | 2 hrs | E2 |

**Total Estimated Effort**: 55-65 hours development + 12-16 hours data research

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Extended care data unavailable for some camps | Medium | High | Allow manual entry; mark as "Contact camp for pricing" |
| Sibling logistics without geocoding is inaccurate | High | Medium | Use ZIP-code-based distance estimation; display as "approximate" |
| Conflict detection creates user friction | Medium | Medium | Clear messaging; easy override for AM/PM camps |
| Payment deadline data varies by camp | Medium | Medium | Allow user override; mark as "estimated" if camp-sourced |

### Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| **Schema Review** | Migration tested in dev, RLS policies updated, rollback plan documented | Tech Lead |
| **Component Review** | Matches design spec, accessible (WCAG AA), mobile responsive | UX Engineer |
| **Integration Review** | API contracts met, error handling complete, loading states | Tech Lead |
| **Acceptance Review** | All acceptance criteria pass, no regressions in existing features | QA |

### Stakeholder Communication Plan

| Audience | Frequency | Format | Content |
|----------|-----------|--------|---------|
| Product Owner | Daily | Async standup | Progress, blockers, decisions needed |
| UX Engineer | Per-component | PR reviews | Component specs, design feedback |
| Tech Lead | Per-stream | Architecture review | Schema changes, API contracts |
| Users (Beta) | End of phase | Release notes | New features, how to use |

### Success Criteria for Phase 1.5

- [ ] Extended care costs included in all cost calculations
- [ ] Schedule conflicts prevented or explicitly acknowledged
- [ ] Sibling logistics warnings shown for distant same-day camps
- [ ] Waitlist tracking with alternative suggestions functional
- [ ] Payment deadlines visible with reminder capability
- [ ] Camp cancellation workflow guides users to replacements
- [ ] All new features have mobile-responsive UI
- [ ] No regressions in Phase 1 features

---

## 5. Phase 2: Registration & Alerts

**Timeline**: 6-8 weeks
**Goal**: Prevent missed registration deadlines with proactive notifications

### 5.1 Push Notification Infrastructure

**Problem**: Parents miss registration because they're not checking the app daily.

**Current State**: `notifications` table exists, `push_sent` field exists, no push infrastructure.

**Requirements**:
- [ ] Integrate web push notifications (service worker)
- [ ] Request notification permission during onboarding
- [ ] Store push subscription in profiles
- [ ] Backend service to send push notifications
- [ ] Fallback to email if push not enabled
- [ ] Notification preferences UI (already partially exists)

**Technical Approach**:
```
1. Add service worker for push (sw.js)
2. Use web-push npm package for server-side
3. Store VAPID keys in environment
4. Add push_subscription JSONB field to profiles
5. Create Edge Function for scheduled sends (or cron job)
```

### 5.2 Registration Countdown Alerts

**Problem**: "Getting into day camp is a blood sport—spots go in 10 minutes."

**Requirements**:
- [ ] Parse registration dates into structured format
- [ ] Schedule notifications: 7 days, 1 day, morning-of
- [ ] Push notification: "UCSB Arts Camp registration opens tomorrow at 9am"
- [ ] Deep link to camp detail or external registration page
- [ ] Per-camp opt-out for alerts
- [ ] "Set reminder" button on camp cards

**User Story**:
```
As a parent, I want push notifications before registration opens
so I don't miss the 10-minute window for popular camps.

Acceptance Criteria:
- I receive alerts 7 days before registration opens
- I receive alerts 1 day before
- I receive an alert the morning of (2 hours before)
- Alerts link to the camp's registration page
- I can disable alerts per-camp
```

### 5.3 Watchlist Notifications

**Problem**: Parents want to know about price drops and availability changes.

**Current State**: `camp_watchlist` table exists with notify flags, no implementation.

**Requirements**:
- [ ] "Watch this camp" button (distinct from favorites)
- [ ] Options: notify on price drop, spots available, registration opens
- [ ] Target price setting for price drop alerts
- [ ] Backend job to check for changes (requires scraper enhancement)
- [ ] Push/email when criteria met
- [ ] Watchlist management UI

### 5.4 Camp Session Data Population

**Problem**: `camp_sessions` table is empty—can't track specific weeks per camp.

**Current State**: Table exists, 0 rows.

**Requirements**:
- [ ] Populate session data for all camps (manual or scraper)
- [ ] Session fields: session_name, start_date, end_date, price, spots_remaining
- [ ] Link scheduled_camps to specific sessions
- [ ] Show availability: "Week 3: 5 spots left"
- [ ] Enable session-specific scheduling

### 5.5 Calendar Export

**Problem**: Parents want their summer schedule in Google Calendar.

**Current State**: `createGoogleCalendarUrl` function exists, `google_event_id` field exists.

**Requirements**:
- [ ] "Export to Google Calendar" button
- [ ] Generate .ics file for iCal/Outlook
- [ ] Include: camp name, location, times, child name
- [ ] Recurring events for multi-week camps
- [ ] Sync back changes (two-way sync is complex—start with export only)

---

## 6. Phase 3: Logistics & Paperwork

**Timeline**: 8-10 weeks
**Goal**: Reduce daily chaos and eliminate paperwork duplication

### 6.1 Daily Schedule View

**Requirements**:
- [ ] "Today" view showing morning routine
- [ ] Per-child drop-off times and locations
- [ ] Map integration showing locations
- [ ] "Tomorrow" preview
- [ ] This week at a glance

### 6.2 Route Optimization

**Requirements**:
- [ ] Geocode camp addresses (Google Maps API)
- [ ] Calculate optimal drop-off order
- [ ] Show estimated drive times
- [ ] Generate directions link (Google Maps/Apple Maps)
- [ ] Handle multi-child, multi-location mornings

### 6.3 Carpool Matching

**Current State**: Squads exist for parent coordination.

**Requirements**:
- [ ] Extend squads with camp interest matching
- [ ] "Find carpool partners" for specific camp + week
- [ ] Opt-in visibility of home area (zip code, not address)
- [ ] In-app messaging or external contact
- [ ] Carpool schedule coordination

### 6.4 Child Profile Export

**Current State**: Children table has allergies, special_needs, notes.

**Requirements**:
- [ ] Add additional fields: emergency contacts (JSONB), physician, insurance
- [ ] "Export for camp forms" feature
- [ ] Generate PDF with standard camp form fields
- [ ] Pre-fill common form fields (name, DOB, allergies, emergency contacts)
- [ ] Store commonly needed documents (immunization records)

### 6.5 Document Vault

**Requirements**:
- [ ] File upload to Supabase Storage
- [ ] Document types: immunization record, insurance card, custody agreement
- [ ] Per-child document association
- [ ] Secure sharing links for camps
- [ ] Expiration tracking (e.g., immunization updates needed)

---

## 7. Data Requirements

### 7.1 Camp Data Enrichment Needed

Current `camps` table has good data but is missing key fields:

| Field | Current State | Action Needed | Phase |
|-------|---------------|---------------|-------|
| `registration_opens` | Text in `reg_date_2026` | ✅ Added, parse to DATE | 1 |
| `registration_closes` | Not captured | ✅ Added | 1 |
| `fsa_eligible` | Not captured | ✅ Added, research & populate | 1 |
| `extended_care_am_price` | Not captured | Add NUMERIC column | 1.5 |
| `extended_care_pm_price` | Not captured | Add NUMERIC column | 1.5 |
| `deposit_amount` | Not captured | Add NUMERIC column | 1.5 |
| `deposit_due_date` | Not captured | Add DATE column | 1.5 |
| `payment_due_date` | Not captured | Add DATE column | 1.5 |
| `latitude/longitude` | Not captured | Add columns, geocode addresses | 3 |
| `popularity_score` | Not captured | Derive from reviews + watchlist | 2 |
| `typical_fill_time` | Not captured | "Usually fills in 2 hours" | 2 |
| `scholarships_available` | Not captured | Add boolean | 4 |
| `scholarship_deadline` | Not captured | Add DATE | 4 |
| `session data` | `camp_sessions` table empty | Populate per-camp sessions | 2 |

### 7.2 Profile Data Extensions

| Field | Purpose | Phase | Status |
|-------|---------|-------|--------|
| `school_year_end` | Coverage gap calculation | 1 | ✅ Added |
| `school_year_start` | Coverage gap calculation | 1 | ✅ Added |
| `work_hours_start` | Schedule matching | 1 | ✅ Added |
| `work_hours_end` | Schedule matching | 1 | ✅ Added |
| `summer_budget` | Budget tracking | 1 | ✅ Added |
| `push_subscription` | Push notifications | 2 | Schema ready |
| `home_zip` | Carpool/routing | 3 | Schema ready |
| `home_area` | Carpool/routing | 3 | Schema ready |

### 7.3 Children Data Extensions

| Field | Purpose | Phase | Status |
|-------|---------|-------|--------|
| `school_name` | Context | 1 | ✅ Added |
| `school_year_end` | Per-child school dates | 1 | ✅ Added |
| `school_year_start` | Per-child school dates | 1 | ✅ Added |
| `emergency_contacts` | JSONB array | 3 | Schema ready |
| `physician_name` | Form export | 3 | Schema ready |
| `physician_phone` | Form export | 3 | Schema ready |
| `insurance_info` | Form export | 3 | Schema ready |

### 7.4 Scheduled Camps Data Extensions

| Field | Purpose | Phase | Status |
|-------|---------|-------|--------|
| `needs_extended_care_am` | Cost calculation | 1.5 | Needed |
| `needs_extended_care_pm` | Cost calculation | 1.5 | Needed |
| `payment_status` | Payment tracking | 1.5 | Needed |
| `waitlist_position` | Waitlist tracking | 1.5 | Needed |
| `cancellation_reason` | Camp-vs-user cancel | 1.5 | Needed |
| `cancelled_by` | Who cancelled | 1.5 | Needed |
| `expected_refund` | Refund tracking | 1.5 | Needed |
| `refund_received` | Refund tracking | 1.5 | Needed |

---

## 8. Technical Considerations

### 8.1 Push Notifications

**Approach**: Web Push API with service worker

**Stack**:
- Service worker registration in main app
- `web-push` package for Node.js backend
- VAPID key pair (store in environment variables)
- Supabase Edge Function or external cron for scheduled sends

**Alternative**: Use a push notification service (OneSignal, Firebase Cloud Messaging)

### 8.2 Geocoding & Routing

**Options**:
1. **Google Maps Platform** - Geocoding API + Directions API
   - Pro: Best data, route optimization
   - Con: Cost at scale

2. **Mapbox** - Geocoding + Directions
   - Pro: Generous free tier
   - Con: Less accurate for some addresses

3. **OpenStreetMap + OSRM** - Free
   - Pro: No cost
   - Con: More complex setup, less accurate

**Recommendation**: Start with Google Maps for accuracy, monitor costs.

### 8.3 File Storage

**Approach**: Supabase Storage

**Implementation**:
- Create `documents` bucket with RLS
- 10MB file size limit
- Allowed types: PDF, JPG, PNG
- Per-user folder structure: `{user_id}/{child_id}/{document_type}/`

### 8.4 Scheduled Jobs

**Options**:
1. **Supabase Edge Functions + pg_cron** - For database-driven schedules
2. **Vercel Cron** - For HTTP-triggered jobs (limited on free tier)
3. **External scheduler** - Railway, Render, or dedicated cron service

**Use Cases**:
- Registration reminder notifications (daily check at 8am)
- Watchlist monitoring (hourly for availability changes)
- Weekly digest emails (Sunday evening)

---

## 9. Success Metrics

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coverage gap visibility | 100% of scheduled summers show gaps | Database query |
| Missed registrations | Reduce by 80% (self-reported) | User survey |
| Time spent planning | Reduce by 50% | User survey |
| Form re-entry | From 5-7x to 1x | Feature usage |
| User retention | 70% return for 2027 season | Cohort analysis |

### Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Push notification opt-in | 60% of users | Database query |
| Average camps scheduled per child | 4+ weeks | Database query |
| Wishlist to scheduled conversion | 40% | Database query |
| Squad participation | 30% of users in at least one | Database query |
| Review submission rate | 20% of users leave 1+ review | Database query |

### Phase 1.5 Specific Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cost accuracy (actual vs estimated) | Within 10% | Post-season survey |
| Schedule conflicts prevented | Track conflicts caught | Database logging |
| Waitlist-to-alternative conversion | 60% find replacement | Database query |
| Payment deadlines met | 95% on-time | Database query |
| Sibling logistics warnings heeded | 70% adjust after warning | UX logging |
| Registration success rate | Track registered → confirmed | Database query |
| Alternative camp adoption | 50% when waitlisted | Database query |

---

## 10. Open Questions

### Product Decisions Needed

1. **Registration integration**: Do we link to external sites only, or attempt booking integration with select camps?
   - Recommendation: External links for MVP, explore partnerships for high-demand camps later

2. **Notification channels**: Push-only, email-only, or both with preferences?
   - Recommendation: Both with preferences, push as primary

3. **Co-parent/household model**: Are squads sufficient, or do we need a dedicated household concept?
   - Recommendation: Start with squads, add household concept if demand emerges

4. **School calendar data**: Hardcode SB Unified, let users set custom, or integrate with school calendars?
   - Recommendation: User-set with SB Unified as default

5. **Camp data sourcing**: Manual entry, scraping, or camp owner portal?
   - Recommendation: Continue scraping + admin editing; camp owner portal is Phase 4

### Technical Decisions Needed

1. **Push notification provider**: Native web push vs. third-party (OneSignal)?
2. **Geocoding provider**: Google Maps vs. Mapbox vs. free options?
3. **Scheduled job infrastructure**: Supabase pg_cron vs. external?
4. **Mobile app**: PWA sufficient or native apps needed?

---

## Appendix A: User Research Summary

### Pain Points (Ranked by Severity)

1. **Registration Deadline Chaos** - "Getting into our day camp is a blood sport—all spots go in 10 minutes"
2. **Coverage Gap Detection** - "There are still weeks of coverage needed between school and camp"
3. **Multi-Camp Coordination** - "5 different summer day camps plus in-home care"
4. **Cost Tracking** - "$5,000-$8,000+ per summer for multiple kids"
5. **Daily Logistics** - "I spent 45 mins doing two separate camp drop offs"
6. **Paperwork Duplication** - "Re-enter medical info 5-7 times per summer"

### Competitive Landscape

| Solution | Type | Limitation |
|----------|------|------------|
| CampMinder, UltraCamp | For camps | Helps camps, not parents |
| Cozi, Google Calendar | Generic | No camp-specific features |
| Parent spreadsheets | DIY | Manual, error-prone, no alerts |

### Target User Profile

- Primary: Mothers (71% of household scheduling)
- Secondary: Working parents needing full coverage
- Tertiary: Co-parents needing shared visibility
- Location: Santa Barbara (expandable)
- Kids: 1-3 children, ages 4-14

---

## Appendix B: Database Schema Changes

### Phase 1 Migrations (✅ COMPLETE)

```sql
-- Add school date configuration to profiles
ALTER TABLE profiles ADD COLUMN school_year_end DATE;
ALTER TABLE profiles ADD COLUMN school_year_start DATE;
ALTER TABLE profiles ADD COLUMN work_hours_start TIME DEFAULT '08:00';
ALTER TABLE profiles ADD COLUMN work_hours_end TIME DEFAULT '17:30';

-- Add registration date parsing to camps
ALTER TABLE camps ADD COLUMN registration_opens DATE;
ALTER TABLE camps ADD COLUMN registration_closes DATE;
ALTER TABLE camps ADD COLUMN fsa_eligible BOOLEAN DEFAULT FALSE;

-- Add budget to profiles
ALTER TABLE profiles ADD COLUMN summer_budget NUMERIC;
```

### Phase 1.5 Migrations (CURRENT)

```sql
-- Extended care pricing on camps
ALTER TABLE camps ADD COLUMN extended_care_am_price NUMERIC;
ALTER TABLE camps ADD COLUMN extended_care_pm_price NUMERIC;

-- Payment tracking on camps
ALTER TABLE camps ADD COLUMN deposit_amount NUMERIC;
ALTER TABLE camps ADD COLUMN deposit_due_date DATE;
ALTER TABLE camps ADD COLUMN payment_due_date DATE;

-- Extended care and payment tracking on scheduled_camps
ALTER TABLE scheduled_camps ADD COLUMN needs_extended_care_am BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_camps ADD COLUMN needs_extended_care_pm BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_camps ADD COLUMN payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'deposit_paid', 'full_paid'));

-- Waitlist tracking
ALTER TABLE scheduled_camps ADD COLUMN waitlist_position INTEGER;

-- Cancellation tracking
ALTER TABLE scheduled_camps ADD COLUMN cancelled_by TEXT
  CHECK (cancelled_by IN ('user', 'camp', NULL));
ALTER TABLE scheduled_camps ADD COLUMN cancellation_reason TEXT;
ALTER TABLE scheduled_camps ADD COLUMN expected_refund NUMERIC;
ALTER TABLE scheduled_camps ADD COLUMN refund_received BOOLEAN DEFAULT FALSE;

-- Add conflict_acknowledged for intentional double-booking (AM/PM camps)
ALTER TABLE scheduled_camps ADD COLUMN conflict_acknowledged BOOLEAN DEFAULT FALSE;
```

### Phase 2 Migrations

```sql
-- Add push subscription to profiles
ALTER TABLE profiles ADD COLUMN push_subscription JSONB;

-- Add geocoding to camps
ALTER TABLE camps ADD COLUMN latitude NUMERIC;
ALTER TABLE camps ADD COLUMN longitude NUMERIC;

-- Add school name to children
ALTER TABLE children ADD COLUMN school_name TEXT;
ALTER TABLE children ADD COLUMN school_year_end DATE;
ALTER TABLE children ADD COLUMN school_year_start DATE;
```

### Phase 3 Migrations

```sql
-- Extend children for form export
ALTER TABLE children ADD COLUMN emergency_contacts JSONB DEFAULT '[]';
ALTER TABLE children ADD COLUMN physician_name TEXT;
ALTER TABLE children ADD COLUMN physician_phone TEXT;
ALTER TABLE children ADD COLUMN insurance_info JSONB;

-- Add home location to profiles (for carpool matching)
ALTER TABLE profiles ADD COLUMN home_zip TEXT;
ALTER TABLE profiles ADD COLUMN home_area TEXT; -- e.g., "Mesa", "Downtown", "Goleta"

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  child_id UUID REFERENCES children(id),
  document_type TEXT CHECK (document_type IN ('immunization', 'insurance_card', 'custody', 'medical_form', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at DATE,
  notes TEXT
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);
```

---

## Appendix C: Component Inventory

### Existing Components (src/components/)

| Component | Size | Purpose |
|-----------|------|---------|
| SchedulePlanner.jsx | 93KB | Main calendar with drag-drop |
| OnboardingWizard.jsx | 26KB | Multi-step onboarding |
| SquadDetail.jsx | 22KB | Squad management |
| Dashboard.jsx | 19KB | Home dashboard with stats |
| CampComparison.jsx | 18KB | Side-by-side compare |
| Reviews.jsx | 18KB | Review display/submission |
| ChildrenManager.jsx | 13KB | Child CRUD |
| AdminDashboard.jsx | 30KB | Admin panel |
| AuthButton.jsx | 10KB | Sign in/out |
| GuidedTour.jsx | 7KB | Onboarding tour |
| SquadsPanel.jsx | 7KB | Squad list |
| JoinSquad.jsx | 7KB | Join via code |
| SquadNotificationBell.jsx | 6KB | Notification icon |
| CreateSquadModal.jsx | 5KB | Create squad form |
| FavoriteButton.jsx | 3KB | Heart icon |

### Phase 1 Components (✅ COMPLETE)

| Component | Status | Purpose |
|-----------|--------|---------|
| SchoolDatePicker | ✅ | Set school start/end dates |
| CostDashboard | ✅ | Enhanced cost breakdown |
| WorkHoursFilter | ✅ | Filter camps by coverage |
| WishlistView | ✅ | Renamed favorites with enhancements |
| PlanningModeToggle | ✅ | What-if planning |

### Phase 1.5 Components (CURRENT)

| Component | Phase | Purpose |
|-----------|-------|---------|
| ExtendedCareToggle | 1.5 | Mark extended care needs per scheduled camp |
| ConflictWarningModal | 1.5 | Warn on double-booking, allow override |
| SiblingLogisticsAlert | 1.5 | Warn when siblings at distant camps |
| WaitlistManager | 1.5 | Track waitlist position, find alternatives |
| PaymentTracker | 1.5 | Dashboard widget for upcoming payments |
| CampCancellationFlow | 1.5 | Handle camp-initiated cancellations |
| AlternativeCampSuggester | 1.5 | Suggest replacements for gaps/waitlists |

### Phase 2+ Components (PLANNED)

| Component | Phase | Purpose |
|-----------|-------|---------|
| RegistrationCountdown | 2 | Countdown badge |
| NotificationPermission | 2 | Push permission request |
| WatchlistManager | 2 | Watch settings per camp |
| BackupCampList | 2 | Pre-identified alternatives |
| DailySchedule | 3 | Today's logistics |
| RouteMap | 3 | Drop-off route visualization |
| CarpoolFinder | 3 | Find carpool partners |
| ChildProfileExport | 3 | Export for forms |
| DocumentVault | 3 | File upload/management |
| PackingListGenerator | 3 | Per-camp checklists |
| FirstDayReminder | 3 | Pre-camp notifications |

---

*Document prepared for stakeholder review. Feedback welcome on priorities, scope, and technical approach.*
