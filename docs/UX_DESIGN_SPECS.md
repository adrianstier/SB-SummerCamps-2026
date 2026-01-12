# Phase 1.5 UX Design Specifications

**Prepared by**: UX Engineer
**Date**: January 11, 2026
**Status**: Design Review Ready

---

## Executive Summary

This document provides enhanced UX specifications for Phase 1.5 components, building on the PM's functional specs with user-centered design decisions, interaction patterns, and accessibility requirements.

### Key UX Principles Applied

1. **Progressive Disclosure**: Show essential info first, details on demand
2. **Calm Alerts**: Informational, not alarmist - users are already stressed
3. **Quick Actions**: Minimize clicks for common tasks
4. **Visual Hierarchy**: Important info stands out, secondary info recedes
5. **Undo-ability**: Reversible actions reduce anxiety

---

## Design System Alignment

### Existing Color Tokens (from codebase analysis)

```css
/* Primary palette */
--earth-50 through --earth-900    /* Neutrals, text */
--sage-50 through --sage-800      /* Success, positive states */
--accent-50 through --accent-700  /* Primary actions, CTA */
--ocean-500                       /* Links, interactive elements */

/* Status colors */
#10b981  /* Green - Confirmed */
#3b82f6  /* Blue - Registered */
#6b7280  /* Gray - Planned */
#f59e0b  /* Amber - Waitlisted, Warning */
#ef4444  /* Red - Cancelled, Error, Overdue */
```

### Typography (from existing components)

```css
/* Headers */
font-family: 'Fraunces', serif    /* Modal titles */
font-size: 1.25rem (20px)         /* xl for modal headers */

/* Body */
font-family: system-ui            /* Body text */
font-size: 0.875rem (14px)        /* sm for labels, descriptions */
font-size: 0.75rem (12px)         /* xs for hints, metadata */
```

### Spacing & Layout

```css
/* Modal structure */
max-width: max-w-md (28rem) to max-w-4xl (56rem)
padding: 1.5rem (24px) for modal body
border-radius: 1rem (16px) for modals, 0.5rem (8px) for cards
```

---

## Component Design Specifications

## 1. ExtendedCareToggle

### UX Enhancements

**Problem Identified**: Parents need to quickly see the cost impact of extended care decisions without mental math.

**Solution**: Real-time cost preview with clear before/after comparison.

### Refined Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Extended Care                                              [?] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ○ ─────────────────────────────────────────────── [    ] │  │
│  │                                                           │  │
│  │  Morning care                          Not needed         │  │
│  │  7:30am drop-off                                          │  │
│  │  +$15/day if needed                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ● ═══════════════════════════════════════════════ [████] │  │
│  │                                                           │  │
│  │  Afternoon care                        +$100/week         │  │
│  │  5:30pm pickup                         ($20/day × 5)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📊 Cost breakdown                                        │  │
│  │                                                           │  │
│  │  Base camp fee              $350                          │  │
│  │  + Afternoon care           $100                          │  │
│  │  ────────────────────────────────                         │  │
│  │  Week total                 $450                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Toggle on | Slide animation (200ms), cost updates immediately, subtle pulse on total |
| Toggle off | Slide animation, cost updates, no confirmation needed |
| Hover on [?] | Tooltip: "Extended care extends camp hours to match your work schedule" |
| No pricing data | Toggle still visible, shows "Contact camp" instead of price |

### States

| State | Visual |
|-------|--------|
| Neither enabled | Both toggles off, total shows base price only |
| AM only | AM toggle blue/filled, PM gray, total updated |
| PM only | PM toggle blue/filled, AM gray, total updated |
| Both enabled | Both toggles blue, combined cost shown |
| Pricing unknown | Toggle enabled but grayed price text: "Pricing TBD" |

### Accessibility

- Toggle uses `role="switch"` with `aria-checked`
- Cost updates announced via `aria-live="polite"` region
- Focus visible ring on toggle (2px, --accent-500)
- Label and price readable without color (not color-only indication)

### Mobile Adaptation

- Full-width toggles with larger touch targets (48px height)
- Cost breakdown collapses to single line, tap to expand
- Sticky save button at bottom of screen

---

## 2. ConflictWarningModal

### UX Enhancements

**Problem Identified**: Users might feel blocked/frustrated. The modal should feel helpful, not punitive.

