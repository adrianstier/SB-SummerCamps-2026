# Phase 1.5 Component Specifications

**Prepared for**: UX Engineer
**Prepared by**: Project Manager
**Date**: January 11, 2026
**Status**: Ready for Design & Implementation

---

## Overview

This document provides detailed specifications for all UI components required in Phase 1.5. Each component includes:
- User story and acceptance criteria
- Props/API interface
- State management requirements
- Visual/interaction requirements
- Brand voice guidelines for copy
- Existing patterns to follow

**Brand Voice Reminder**: Direct, confident, no exclamation points. See [CLAUDE.md](../CLAUDE.md) for full guidelines.

---

## Table of Contents

1. [ExtendedCareToggle](#1-extendedcaretoggle)
2. [ConflictWarningModal](#2-conflictwarningmodal)
3. [SiblingLogisticsAlert](#3-siblinglogisticsalert)
4. [WaitlistManager](#4-waitlistmanager)
5. [AlternativeCampSuggester](#5-alternativecampsuggester)
6. [PaymentTracker](#6-paymenttracker)
7. [CampCancellationFlow](#7-campcancellationflow)

---

## 1. ExtendedCareToggle

### User Story

> As a working parent who needs extended care at most camps, I want to see accurate total costs including before/after care fees, so I can budget correctly.

### Location

- Appears on scheduled camp detail view (click on calendar block)
- Appears in camp scheduling modal when adding new camp

### Props Interface

```typescript
interface ExtendedCareToggleProps {
  scheduledCampId: string;
  campId: string;
  // Camp's extended care pricing (from camps table)
  extendedCareAmPrice: number | null;  // Daily rate
  extendedCarePmPrice: number | null;  // Daily rate
  // Current state
  needsExtendedCareAm: boolean;
  needsExtendedCarePm: boolean;
  // Callbacks
  onToggleAm: (enabled: boolean) => void;
  onTogglePm: (enabled: boolean) => void;
}
```

### Visual Requirements

```
┌────────────────────────────────────────────────────────┐
│ Extended Care                                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Toggle] Morning care (7:30am-9:00am)           │   │
│  │          +$15/day ($75/week)                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Toggle] Afternoon care (3:00pm-5:30pm)         │   │
│  │          +$20/day ($100/week)                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ─────────────────────────────────────────────────────  │
│  Week total: $350 base + $175 care = $525             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### States

| State | Display |
|-------|---------|
| Pricing available | Show toggle with daily and weekly cost |
| Pricing unavailable | Show toggle with "Contact camp for pricing" |
| Toggle enabled | Blue/primary color, cost added to total |
| Toggle disabled | Gray, cost not included |

### Copy Guidelines

| Element | Copy |
|---------|------|
| Section header | "Extended Care" |
| AM toggle label | "Morning care (7:30am-9:00am)" or actual hours from camp |
| PM toggle label | "Afternoon care (3:00pm-5:30pm)" or actual hours |
| Price format | "+$15/day ($75/week)" |
| No pricing | "Contact camp for pricing" |
| Total line | "Week total: $350 base + $175 care = $525" |

### Integration Points

- Updates `scheduled_camps.needs_extended_care_am` and `needs_extended_care_pm`
- CostDashboard must recalculate totals when these change
- Calendar block should show updated cost

---

## 2. ConflictWarningModal

### User Story

> As a parent scheduling camps, I want to be warned if I accidentally double-book my child, so I don't create impossible schedules.

### Trigger

- Fires when user attempts to schedule a camp for a week where the child already has a camp scheduled
- Called from `SchedulePlanner.jsx` before saving

### Props Interface

```typescript
interface ConflictWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  // The new camp being scheduled
  newCamp: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  // The existing conflicting camp(s)
  conflicts: Array<{
    campName: string;
    startDate: Date;
    endDate: Date;
    scheduledCampId: string;
  }>;
  // Child info
  childName: string;
  // Actions
  onCancel: () => void;  // Don't schedule the new camp
  onAcknowledge: () => void;  // Schedule anyway (AM/PM camps)
  onReplace: (conflictId: string) => void;  // Replace existing with new
}
```

### Visual Requirements

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚠️  Schedule Conflict                                       │
│                                                              │
│  Emma already has a camp scheduled this week:                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🏕️ UCSB Ocean Science Camp                           │  │
│  │     June 15-19, 2026                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  You're trying to add:                                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🎨 Santa Barbara Art Camp                            │  │
│  │     June 15-19, 2026                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  [Cancel]   [These are AM/PM camps]   [Replace existing]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### States

| State | Behavior |
|-------|----------|
| Single conflict | Show one existing camp |
| Multiple conflicts | Show list of all conflicting camps |
| After acknowledge | Save with `conflict_acknowledged = true` |
| After replace | Delete existing, save new |

### Copy Guidelines

| Element | Copy |
|---------|------|
| Modal title | "Schedule Conflict" |
| Conflict message | "{childName} already has a camp scheduled this week:" |
| New camp intro | "You're trying to add:" |
| Cancel button | "Cancel" |
| Acknowledge button | "These are AM/PM camps" |
| Replace button | "Replace existing" |

### Edge Cases

- If user has multiple children and schedules for wrong child, this won't catch it (different feature)
- Half-day camps are legitimate overlaps - the "AM/PM camps" button handles this

---

## 3. SiblingLogisticsAlert

### User Story

> As a parent with multiple children, I want to be warned when I've scheduled camps that are far apart on the same day, so I can avoid impossible logistics.

### Trigger

- Fires after scheduling when siblings have camps in the same week
- Threshold: camps > 10 miles apart (configurable)
- Uses ZIP-code-based distance estimation

### Props Interface

```typescript
interface SiblingLogisticsAlertProps {
  isOpen: boolean;
  onClose: () => void;
  // The scheduled camps that triggered the alert
  sibling1: {
    childName: string;
    campName: string;
    campLocation: string;
    zipCode: string;
  };
  sibling2: {
    childName: string;
    campName: string;
    campLocation: string;
    zipCode: string;
  };
  // Calculated distance
  distanceMiles: number;
  estimatedDriveTime: string;  // e.g., "25 min"
  // Actions
  onDismiss: () => void;
  onFindAlternatives: (forChild: 'sibling1' | 'sibling2') => void;
}
```

### Visual Requirements

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🚗  Heads up: distant drop-offs                             │
│                                                              │
│  Week of June 15, you have:                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Emma → Beach Camp (Carpinteria)                      │  │
│  │  Jake → Science Camp (Goleta)                         │  │
│  │                                                        │  │
│  │  📍 ~12 miles apart • ~25 min drive                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Same-morning drop-offs may be challenging.                  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  [Got it]   [Find camps near Emma's]   [Find camps near Jake's]
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Copy Guidelines

| Element | Copy |
|---------|------|
| Modal title | "Heads up: distant drop-offs" |
| Context | "Week of {date}, you have:" |
| Distance | "~{miles} miles apart • ~{time} drive" |
| Warning | "Same-morning drop-offs may be challenging." |
| Dismiss button | "Got it" |
| Alternative buttons | "Find camps near {childName}'s" |

### Notes

- Distance is approximate (ZIP-code based)
- Drive time estimated at 2 min/mile average (accounts for traffic)
- Show even if user dismisses (they might forget)
- Do NOT block scheduling - this is informational

---

## 4. WaitlistManager

### User Story

> As a parent who got waitlisted at a popular camp, I want to quickly find alternative camps for that week, so I don't have a coverage gap.

### Location

- Appears in scheduled camp detail view when status = 'waitlisted'
- Also accessible from a "Waitlisted" filter in schedule view

### Props Interface

```typescript
interface WaitlistManagerProps {
  scheduledCamp: {
    id: string;
    campId: string;
    campName: string;
    childId: string;
    childName: string;
    startDate: Date;
    endDate: Date;
    waitlistPosition: number | null;
  };
  // Callbacks
  onUpdatePosition: (position: number | null) => void;
  onFindAlternatives: () => void;
  onMarkConfirmed: () => void;
  onCancel: () => void;
}
```

### Visual Requirements

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ⏳ Waitlisted                                             │
│                                                            │
│  UCSB Ocean Science Camp                                   │
│  June 15-19, 2026 • Emma                                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Waitlist position: [ 3 ] (update if known)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                            │
│  What would you like to do?                                │
│                                                            │
│  [Find backup camps]   [Got in! Mark confirmed]            │
│                                                            │
│  [Cancel waitlist]                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### States

| State | Display |
|-------|---------|
| Position unknown | Input field empty, placeholder "Unknown" |
| Position known | Show number in input |
| Finding alternatives | Opens AlternativeCampSuggester |

### Copy Guidelines

| Element | Copy |
|---------|------|
| Status badge | "Waitlisted" |
| Position label | "Waitlist position:" |
| Position hint | "(update if known)" |
| CTA question | "What would you like to do?" |
| Find backup | "Find backup camps" |
| Confirm button | "Got in! Mark confirmed" |
| Cancel button | "Cancel waitlist" |

---

## 5. AlternativeCampSuggester

### User Story

> As a parent who needs to find a replacement camp (due to waitlist, cancellation, or coverage gap), I want relevant suggestions based on the same week and my child's age.

### Trigger

- Called from WaitlistManager "Find backup camps"
- Called from CampCancellationFlow "Find replacement"
- Called from coverage gap "Find camp" button

### Props Interface

```typescript
interface AlternativeCampSuggesterProps {
  context: {
    childId: string;
    childName: string;
    childAge: number;
    weekStart: Date;
    weekEnd: Date;
    // Optional: the original camp to exclude from results
    excludeCampId?: string;
    // Optional: preferred category from original camp
    preferredCategory?: string;
  };
  // Callbacks
  onSelectCamp: (campId: string) => void;
  onClose: () => void;
}
```

### Visual Requirements

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Find a camp for Emma                                          │
│  Week of June 15-19, 2026                                      │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Filter: [All categories ▾]  [Price ▾]  [Has spots ✓]  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  Similar to UCSB Ocean Science (STEM):                         │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  🔬 SB Museum Science Week                             │    │
│  │     Ages 6-12 • $295/week • STEM                       │    │
│  │     Registration open                       [Schedule] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  🌊 Ty Warner Sea Center Camp                          │    │
│  │     Ages 5-10 • $350/week • Nature                     │    │
│  │     5 spots left                            [Schedule] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  Other camps available this week:                              │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  🎨 SB Arts Camp                                       │    │
│  │     Ages 5-14 • $275/week • Art                        │    │
│  │     Registration open                       [Schedule] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  [Show more camps]                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Logic

1. First, show camps in same category as original (if provided)
2. Then, show other available camps
3. Filter by child's age automatically
4. Filter by week availability
5. Sort by: has spots > price > rating

### Copy Guidelines

| Element | Copy |
|---------|------|
| Header | "Find a camp for {childName}" |
| Week context | "Week of {date range}" |
| Similar section | "Similar to {campName} ({category}):" |
| Other section | "Other camps available this week:" |
| Spots indicator | "{n} spots left" or "Registration open" |
| Schedule button | "Schedule" |
| Show more | "Show more camps" |

---

## 6. PaymentTracker

### User Story

> As a parent juggling multiple camp payments, I want reminders before payment deadlines, so I don't lose my spot due to missed payment.

### Location

- Dashboard widget (below or beside CostDashboard)
- Also accessible from Settings > Payments

### Props Interface

```typescript
interface PaymentTrackerProps {
  scheduledCamps: Array<{
    id: string;
    campId: string;
    campName: string;
    childName: string;
    startDate: Date;
    paymentStatus: 'unpaid' | 'deposit_paid' | 'full_paid';
    // From camps table
    depositAmount: number | null;
    depositDueDate: Date | null;
    paymentDueDate: Date | null;
    totalPrice: number;
  }>;
  // Callbacks
  onUpdateStatus: (scheduledCampId: string, status: PaymentStatus) => void;
}
```

### Visual Requirements

```
┌────────────────────────────────────────────────────────────┐
│  Upcoming Payments                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⚠️ DUE THIS WEEK                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UCSB Ocean Science • Emma                           │  │
│  │  Deposit: $150 due Jan 15                            │  │
│  │  [Mark paid ▾]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  COMING UP                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Beach Camp • Jake                                   │  │
│  │  Full payment: $350 due Feb 1                        │  │
│  │  Status: Deposit paid ($100)         [Mark paid ▾]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Art Camp • Emma                                     │  │
│  │  Full payment: $275 due Feb 15                       │  │
│  │  Status: Unpaid                      [Mark paid ▾]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────────  │
│  💵 Total due this month: $775                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### States

| State | Display |
|-------|---------|
| Overdue | Red highlight, "OVERDUE" badge |
| Due this week | Yellow/amber highlight |
| Coming up | Normal display |
| Paid | Green checkmark, grayed out |
| No payment info | "Contact camp for payment details" |

### Copy Guidelines

| Element | Copy |
|---------|------|
| Widget title | "Upcoming Payments" |
| Overdue section | "OVERDUE" |
| This week section | "DUE THIS WEEK" |
| Coming up section | "COMING UP" |
| Deposit line | "Deposit: ${amount} due {date}" |
| Full payment line | "Full payment: ${amount} due {date}" |
| Status prefix | "Status: {status}" |
| Mark paid dropdown | "Mark paid" with options: "Deposit paid", "Fully paid" |
| Monthly total | "Total due this month: ${amount}" |
| No info | "Contact camp for payment details" |

---

## 7. CampCancellationFlow

### User Story

> As a parent whose camp was cancelled by the provider, I want to be notified immediately and helped to find a replacement.

### Trigger

- When user marks status as "Cancelled"
- When camp-initiated cancellation notification received

### Props Interface

```typescript
interface CampCancellationFlowProps {
  scheduledCamp: {
    id: string;
    campId: string;
    campName: string;
    childId: string;
    childName: string;
    startDate: Date;
    endDate: Date;
    price: number;
  };
  // Callbacks
  onConfirmCancellation: (details: {
    cancelledBy: 'user' | 'camp';
    reason: string;
    expectedRefund: number | null;
  }) => void;
  onFindReplacement: () => void;
  onClose: () => void;
}
```

### Visual Requirements

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Cancel Camp                                               │
│                                                            │
│  UCSB Ocean Science Camp                                   │
│  June 15-19, 2026 • Emma • $350                            │
│                                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                            │
│  Who is cancelling?                                        │
│                                                            │
│  ○ I'm cancelling                                          │
│  ○ The camp cancelled this session                         │
│                                                            │
│  Reason (optional):                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Schedule conflict / Found better option / etc.       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Expected refund: $[___________] (based on camp policy)    │
│                                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                            │
│  ⚠️ This will create a coverage gap for this week.         │
│                                                            │
│  [Confirm cancellation]   [Find replacement first]         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### After Cancellation View (Camp-Initiated)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ❌ Camp Cancelled                                         │
│                                                            │
│  UCSB Ocean Science Camp cancelled their                   │
│  June 15-19 session.                                       │
│                                                            │
│  Reason: Low enrollment                                    │
│  Expected refund: $350                                     │
│                                                            │
│  Emma now has a coverage gap this week.                    │
│                                                            │
│  [Find replacement camp]   [Leave as gap]                  │
│                                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                            │
│  Refund status: ○ Not received  ○ Received                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Copy Guidelines

| Element | Copy |
|---------|------|
| Modal title (user) | "Cancel Camp" |
| Modal title (camp) | "Camp Cancelled" |
| Who cancelling | "Who is cancelling?" |
| User option | "I'm cancelling" |
| Camp option | "The camp cancelled this session" |
| Reason label | "Reason (optional):" |
| Refund label | "Expected refund:" |
| Gap warning | "This will create a coverage gap for this week." |
| Confirm button | "Confirm cancellation" |
| Find replacement | "Find replacement first" or "Find replacement camp" |
| Leave gap | "Leave as gap" |
| Refund status | "Refund status:" with "Not received" / "Received" |

---

## Shared Components & Patterns

### Status Badges

Use consistent badge styling across all components:

| Status | Color | Icon |
|--------|-------|------|
| Planned | Gray | 📋 |
| Registered | Blue | ✍️ |
| Confirmed | Green | ✅ |
| Waitlisted | Yellow | ⏳ |
| Cancelled | Red | ❌ |

### Price Display

Always format prices consistently:
- Use `$` prefix
- No cents for whole dollars: `$350` not `$350.00`
- Include `/week` when contextually helpful
- Use comma for thousands: `$1,200`

### Date Display

- Short format in lists: "Jun 15-19"
- Full format in details: "June 15-19, 2026"
- Relative for deadlines: "Due in 3 days" or "Due tomorrow"

### Empty States

Follow brand voice - helpful, not sad:
- "No payments due this month."
- "No camps on waitlist."
- "All coverage gaps filled."

### Error States

Calm and clear:
- "Couldn't load payment info. Refresh to try again."
- "Something went wrong. Check your connection."

---

## Existing Patterns to Follow

Reference these existing components for consistent patterns:

| Pattern | Reference Component |
|---------|---------------------|
| Modal dialogs | `CreateSquadModal.jsx` |
| Dashboard widgets | `CostDashboard.jsx` |
| Toggle switches | Tailwind UI / existing Settings |
| Card layouts | Camp cards in `SchedulePlanner.jsx` |
| Status dropdowns | Status selector in scheduled camp detail |
| Form inputs | `ChildrenManager.jsx` |

---

## Accessibility Requirements

All components must meet WCAG 2.1 AA:

- [ ] Keyboard navigation for all interactive elements
- [ ] Focus management in modals
- [ ] ARIA labels for icons and toggles
- [ ] Color contrast minimum 4.5:1
- [ ] Screen reader announcements for status changes
- [ ] Touch targets minimum 44x44px on mobile

---

## Mobile Considerations

- All modals should be full-screen on mobile (< 640px)
- Touch-friendly toggle sizes
- Swipe to dismiss where appropriate
- Bottom sheet pattern for action menus

---

*Questions? Reach out to the Project Manager for clarification on any specification.*