**Solution**: Present as a "heads up" with clear, easy options. Make the AM/PM override prominent for power users.

### Refined Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     ╭──────────────────────────────────────────────────────╮    │
│     │  ⚠️  Wait - Emma already has a camp this week       │    │
│     ╰──────────────────────────────────────────────────────╯    │
│                                                                 │
│     Week of June 15-19, 2026                                    │
│                                                                 │
│     ┌─ EXISTING ───────────────────────────────────────────┐    │
│     │                                                      │    │
│     │  🏕️  UCSB Ocean Science Camp                        │    │
│     │      9:00am - 3:00pm                                 │    │
│     │                                                      │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                 │
│                           ↓                                     │
│                                                                 │
│     ┌─ ADDING ─────────────────────────────────────────────┐    │
│     │                                                      │    │
│     │  🎨  Santa Barbara Art Camp                          │    │
│     │      9:00am - 4:00pm                                 │    │
│     │                                                      │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                 │
│     ─────────────────────────────────────────────────────────   │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐   │
│     │  💡 Are these half-day camps (AM + PM)?               │   │
│     │     [ Yes, schedule both ]                            │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                 │
│     ─────────────────────────────────────────────────────────   │
│                                                                 │
│     [ Cancel ]                              [ Replace with new ]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions

1. **Title tone**: "Wait" not "Error" - friendly pause, not rejection
2. **Show hours**: Helps user immediately see if AM/PM overlap makes sense
3. **AM/PM option prominent**: Most common legitimate use case, make it easy
4. **Replace as secondary**: Destructive action gets less visual weight

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Open modal | Focus trapped, ESC closes (cancels action) |
| "Yes, schedule both" | Saves with `conflict_acknowledged: true`, closes modal |
| "Replace with new" | Confirmation toast: "Replaced Ocean Science with Art Camp", deletes old |
| "Cancel" | Closes modal, no change made |
| Click outside | Same as Cancel |

### Copy Variations

| Scenario | Title |
|----------|-------|
| Single conflict | "Wait - {child} already has a camp this week" |
| Multiple conflicts | "Wait - {child} has {n} camps scheduled this week" |

### Accessibility

- Modal has `role="alertdialog"` and `aria-modal="true"`
- Focus moves to modal on open, first focusable element
- Warning icon has `aria-hidden="true"` (decorative)
- Screen reader announces: "Alert dialog: Schedule conflict. Emma already has a camp scheduled for the week of June 15"

---

## 3. SiblingLogisticsAlert

### UX Enhancements

**Problem Identified**: This is purely informational - should not feel like an error or block the user.

**Solution**: Toast/banner style, not modal. Appears after successful save, dismissible, with helpful next steps.

### Refined Visual Design - Toast Style (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🚗  Heads up: Week of June 15                              ✕   │
│                                                                 │
│  Emma (Beach Camp, Carpinteria) and Jake (Science Camp, Goleta) │
│  are ~12 miles apart. Morning drop-offs may take 25+ min.       │
│                                                                 │
│  [ Find closer options for Emma ]  [ Find closer options for Jake ]
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Alternative: Inline Alert (In Calendar View)

```
┌─ Week of June 15 ───────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ Emma         │  │ Jake         │                             │
│  │ Beach Camp   │  │ Science Camp │                             │
│  │ Carpinteria  │  │ Goleta       │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🚗 ~12 miles between camps • ~25 min drive               │   │
│  │    [ Find alternatives ]                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recommendation: Use Both

1. **Toast on first occurrence**: Immediately after scheduling, show toast
2. **Inline indicator persists**: Show subtle indicator on calendar week
3. **Don't re-toast**: Once dismissed, only show inline indicator

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Dismiss (✕) | Toast fades out, inline indicator remains |
| "Find closer options" | Opens AlternativeCampSuggester with proximity filter pre-set |
| Auto-dismiss | Toast disappears after 10 seconds if no interaction |
| Hover on inline | Shows distance and "Find alternatives" option |

### Copy Guidelines

- Use "~" for distance (approximate, ZIP-based)
- Time estimate: "25+ min" acknowledges variability
- Tone: Helpful, not alarming ("Heads up" not "Warning")

### Accessibility

- Toast has `role="status"` for screen readers
- Auto-dismiss paused on hover/focus
- Inline indicator has tooltip accessible via keyboard
- Color not sole indicator (icon + text)

---

## 4. WaitlistManager

### UX Enhancements

**Problem Identified**: Waitlist anxiety is real. Users need to feel in control and see their options.

**Solution**: Status-forward design with clear next steps and hope indicators.

### Refined Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ⏳                                                      │   │
│  │  WAITLISTED                                              │   │
│  │                                                          │   │
│  │  UCSB Ocean Science Camp                                 │   │
│  │  June 15-19, 2026 • Emma                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Your position                                           │   │
│  │                                                          │   │
│  │  ┌─────┐                                                 │   │
│  │  │  3  │  ← You're #3 on the list                        │   │
│  │  └─────┘                                                 │   │
│  │                                                          │   │
│  │  [ Update position ]  (if camp shares updates)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  What's your plan?                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🎯  Find a backup camp for this week                    │   │
│  │      Have a plan B ready if this doesn't work out        │   │
│  │                                                    →     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✅  Great news - I got in!                              │   │
│  │      Mark this camp as confirmed                         │   │
│  │                                                    →     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✕   Cancel waitlist                                     │   │
│  │      Remove this camp from your schedule                 │   │
│  │                                                    →     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions

1. **Position as hope indicator**: Big number helps user feel their place
2. **"What's your plan?"**: Action-oriented, empowering language
3. **Backup first**: Most helpful action, most prominent
4. **Card-based actions**: Each option is clearly separate with description

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Update position | Inline number input, saves on blur or Enter |
| Find backup | Opens AlternativeCampSuggester in slide-over panel |
| Mark confirmed | Status changes, calendar block updates, success toast |
| Cancel waitlist | Confirmation: "Remove from waitlist? You'll need to re-register if you change your mind" |

### Position Input States

| State | Display |
|-------|---------|
| Unknown | Empty box with "?" placeholder, hint "Enter when camp shares" |
| Known | Number displayed prominently |
| #1 | Special treatment: "You're next!" badge |
| High number (10+) | Subtle hint: "Consider finding a backup" |

### Accessibility

- Position input has `aria-label="Waitlist position number"`
- Action cards are buttons with full description as accessible name
- Status badge announced on view load

---

## 5. AlternativeCampSuggester

### UX Enhancements

**Problem Identified**: Finding a replacement under time pressure is stressful. Need fast, relevant results.

**Solution**: Pre-filtered, sorted by relevance, with quick scheduling action.

### Refined Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ← Back                                                         │
│                                                                 │
│  Find a camp for Emma                                           │
│  Week of June 15-19, 2026                                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [All types ▾]  [$0-500 ▾]  [Any area ▾]  [✓ Has spots]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  SIMILAR TO OCEAN SCIENCE (STEM)                      3 camps   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔬  SB Museum Science Week                              │   │
│  │      Ages 6-12 • $295/week • Downtown                    │   │
│  │                                                          │   │
│  │      ✓ Registration open    ★ 4.8 (12 reviews)          │   │
│  │                                                          │   │
│  │                               [ View ]  [ Schedule → ]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🌊  Sea Center Camp                        RECOMMENDED   │   │
│  │      Ages 5-10 • $350/week • Waterfront                  │   │
│  │                                                          │   │
│  │      ⚡ 3 spots left        ★ 4.9 (28 reviews)          │   │
│  │                                                          │   │
│  │                               [ View ]  [ Schedule → ]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  OTHER OPTIONS                                        12 camps  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🎨  Art Camp                                            │   │
│  │      ...                                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ Show 9 more camps ]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions

1. **Pre-filtered**: Age-appropriate only, same week only
2. **Relevance sorting**: Similar category first, then by availability
3. **"Recommended" badge**: For high-rated camps with spots
4. **Scarcity indicator**: "3 spots left" creates urgency appropriately
5. **Quick schedule**: Most important action, most prominent

### Filter Logic

```
Default filters applied automatically:
- Child's age range
- Selected week
- Status != cancelled

Sorting priority:
1. Has spots available (confirmed or registration open)
2. Same category as original camp
3. Higher rating
4. Lower price
```

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Schedule → | Schedules camp, shows confirmation, returns to previous view |
| View | Expands to show full camp details inline |
| Filter change | Results update immediately (debounced 200ms) |
| Show more | Loads next 10 camps, button updates count |

### Empty State

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  😕  No camps available this week                            │
│                                                              │
│  Try adjusting your filters or check nearby weeks.           │
│                                                              │
│  [ Check week before ]  [ Check week after ]                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Accessibility

- Results list uses `role="list"` with descriptive labels
- Filter changes announced via live region
- "Schedule" buttons have full context: "Schedule Sea Center Camp for Emma, June 15-19"
- Keyboard navigation through results with arrow keys

---

## 6. PaymentTracker

### UX Enhancements

**Problem Identified**: Payment deadlines are high-stakes but often buried. Need prominent, actionable visibility.

**Solution**: Timeline-based display with urgency indicators and quick status updates.

### Refined Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Payments                                                   ⚙️  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🔴  OVERDUE                                              │  │
│  │                                                           │  │
│  │  Beach Camp • Jake                                        │  │
│  │  Deposit $100 was due Jan 10                              │  │
│  │                                                           │  │
│  │  ⚠️ Contact camp to confirm your spot                     │  │
│  │                                            [ Mark paid ▾] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🟡  DUE THIS WEEK                                        │  │
│  │                                                           │  │
│  │  Ocean Science • Emma                                     │  │
│  │  Full payment $350 due Jan 15 (3 days)                    │  │
│  │                                                           │  │
│  │  Status: Deposit paid ($150)               [ Mark paid ▾] │  │
│  │          Balance: $200                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  COMING UP                                                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Art Camp • Emma                                          │  │
│  │  Full payment $275 due Feb 1                              │  │
│  │  Status: Not started                       [ Mark paid ▾] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Sports Camp • Jake                                       │  │
│  │  Deposit $50 due Feb 15                                   │  │
│  │  Status: Not started                       [ Mark paid ▾] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💰  Summary                                                    │
│      Due this month: $650                                       │
│      Due next month: $325                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions

1. **Overdue at top**: Most urgent, can't be missed
2. **Relative dates**: "3 days" more actionable than "Jan 15"
3. **Balance calculation**: Show remaining amount after deposit
4. **Warning for overdue**: Actionable guidance, not just status
5. **Monthly summary**: Quick scan for budget planning

### Status Update Flow

```
Mark paid ▾
├── Deposit paid
│   └── Opens: Amount input (pre-filled with deposit amount)
│   └── Saves: Status updates, balance recalculates
│
└── Fully paid
    └── Opens: Confirmation only
    └── Saves: Status = full_paid, row moves to "Paid" section
```

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Mark paid → Deposit | Shows amount input, saves on confirm |
| Mark paid → Fully paid | Updates status, moves to bottom/hidden |
| Settings (⚙️) | Opens payment notification preferences |
| Click camp name | Opens camp detail modal |

### Empty State

```
No upcoming payments.

All camps are either fully paid or don't have payment info on file.
```

### Accessibility

- Urgency sections use `aria-label` with count: "Overdue payments, 1 item"
- Relative dates include absolute date for screen readers: "Due in 3 days, January 15"
- Status dropdown fully keyboard accessible
- Color indicators paired with icons (red circle, yellow circle)

---

## 7. CampCancellationFlow

### UX Enhancements

**Problem Identified**: Cancellations are emotional. User needs clarity on impact and next steps.

**Solution**: Two distinct flows - user-initiated (careful confirmation) vs camp-initiated (supportive recovery).

### User-Initiated Cancellation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Cancel this camp?                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🏕️  UCSB Ocean Science Camp                             │   │
│  │      June 15-19, 2026 • Emma                             │   │
│  │      Paid: $350                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Why are you cancelling? (optional)                             │
│                                                                 │
│  [ Schedule conflict    ▾]                                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Refund estimate                                          │   │
│  │                                                          │   │
│  │ Based on camp's policy, you may receive:                 │   │
│  │                                                          │   │
│  │ $[  280  ]  (80% of $350)                                │   │
│  │                                                          │   │
│  │ Contact camp directly to confirm refund amount.          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚠️  This will create a coverage gap for Emma this week.        │
│                                                                 │
│  [ Find replacement first ]              [ Cancel this camp ]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Camp-Initiated Cancellation (Notification View)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ❌  Camp Cancelled by Provider                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  UCSB Ocean Science Camp cancelled their June 15-19 session.    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Reason: Low enrollment                                  │   │
│  │  Your refund: $350 (full amount)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Emma now needs coverage for June 15-19.                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🎯  Find a replacement camp                       →     │   │
│  │      We'll show you available options for this week      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📅  Leave as a gap                                →     │   │
│  │      Mark this week as needing coverage                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Refund tracking                                                │
│  ○ Awaiting refund    ● Received                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions

1. **Separate flows**: User choice vs camp notification have different emotional needs
2. **Refund prominent**: Money matters, make it clear
3. **Gap warning**: Remind them of the consequence
4. **Find replacement first**: Encourage proactive behavior
5. **Reason tracking**: Helps with data but is optional

### Cancellation Reasons (User-Initiated)

```
- Schedule conflict
- Found a better option
- Child's preference changed
- Family plans changed
- Financial reasons
- Health/safety concerns
- Other
```

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Find replacement first | Opens AlternativeCampSuggester, doesn't cancel yet |
| Cancel this camp | Shows confirmation: "Are you sure? This can't be undone." |
| Refund input | Allows manual entry, stored for tracking |
| Refund status toggle | Updates database, shows confirmation |

### Accessibility

- Radio buttons for refund status have clear labels
- Destructive action (Cancel) has distinct visual weight and confirmation
- Gap warning announced to screen readers
- Focus management on flow transitions

---

## Responsive Design Specifications

### Breakpoints

```css
/* Mobile first */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile Adaptations (< 640px)

| Component | Desktop | Mobile |
|-----------|---------|--------|
| Modals | Centered, max-width | Full-screen, slide up |
| Toggle rows | Side-by-side | Stacked |
| Action buttons | Inline | Full-width, stacked |
| Payment cards | Horizontal | Vertical layout |
| Camp suggestion cards | Grid of 2 | Single column |

### Touch Targets

- Minimum 44x44px for all interactive elements
- 8px minimum spacing between touch targets
- Toggle switches: 48px wide minimum

---

## Animation & Motion

### Timing Functions

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);     /* For entrances */
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1); /* For toggles */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* For emphasis */
```

### Duration Guidelines

| Action | Duration |
|--------|----------|
| Toggle switch | 200ms |
| Modal open/close | 250ms |
| Toast appear | 200ms |
| Toast auto-dismiss | 300ms fade |
| Cost update | 150ms |
| Card hover lift | 150ms |

### Motion Patterns

1. **Modal entrance**: Fade in + slight scale up (0.95 → 1.0)
2. **Toast entrance**: Slide in from bottom + fade
3. **Toggle**: Slide with slight bounce (ease-spring)
4. **Number updates**: Brief pulse animation
5. **Status change**: Color transition + icon swap

---

## Implementation Notes for Tech Lead

### Shared Utilities Needed

```javascript
// formatters.js
export function formatCurrency(amount) { ... }
export function formatRelativeDate(date) { ... }  // "3 days", "Tomorrow"
export function formatDateRange(start, end) { ... } // "June 15-19, 2026"

// distance.js
export function estimateDriveTime(miles) { ... }  // Returns "~25 min"
export function formatDistance(miles) { ... }     // Returns "~12 miles"
```

### Component Dependencies

```
ExtendedCareToggle
├── Uses: Toggle component, formatCurrency
└── Updates: CostDashboard (via context)

ConflictWarningModal
├── Uses: Modal component, CampCard component
└── Calls: scheduledCamps.check_conflict()

SiblingLogisticsAlert
├── Uses: Toast component
└── Calls: calculate_zip_distance()

WaitlistManager
├── Uses: StatusBadge, ActionCard components
└── Opens: AlternativeCampSuggester

AlternativeCampSuggester
├── Uses: CampCard, FilterBar components
└── Calls: camps.search() with filters

PaymentTracker
├── Uses: StatusBadge, Dropdown components
└── Calls: scheduled_camps.update_payment_status()

CampCancellationFlow
├── Uses: Modal, RadioGroup, Input components
└── Opens: AlternativeCampSuggester
└── Calls: scheduled_camps.cancel()
```

---

## Next Steps

1. **Design Review**: Schedule review with PM and Tech Lead
2. **Prototype**: Create Figma prototype for user testing
3. **User Testing**: Validate flows with 3-5 target users
4. **Iteration**: Incorporate feedback before implementation
5. **Handoff**: Prepare assets and final specs for development

---

*This document should be reviewed alongside [COMPONENT_SPECS.md](./COMPONENT_SPECS.md) for technical requirements.*
