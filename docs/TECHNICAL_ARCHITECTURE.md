# Phase 1.5 Technical Architecture

**Prepared by**: Tech Lead
**Date**: January 11, 2026
**Status**: Ready for Implementation

---

## Executive Summary

This document provides the comprehensive technical architecture for Phase 1.5 of SB Summer Camps 2026. It translates the UX designs and business requirements into implementable technical specifications, establishing patterns that will guide Database Engineers, Frontend Engineers, and Backend Engineers.

### Architecture Philosophy

1. **Extend, don't rewrite**: Build on existing patterns in AuthContext, supabase.js, and component structure
2. **Security first**: Validate at client, server, and database layers
3. **Graceful degradation**: All features work if Supabase is unavailable (demo mode)
4. **Performance conscious**: Minimize API calls, use memoization, batch operations
5. **Type-safe**: Use Zod validation for all data operations

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Architecture](#2-database-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [API & Data Layer](#4-api--data-layer)
5. [Component Technical Specifications](#5-component-technical-specifications)
6. [State Management Strategy](#6-state-management-strategy)
7. [Security Architecture](#7-security-architecture)
8. [Performance Optimization](#8-performance-optimization)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Guidelines](#10-implementation-guidelines)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React SPA)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐   │
│  │ AuthContext   │  │ Components    │  │ Utility Libraries         │   │
│  │ (Global State)│  │ (UI Layer)    │  │ (supabase.js, validation) │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────────┬─────────────┘   │
│          │                  │                        │                  │
│          └──────────────────┴────────────────────────┘                  │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┼──────────────────────────────────────────┐
│                       SUPABASE BACKEND                                  │
├──────────────────────────────┼──────────────────────────────────────────┤
│                              ▼                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐   │
│  │ Auth Service  │  │ REST API      │  │ Realtime Subscriptions    │   │
│  │ (Google OAuth)│  │ (PostgREST)   │  │ (Postgres Changes)        │   │
│  └───────────────┘  └───────────────┘  └───────────────────────────┘   │
│          │                  │                        │                  │
│          └──────────────────┴────────────────────────┘                  │
│                              │                                          │
│  ┌───────────────────────────┴───────────────────────────────────────┐  │
│  │                    PostgreSQL Database                            │  │
│  │  ┌─────────┐  ┌─────────────────┐  ┌────────────────────────┐    │  │
│  │  │ Tables  │  │ RLS Policies    │  │ Functions (RPC)        │    │  │
│  │  └─────────┘  └─────────────────┘  └────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                    EXPRESS API SERVER (Optional)                        │
├──────────────────────────────┴──────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐   │
│  │ Auth Middleware│ │ API Routes    │  │ Background Jobs           │   │
│  └───────────────┘  └───────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | Vite | 5.x | Build tool |
| | Tailwind CSS | 3.x | Styling |
| **Backend** | Supabase | - | Database, Auth, Storage |
| | Express | 4.x | Optional API server |
| **Database** | PostgreSQL | 15 | Primary data store |
| **Validation** | Zod | 3.x | Runtime type validation |
| **Testing** | Vitest | 1.x | Unit testing |
| | Playwright | 1.x | E2E testing |
| **Deployment** | Vercel | - | Frontend hosting |

### 1.3 Phase 1.5 Feature Streams

```
PHASE 1.5 STREAMS
│
├── STREAM A: Extended Care Cost Tracking
│   ├── Database: camps.extended_care_am_price, extended_care_pm_price
│   ├── Database: scheduled_camps.needs_extended_care_am, needs_extended_care_pm
│   ├── API: updateScheduledCampExtendedCare()
│   └── UI: ExtendedCareToggle component
│
├── STREAM B: Schedule Conflict Detection
│   ├── Database: scheduled_camps.conflict_acknowledged
│   ├── RPC: check_schedule_conflict()
│   ├── API: checkConflicts() wrapper
│   └── UI: ConflictWarningModal component
│
├── STREAM C: Waitlist & Cancellation Workflows
│   ├── Database: scheduled_camps.waitlist_position, cancelled_by, etc.
│   ├── API: updateWaitlistPosition(), cancelScheduledCamp()
│   └── UI: WaitlistManager, CampCancellationFlow, AlternativeCampSuggester
│
├── STREAM D: Payment Tracking
│   ├── Database: camps.deposit_amount, payment_due_date, etc.
│   ├── Database: scheduled_camps.payment_status
│   ├── API: updatePaymentStatus(), getUpcomingPayments()
│   └── UI: PaymentTracker widget
│
└── STREAM E: Sibling Logistics
    ├── Database: camps.zip_code, zip_code_coords table
    ├── RPC: calculate_zip_distance()
    ├── API: checkSiblingLogistics()
    └── UI: SiblingLogisticsAlert (toast/inline)
```

---

## 2. Database Architecture

### 2.1 Schema Changes (Phase 1.5)

The migration file [phase1_5_critical_gaps.sql](../backend/migrations/phase1_5_critical_gaps.sql) implements all schema changes. Key additions:

#### Camps Table Extensions

```sql
-- Extended care pricing
extended_care_am_price  NUMERIC  -- Daily rate for morning care
extended_care_pm_price  NUMERIC  -- Daily rate for afternoon care

-- Payment tracking
deposit_amount          NUMERIC  -- Required deposit
deposit_due_date        DATE     -- Deposit deadline
payment_due_date        DATE     -- Full payment deadline

-- Location for sibling logistics
zip_code                TEXT     -- Camp ZIP code
```

#### Scheduled Camps Table Extensions

```sql
-- Extended care needs
needs_extended_care_am   BOOLEAN DEFAULT FALSE
needs_extended_care_pm   BOOLEAN DEFAULT FALSE

-- Conflict handling
conflict_acknowledged    BOOLEAN DEFAULT FALSE

-- Waitlist tracking
waitlist_position        INTEGER

-- Cancellation tracking
cancelled_by             TEXT CHECK (IN ('user', 'camp'))
cancellation_reason      TEXT
expected_refund          NUMERIC
refund_received          BOOLEAN DEFAULT FALSE

-- Payment status
payment_status           TEXT DEFAULT 'unpaid'
                         CHECK (IN ('unpaid', 'deposit_paid', 'full_paid'))
```

### 2.2 Database Functions (RPC)

#### check_schedule_conflict()

```sql
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_child_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflicting_camp_id TEXT,
  conflicting_camp_name TEXT,
  conflict_start DATE,
  conflict_end DATE
)
```

**Usage Pattern**:
```javascript
const { data, error } = await supabase
  .rpc('check_schedule_conflict', {
    p_child_id: childId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_id: excludeScheduledCampId // Optional: exclude self when editing
  });
```

#### calculate_zip_distance()

```sql
CREATE OR REPLACE FUNCTION calculate_zip_distance(zip1 TEXT, zip2 TEXT)
RETURNS NUMERIC
```

**Usage Pattern**:
```javascript
const { data, error } = await supabase
  .rpc('calculate_zip_distance', {
    zip1: '93101',
    zip2: '93117'
  });
// Returns: 8.5 (miles)
```

### 2.3 Indexes for Performance

```sql
-- Fast conflict checking
CREATE INDEX idx_scheduled_camps_child_dates
  ON scheduled_camps (child_id, start_date, end_date)
  WHERE status != 'cancelled';

-- Payment status queries
CREATE INDEX idx_scheduled_camps_payment_status
  ON scheduled_camps (user_id, payment_status)
  WHERE payment_status != 'full_paid';

-- Waitlist queries
CREATE INDEX idx_scheduled_camps_waitlist
  ON scheduled_camps (user_id, status)
  WHERE status = 'waitlisted';

-- ZIP code lookup
CREATE INDEX idx_camps_zip_code
  ON camps (zip_code)
  WHERE zip_code IS NOT NULL;
```

### 2.4 RLS Policy Considerations

Existing RLS policies on `scheduled_camps` and `camps` operate at row level and automatically cover new columns. No policy changes needed.

The new `zip_code_coords` table uses a simple public read policy:

```sql
CREATE POLICY "Anyone can read ZIP code data" ON zip_code_coords
  FOR SELECT USING (true);
```

---

## 3. Frontend Architecture

### 3.1 Component Hierarchy

```
src/
├── App.jsx                          # Root component, routing logic
├── main.jsx                         # Entry point, AuthProvider wrapper
│
├── contexts/
│   └── AuthContext.jsx              # Global state (EXTEND for Phase 1.5)
│
├── lib/
│   ├── supabase.js                  # Database helpers (EXTEND for Phase 1.5)
│   ├── validation.js                # Zod schemas (ADD new schemas)
│   ├── formatters.js                # NEW: Currency, date, distance formatters
│   └── distance.js                  # NEW: ZIP-based distance calculations
│
└── components/
    ├── SchedulePlanner.jsx          # Main calendar (INTEGRATE conflict detection)
    ├── Dashboard.jsx                # Dashboard (INTEGRATE PaymentTracker)
    │
    └── phase1_5/                    # NEW: Phase 1.5 components
        ├── ExtendedCareToggle.jsx
        ├── ConflictWarningModal.jsx
        ├── SiblingLogisticsAlert.jsx
        ├── WaitlistManager.jsx
        ├── AlternativeCampSuggester.jsx
        ├── PaymentTracker.jsx
        └── CampCancellationFlow.jsx
```

### 3.2 Component Dependencies

```
ExtendedCareToggle
├── Props: scheduledCampId, campPricing, currentSettings
├── Uses: supabase.updateScheduledCampExtendedCare()
├── Updates: AuthContext.refreshSchedule() → CostDashboard recalculates
└── Integrates in: SchedulePlanner (camp detail view)

ConflictWarningModal
├── Props: newCamp, conflicts, childName
├── Uses: supabase.checkConflicts() (before modal opens)
├── Saves with: supabase.addScheduledCamp({ conflict_acknowledged: true })
└── Integrates in: SchedulePlanner (on schedule attempt)

SiblingLogisticsAlert
├── Props: sibling1Camp, sibling2Camp, distance, driveTime
├── Uses: supabase.calculateZipDistance()
├── Type: Toast (dismissible) + Inline indicator (persistent)
└── Integrates in: SchedulePlanner (after successful schedule)

WaitlistManager
├── Props: scheduledCamp (with status='waitlisted')
├── Uses: supabase.updateWaitlistPosition(), supabase.updateScheduledCampStatus()
├── Opens: AlternativeCampSuggester on "Find backup"
└── Integrates in: SchedulePlanner (camp detail view when waitlisted)

AlternativeCampSuggester
├── Props: context (childId, week, excludeCampId, preferredCategory)
├── Uses: supabase.searchCamps() with pre-applied filters
├── Action: supabase.addScheduledCamp() on selection
└── Integrates in: WaitlistManager, CampCancellationFlow, Coverage Gap

PaymentTracker
├── Props: scheduledCamps (from AuthContext)
├── Uses: supabase.updatePaymentStatus()
├── Sections: Overdue, Due This Week, Coming Up
└── Integrates in: Dashboard (widget)

CampCancellationFlow
├── Props: scheduledCamp
├── Uses: supabase.cancelScheduledCamp()
├── Opens: AlternativeCampSuggester on "Find replacement first"
└── Integrates in: SchedulePlanner (status change to cancelled)
```

### 3.3 Styling Architecture

Follow existing patterns from `index.css`:

```css
/* Phase 1.5 Component Styles */

/* Extended Care Toggle */
.extended-care-toggle { }
.extended-care-row { }
.extended-care-cost-breakdown { }

/* Conflict Warning Modal */
.conflict-modal { }
.conflict-camp-card { }
.conflict-actions { }

/* Sibling Logistics Alert */
.sibling-alert-toast { }
.sibling-alert-inline { }

/* Payment Tracker */
.payment-tracker { }
.payment-section { }
.payment-card { }
.payment-overdue { }
.payment-due-soon { }

/* Waitlist Manager */
.waitlist-manager { }
.waitlist-position-input { }
.waitlist-action-card { }

/* Alternative Camp Suggester */
.camp-suggester { }
.camp-suggester-filters { }
.camp-suggestion-card { }

/* Camp Cancellation Flow */
.cancellation-flow { }
.cancellation-reason-select { }
.refund-input { }
```

Use existing CSS custom properties:
- `--earth-*` for neutral tones
- `--sage-*` for success states
- `--accent-*` for primary actions
- `--ocean-500` for links

Status colors (from UX specs):
- Green `#10b981` - Confirmed/Paid
- Blue `#3b82f6` - Registered
- Gray `#6b7280` - Planned
- Amber `#f59e0b` - Waitlisted/Warning
- Red `#ef4444` - Cancelled/Overdue

---

## 4. API & Data Layer

### 4.1 New Supabase Helper Functions

Add these to `src/lib/supabase.js`:

#### Extended Care Functions

```javascript
/**
 * Update extended care settings for a scheduled camp
 * @param {string} scheduledCampId - UUID of the scheduled camp
 * @param {Object} settings - { needs_extended_care_am: boolean, needs_extended_care_pm: boolean }
 * @returns {Object} { data, error }
 */
export async function updateScheduledCampExtendedCare(scheduledCampId, settings) {
  if (!supabase) return { error: { message: 'Not configured' } };

  const allowedFields = ['needs_extended_care_am', 'needs_extended_care_pm'];
  const safeUpdates = {};
  for (const field of allowedFields) {
    if (settings[field] !== undefined) {
      safeUpdates[field] = settings[field];
    }
  }

  const { data, error } = await supabase
    .from('scheduled_camps')
    .update(safeUpdates)
    .eq('id', scheduledCampId)
    .select()
    .single();

  return { data, error };
}
```

#### Conflict Detection Functions

```javascript
/**
 * Check for scheduling conflicts before adding a camp
 * @param {string} childId - UUID of the child
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} excludeId - Optional: scheduled_camp ID to exclude (for edits)
 * @returns {Object} { conflicts: Array, error }
 */
export async function checkScheduleConflicts(childId, startDate, endDate, excludeId = null) {
  if (!supabase) return { conflicts: [], error: null };

  const { data, error } = await supabase.rpc('check_schedule_conflict', {
    p_child_id: childId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_id: excludeId
  });

  return { conflicts: data || [], error };
}
```

#### Waitlist Functions

```javascript
/**
 * Update waitlist position for a scheduled camp
 * @param {string} scheduledCampId - UUID of the scheduled camp
 * @param {number|null} position - Waitlist position (1 = first in line)
 * @returns {Object} { data, error }
 */
export async function updateWaitlistPosition(scheduledCampId, position) {
  if (!supabase) return { error: { message: 'Not configured' } };

  const { data, error } = await supabase
    .from('scheduled_camps')
    .update({ waitlist_position: position })
    .eq('id', scheduledCampId)
    .select()
    .single();

  return { data, error };
}
```

#### Cancellation Functions

```javascript
/**
 * Cancel a scheduled camp with tracking
 * @param {string} scheduledCampId - UUID of the scheduled camp
 * @param {Object} details - { cancelled_by: 'user'|'camp', reason?: string, expected_refund?: number }
 * @returns {Object} { data, error }
 */
export async function cancelScheduledCamp(scheduledCampId, details) {
  if (!supabase) return { error: { message: 'Not configured' } };

  const validation = validate(CancellationSchema, details);
  if (!validation.success) {
    return { error: { message: validation.error } };
  }

  const { data, error } = await supabase
    .from('scheduled_camps')
    .update({
      status: 'cancelled',
      cancelled_by: details.cancelled_by,
      cancellation_reason: details.reason || null,
      expected_refund: details.expected_refund || null
    })
    .eq('id', scheduledCampId)
    .select()
    .single();

  return { data, error };
}

/**
 * Update refund received status
 * @param {string} scheduledCampId - UUID of the scheduled camp
 * @param {boolean} received - Whether refund has been received
 * @returns {Object} { data, error }
 */
export async function updateRefundStatus(scheduledCampId, received) {
  if (!supabase) return { error: { message: 'Not configured' } };

  const { data, error } = await supabase
    .from('scheduled_camps')
    .update({ refund_received: received })
    .eq('id', scheduledCampId)
    .select()
    .single();

  return { data, error };
}
```

#### Payment Functions

```javascript
/**
 * Update payment status for a scheduled camp
 * @param {string} scheduledCampId - UUID of the scheduled camp
 * @param {string} status - 'unpaid' | 'deposit_paid' | 'full_paid'
 * @returns {Object} { data, error }
 */
export async function updatePaymentStatus(scheduledCampId, status) {
  if (!supabase) return { error: { message: 'Not configured' } };

  const validStatuses = ['unpaid', 'deposit_paid', 'full_paid'];
  if (!validStatuses.includes(status)) {
    return { error: { message: 'Invalid payment status' } };
  }

  const { data, error } = await supabase
    .from('scheduled_camps')
    .update({ payment_status: status })
    .eq('id', scheduledCampId)
    .select()
    .single();

  return { data, error };
}

/**
 * Get scheduled camps with upcoming payment deadlines
 * @param {string} userId - UUID of the user
 * @returns {Object} { data: { overdue, dueThisWeek, upcoming }, error }
 */
export async function getUpcomingPayments(userId) {
  if (!supabase) return { data: { overdue: [], dueThisWeek: [], upcoming: [] }, error: null };

  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get all scheduled camps with payment info
  const { data, error } = await supabase
    .from('scheduled_camps')
    .select(`
      *,
      camp:camps!inner(
        camp_name,
        deposit_amount,
        deposit_due_date,
        payment_due_date
      ),
      child:children!inner(name)
    `)
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .neq('payment_status', 'full_paid');

  if (error) return { data: null, error };

  // Categorize by urgency
  const overdue = [];
  const dueThisWeek = [];
  const upcoming = [];

  for (const item of data || []) {
    const dueDate = item.camp.deposit_due_date || item.camp.payment_due_date;
    if (!dueDate) continue;

    if (dueDate < today) {
      overdue.push(item);
    } else if (dueDate <= weekFromNow) {
      dueThisWeek.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return { data: { overdue, dueThisWeek, upcoming }, error: null };
}
```

#### Sibling Logistics Functions

```javascript
/**
 * Calculate distance between two ZIP codes
 * @param {string} zip1 - First ZIP code
 * @param {string} zip2 - Second ZIP code
 * @returns {Object} { distanceMiles: number | null, error }
 */
export async function calculateZipDistance(zip1, zip2) {
  if (!supabase) return { distanceMiles: null, error: null };

  if (!zip1 || !zip2) return { distanceMiles: null, error: null };

  const { data, error } = await supabase.rpc('calculate_zip_distance', {
    zip1,
    zip2
  });

  return { distanceMiles: data, error };
}

/**
 * Check sibling logistics for a week
 * @param {string} userId - UUID of the user
 * @param {string} weekStart - ISO date string for week start
 * @returns {Object} { alerts: Array<{ child1, child2, distance }>, error }
 */
export async function checkSiblingLogistics(userId, weekStart) {
  if (!supabase) return { alerts: [], error: null };

  // Get all camps scheduled for this week across all children
  const { data: scheduled, error } = await supabase
    .from('scheduled_camps')
    .select(`
      *,
      camp:camps!inner(camp_name, location, zip_code),
      child:children!inner(id, name)
    `)
    .eq('user_id', userId)
    .eq('start_date', weekStart)
    .neq('status', 'cancelled');

  if (error) return { alerts: [], error };
  if (!scheduled || scheduled.length < 2) return { alerts: [], error: null };

  // Check distances between each pair
  const alerts = [];
  const DISTANCE_THRESHOLD_MILES = 10;

  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const camp1 = scheduled[i];
      const camp2 = scheduled[j];

      // Skip if same child (shouldn't happen, but safety check)
      if (camp1.child.id === camp2.child.id) continue;

      // Skip if either missing ZIP
      if (!camp1.camp.zip_code || !camp2.camp.zip_code) continue;

      const { distanceMiles } = await calculateZipDistance(
        camp1.camp.zip_code,
        camp2.camp.zip_code
      );

      if (distanceMiles && distanceMiles > DISTANCE_THRESHOLD_MILES) {
        alerts.push({
          sibling1: {
            childId: camp1.child.id,
            childName: camp1.child.name,
            campName: camp1.camp.camp_name,
            location: camp1.camp.location,
            zipCode: camp1.camp.zip_code
          },
          sibling2: {
            childId: camp2.child.id,
            childName: camp2.child.name,
            campName: camp2.camp.camp_name,
            location: camp2.camp.location,
            zipCode: camp2.camp.zip_code
          },
          distanceMiles,
          estimatedDriveMinutes: Math.round(distanceMiles * 2.5) // Rough estimate
        });
      }
    }
  }

  return { alerts, error: null };
}
```

#### Alternative Camp Search Function

```javascript
/**
 * Find alternative camps for a given context
 * @param {Object} context - { childId, childAge, weekStart, excludeCampId?, preferredCategory? }
 * @returns {Object} { similar: Array, other: Array, error }
 */
export async function findAlternativeCamps(context) {
  if (!supabase) return { similar: [], other: [], error: null };

  const { childAge, weekStart, excludeCampId, preferredCategory } = context;

  let query = supabase
    .from('camps')
    .select('*')
    .lte('min_age', childAge)
    .gte('max_age', childAge);

  if (excludeCampId) {
    query = query.neq('id', excludeCampId);
  }

  const { data, error } = await query.order('camp_name');

  if (error) return { similar: [], other: [], error };

  // Split by category match
  const similar = [];
  const other = [];

  for (const camp of data || []) {
    if (preferredCategory && camp.category === preferredCategory) {
      similar.push(camp);
    } else {
      other.push(camp);
    }
  }

  // Sort by availability/rating (simplified - expand as needed)
  const sortByRelevance = (a, b) => {
    // Prefer camps with spots available (indicated by registration status)
    // Then by rating
    return (b.avg_rating || 0) - (a.avg_rating || 0);
  };

  similar.sort(sortByRelevance);
  other.sort(sortByRelevance);

  return { similar, other: other.slice(0, 20), error: null };
}
```

### 4.2 New Validation Schemas

Add to `src/lib/validation.js`:

```javascript
// Extended Care Schema
export const ExtendedCareSchema = z.object({
  needs_extended_care_am: z.boolean(),
  needs_extended_care_pm: z.boolean()
});

// Cancellation Schema
export const CancellationSchema = z.object({
  cancelled_by: z.enum(['user', 'camp']),
  reason: safeText.max(500).optional(),
  expected_refund: z.number().min(0).optional()
});

// Payment Status Schema
export const PaymentStatusSchema = z.object({
  payment_status: z.enum(['unpaid', 'deposit_paid', 'full_paid'])
});

// Waitlist Position Schema
export const WaitlistPositionSchema = z.object({
  waitlist_position: z.number().int().min(1).nullable()
});
```

### 4.3 New Utility Libraries

#### src/lib/formatters.js

```javascript
/**
 * Format currency for display
 * @param {number} amount - Amount in dollars
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null) return '';

  // No cents for whole dollars
  if (Number.isInteger(amount)) {
    return `$${amount.toLocaleString()}`;
  }

  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format relative date for urgency display
 * @param {Date|string} date - The date to format
 * @returns {string} Relative string like "Tomorrow", "3 days", "Overdue"
 */
export function formatRelativeDate(date) {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;

  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date range for display
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted range like "June 15-19, 2026"
 */
export function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  // Same month
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  // Different months
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format short date range for compact display
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted range like "Jun 15-19"
 */
export function formatShortDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  return `${startMonth} ${startDay}-${endDay}`;
}
```

#### src/lib/distance.js

```javascript
/**
 * Format distance for display
 * @param {number} miles - Distance in miles
 * @returns {string} Formatted distance like "~12 miles"
 */
export function formatDistance(miles) {
  if (miles == null) return '';
  return `~${Math.round(miles)} miles`;
}

/**
 * Estimate drive time from distance
 * @param {number} miles - Distance in miles
 * @returns {string} Estimated time like "~25 min"
 */
export function estimateDriveTime(miles) {
  if (miles == null) return '';

  // Rough estimate: 2.5 minutes per mile (accounts for SB traffic, stops)
  const minutes = Math.round(miles * 2.5);

  if (minutes < 60) {
    return `~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (remainingMins === 0) {
    return `~${hours} hr`;
  }

  return `~${hours} hr ${remainingMins} min`;
}
```

---

## 5. Component Technical Specifications

### 5.1 ExtendedCareToggle

**File**: `src/components/phase1_5/ExtendedCareToggle.jsx`

```jsx
/**
 * ExtendedCareToggle - Toggle extended care options for a scheduled camp
 *
 * Props:
 * - scheduledCampId: string - UUID of the scheduled camp
 * - campId: string - UUID of the camp (for pricing lookup)
 * - extendedCareAmPrice: number | null - Daily AM care rate
 * - extendedCarePmPrice: number | null - Daily PM care rate
 * - basePrice: number - Base camp price per week
 * - needsExtendedCareAm: boolean - Current AM care setting
 * - needsExtendedCarePm: boolean - Current PM care setting
 * - onUpdate: (settings) => void - Callback when settings change
 *
 * State:
 * - loading: boolean
 * - localAm: boolean (optimistic update)
 * - localPm: boolean (optimistic update)
 *
 * Behavior:
 * - Toggle immediately updates UI (optimistic)
 * - Calls supabase.updateScheduledCampExtendedCare()
 * - On error, reverts UI state
 * - Triggers parent refresh for cost recalculation
 */
```

**Integration Point**: Called from SchedulePlanner.jsx when viewing scheduled camp details.

### 5.2 ConflictWarningModal

**File**: `src/components/phase1_5/ConflictWarningModal.jsx`

```jsx
/**
 * ConflictWarningModal - Warn user about scheduling conflicts
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - newCamp: { name, startDate, endDate, hours }
 * - conflicts: Array<{ campName, startDate, endDate, scheduledCampId }>
 * - childName: string
 * - onCancel: () => void
 * - onAcknowledge: () => void - Schedule anyway (AM/PM camps)
 * - onReplace: (conflictId: string) => void
 *
 * State:
 * - selectedReplacement: string | null
 * - actionLoading: boolean
 *
 * Behavior:
 * - Focus trapped in modal
 * - ESC key closes (same as Cancel)
 * - "These are AM/PM camps" saves with conflict_acknowledged: true
 * - "Replace existing" deletes old, saves new
 */
```

**Integration Point**: Called from SchedulePlanner.jsx before `addScheduledCamp()`.

### 5.3 SiblingLogisticsAlert

**File**: `src/components/phase1_5/SiblingLogisticsAlert.jsx`

```jsx
/**
 * SiblingLogisticsAlert - Toast/inline alert for distant sibling camps
 *
 * Props:
 * - alert: {
 *     sibling1: { childName, campName, location },
 *     sibling2: { childName, campName, location },
 *     distanceMiles: number,
 *     estimatedDriveMinutes: number
 *   }
 * - weekStart: string
 * - onDismiss: () => void
 * - onFindAlternatives: (childId: string) => void
 *
 * Variants:
 * - Toast: Appears after scheduling, auto-dismisses after 10s
 * - Inline: Persistent indicator in calendar week view
 *
 * Behavior:
 * - Does NOT block scheduling (informational only)
 * - Shows distance and estimated drive time
 * - Offers quick link to find alternatives
 */
```

**Integration Point**: Called from SchedulePlanner.jsx after successful schedule, and inline in week view.

### 5.4 WaitlistManager

**File**: `src/components/phase1_5/WaitlistManager.jsx`

```jsx
/**
 * WaitlistManager - Manage waitlisted camp status
 *
 * Props:
 * - scheduledCamp: { id, campId, campName, childId, childName, startDate, endDate, waitlistPosition }
 * - onUpdatePosition: (position: number | null) => void
 * - onFindAlternatives: () => void - Opens AlternativeCampSuggester
 * - onMarkConfirmed: () => void - Status change to confirmed
 * - onCancel: () => void - Opens CampCancellationFlow
 *
 * State:
 * - positionInput: string (text input for number)
 * - loading: boolean
 *
 * Behavior:
 * - Position input saves on blur/Enter
 * - Position #1 shows "You're next!" badge
 * - High positions (10+) show "Consider finding a backup" hint
 */
```

**Integration Point**: Appears in SchedulePlanner when viewing a camp with status='waitlisted'.

### 5.5 AlternativeCampSuggester

**File**: `src/components/phase1_5/AlternativeCampSuggester.jsx`

```jsx
/**
 * AlternativeCampSuggester - Find replacement camps
 *
 * Props:
 * - context: {
 *     childId: string,
 *     childName: string,
 *     childAge: number,
 *     weekStart: Date,
 *     weekEnd: Date,
 *     excludeCampId?: string,
 *     preferredCategory?: string
 *   }
 * - onSelectCamp: (campId: string) => void
 * - onClose: () => void
 *
 * State:
 * - filters: { category, maxPrice, hasSpots }
 * - similar: Array<Camp>
 * - other: Array<Camp>
 * - loading: boolean
 * - showCount: number (for "Show more")
 *
 * Behavior:
 * - Pre-filters by child age and week
 * - Shows category-matched camps first ("Similar to...")
 * - Quick "Schedule" action on each card
 * - Lazy loads more results
 */
```

**Integration Point**: Opened from WaitlistManager, CampCancellationFlow, and coverage gap actions.

### 5.6 PaymentTracker

**File**: `src/components/phase1_5/PaymentTracker.jsx`

```jsx
/**
 * PaymentTracker - Dashboard widget for payment deadlines
 *
 * Props:
 * - (Uses AuthContext for scheduled camps data)
 *
 * State:
 * - payments: { overdue, dueThisWeek, upcoming }
 * - loading: boolean
 * - statusDropdownOpen: string | null (scheduledCampId)
 *
 * Sections:
 * - OVERDUE (red) - Past due date
 * - DUE THIS WEEK (amber) - Within 7 days
 * - COMING UP - Future deadlines
 * - Summary - Monthly totals
 *
 * Behavior:
 * - Grouped by urgency
 * - Relative dates ("3 days", "Tomorrow")
 * - Quick status update dropdown
 * - Calculates balance after deposit
 */
```

**Integration Point**: Rendered in Dashboard.jsx as a widget.

### 5.7 CampCancellationFlow

**File**: `src/components/phase1_5/CampCancellationFlow.jsx`

```jsx
/**
 * CampCancellationFlow - Handle camp cancellation workflow
 *
 * Props:
 * - scheduledCamp: { id, campId, campName, childId, childName, startDate, endDate, price }
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirmCancellation: (details) => void
 * - onFindReplacement: () => void
 *
 * State:
 * - cancelledBy: 'user' | 'camp'
 * - reason: string
 * - expectedRefund: number
 * - loading: boolean
 *
 * Variants:
 * - User-initiated: Full form with reason and refund input
 * - Camp-initiated: Notification style with recovery actions
 *
 * Behavior:
 * - Warns about coverage gap
 * - "Find replacement first" opens AlternativeCampSuggester
 * - Tracks cancellation reason for analytics
 * - Refund tracking after cancellation
 */
```

**Integration Point**: Opened from SchedulePlanner when changing status to 'cancelled' or from camp cancellation notification.

---

## 6. State Management Strategy

### 6.1 AuthContext Extensions

Add to `src/contexts/AuthContext.jsx`:

```javascript
// New state values
const [paymentsDue, setPaymentsDue] = useState({ overdue: [], dueThisWeek: [], upcoming: [] });

// New refresh function
async function refreshPayments() {
  if (!user) return;
  const { data } = await getUpcomingPayments(user.id);
  if (data) setPaymentsDue(data);
}

// Add to initial load (in useEffect after auth)
Promise.all([
  // ... existing loads
  getUpcomingPayments(user.id)
]).then(([...existingResults, paymentsResult]) => {
  // ... existing handling
  if (paymentsResult.data) setPaymentsDue(paymentsResult.data);
});

// Add to context value
const value = {
  // ... existing values
  paymentsDue,
  refreshPayments,

  // New helper methods
  getExtendedCareCost(scheduledCamp, camp) {
    let cost = 0;
    if (scheduledCamp.needs_extended_care_am && camp.extended_care_am_price) {
      cost += camp.extended_care_am_price * 5; // Weekly
    }
    if (scheduledCamp.needs_extended_care_pm && camp.extended_care_pm_price) {
      cost += camp.extended_care_pm_price * 5; // Weekly
    }
    return cost;
  },

  getTotalCostWithExtendedCare() {
    return scheduledCamps.reduce((total, sc) => {
      const camp = camps.find(c => c.id === sc.camp_id);
      if (!camp || sc.status === 'cancelled') return total;

      const baseCost = sc.price || camp.min_price || 0;
      const extendedCost = this.getExtendedCareCost(sc, camp);

      return total + baseCost + extendedCost;
    }, 0);
  }
};
```

### 6.2 Local Component State Patterns

For Phase 1.5 components, follow these state management patterns:

#### Optimistic Updates

```javascript
const [localValue, setLocalValue] = useState(propValue);
const [loading, setLoading] = useState(false);

async function handleChange(newValue) {
  const previousValue = localValue;

  // Optimistic update
  setLocalValue(newValue);
  setLoading(true);

  try {
    const { error } = await updateFunction(newValue);
    if (error) throw error;

    // Refresh parent data
    await refreshSchedule();
  } catch (err) {
    // Revert on error
    setLocalValue(previousValue);
    console.error('Update failed:', err);
  } finally {
    setLoading(false);
  }
}
```

#### Modal State

```javascript
const [isOpen, setIsOpen] = useState(false);
const [actionLoading, setActionLoading] = useState(false);

function handleClose() {
  if (actionLoading) return; // Prevent closing during action
  setIsOpen(false);
}

// Focus trap and keyboard handling
useEffect(() => {
  if (!isOpen) return;

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !actionLoading) {
      handleClose();
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, actionLoading]);
```

---

## 7. Security Architecture

### 7.1 Input Validation

All user inputs must be validated before database operations:

```javascript
// Always validate with Zod before any database call
const validation = validate(SchemaName, data);
if (!validation.success) {
  return { error: { message: validation.error } };
}
```

### 7.2 Field Allowlisting

When updating records, always use field allowlisting:

```javascript
const allowedFields = ['needs_extended_care_am', 'needs_extended_care_pm'];
const safeUpdates = {};
for (const field of allowedFields) {
  if (updates[field] !== undefined) {
    safeUpdates[field] = updates[field];
  }
}
```

### 7.3 RLS Policy Verification

Before deploying new features, verify RLS policies:

1. **User can only access own data**: `user_id = auth.uid()`
2. **Children belong to user**: Join through profiles
3. **Scheduled camps belong to user**: Direct user_id check

### 7.4 Sensitive Operations

For destructive operations (cancel, delete), implement confirmation:

```javascript
async function handleCancel() {
  const confirmed = await showConfirmation({
    title: 'Cancel this camp?',
    message: 'This action cannot be undone.',
    confirmText: 'Cancel Camp',
    destructive: true
  });

  if (!confirmed) return;

  // Proceed with cancellation
}
```

---

## 8. Performance Optimization

### 8.1 Memoization Strategy

Use `useMemo` for expensive calculations:

```javascript
const paymentsGrouped = useMemo(() => {
  const today = new Date();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    overdue: scheduledCamps.filter(sc => new Date(sc.payment_due_date) < today),
    dueThisWeek: scheduledCamps.filter(sc => {
      const due = new Date(sc.payment_due_date);
      return due >= today && due <= weekFromNow;
    }),
    upcoming: scheduledCamps.filter(sc => new Date(sc.payment_due_date) > weekFromNow)
  };
}, [scheduledCamps]);
```

### 8.2 Batch Operations

When checking multiple conditions, batch database calls:

```javascript
// BAD: Sequential calls
for (const child of children) {
  await checkConflict(child.id, weekStart);
}

// GOOD: Parallel calls
await Promise.all(
  children.map(child => checkConflict(child.id, weekStart))
);
```

### 8.3 Lazy Loading

For AlternativeCampSuggester, implement pagination:

```javascript
const [showCount, setShowCount] = useState(10);

const visibleCamps = useMemo(() =>
  allCamps.slice(0, showCount),
  [allCamps, showCount]
);

function handleShowMore() {
  setShowCount(prev => prev + 10);
}
```

### 8.4 Debouncing

For search/filter inputs, debounce API calls:

```javascript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    searchCamps(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)

**Priority Test Files**:

1. `src/lib/supabase.test.js` - New helper functions
2. `src/lib/formatters.test.js` - Currency/date formatting
3. `src/lib/distance.test.js` - Distance calculations
4. `src/components/phase1_5/*.test.jsx` - Component tests

**Test Pattern**:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('ExtendedCareToggle', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays AM and PM toggle options', () => {
    render(
      <ExtendedCareToggle
        extendedCareAmPrice={15}
        extendedCarePmPrice={20}
        needsExtendedCareAm={false}
        needsExtendedCarePm={false}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/Morning care/i)).toBeInTheDocument();
    expect(screen.getByText(/Afternoon care/i)).toBeInTheDocument();
  });

  it('calculates weekly cost correctly', () => {
    render(
      <ExtendedCareToggle
        basePrice={350}
        extendedCareAmPrice={15}
        extendedCarePmPrice={20}
        needsExtendedCareAm={true}
        needsExtendedCarePm={true}
        onUpdate={mockOnUpdate}
      />
    );

    // AM: $15 * 5 = $75, PM: $20 * 5 = $100, Total: $350 + $175 = $525
    expect(screen.getByText(/\$525/)).toBeInTheDocument();
  });
});
```

### 9.2 Integration Tests

**Test Database Operations**:

```javascript
describe('Conflict Detection', () => {
  it('detects overlapping schedules for same child', async () => {
    // Setup: Schedule camp for child
    await addScheduledCamp({
      child_id: testChildId,
      camp_id: testCampId,
      start_date: '2026-06-15',
      end_date: '2026-06-19'
    });

    // Test: Check for conflict
    const { conflicts } = await checkScheduleConflicts(
      testChildId,
      '2026-06-15',
      '2026-06-19'
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflicting_camp_id).toBe(testCampId);
  });
});
```

### 9.3 E2E Tests (Playwright)

**Priority E2E Scenarios**:

1. **Extended care toggle flow**: User toggles extended care, sees cost update
2. **Conflict detection flow**: User schedules conflicting camp, sees modal, chooses action
3. **Payment tracking flow**: User views payments, marks as paid
4. **Waitlist flow**: User marks camp as waitlisted, updates position, finds backup

**Test Pattern**:

```javascript
// e2e/extended-care.spec.js
import { test, expect } from '@playwright/test';

test('user can toggle extended care and see cost update', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="schedule-planner"]');

  // Click on a scheduled camp
  await page.click('[data-testid="scheduled-camp-card"]');

  // Toggle PM care
  await page.click('[data-testid="extended-care-pm-toggle"]');

  // Verify cost updated
  await expect(page.locator('[data-testid="camp-total-cost"]')).toContainText('$450');
});
```

---

## 10. Implementation Guidelines

### 10.1 File Naming Conventions

- Components: `PascalCase.jsx` (e.g., `ExtendedCareToggle.jsx`)
- Utilities: `camelCase.js` (e.g., `formatters.js`)
- Tests: `*.test.jsx` or `*.test.js`
- CSS: Component-scoped in `index.css` under Phase 1.5 section

### 10.2 Code Style

Follow existing patterns from the codebase:

```javascript
// Function naming
export async function getXXX() { }  // Fetch data
export async function addXXX() { }  // Create record
export async function updateXXX() { } // Update record
export async function deleteXXX() { } // Delete record
export function formatXXX() { }    // Format for display

// Error handling
const { data, error } = await supabase.xxx();
if (error) {
  console.error('Error [action]:', error);
  return { error };
}

// Graceful degradation
if (!supabase) return { data: null, error: null };
```

### 10.3 Component Pattern

```jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateXXX } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';

// Pure helper functions first
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Main component export
export function ComponentName({
  prop1,
  prop2,
  onAction
}) {
  const { user, refreshData } = useAuth();

  // State declarations
  const [loading, setLoading] = useState(false);
  const [localState, setLocalState] = useState(prop1);

  // Memoized computations
  const computed = useMemo(() => calculateTotal(prop2), [prop2]);

  // Event handlers
  async function handleAction() {
    setLoading(true);
    try {
      await updateXXX(localState);
      await refreshData();
      onAction?.();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="component-name">
      {/* Component JSX */}
    </div>
  );
}

// Sub-components (if small)
function SubIcon({ type }) {
  const icons = { status: '⚡', warning: '⚠️' };
  return <span>{icons[type]}</span>;
}
```

### 10.4 Commit Message Format

```
[Phase 1.5] feat(stream): Add extended care toggle component

- Add ExtendedCareToggle.jsx with AM/PM toggles
- Add updateScheduledCampExtendedCare() to supabase.js
- Add ExtendedCareSchema to validation.js
- Add cost calculation to AuthContext

Relates to: Stream A (Extended Care Cost Tracking)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 10.5 PR Description Template

```markdown
## Summary
- Brief description of changes

## Stream
- [ ] Stream A: Extended Care
- [ ] Stream B: Conflict Detection
- [ ] Stream C: Waitlist/Cancellation
- [ ] Stream D: Payment Tracking
- [ ] Stream E: Sibling Logistics

## Changes
- List of specific changes

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots
(if UI changes)
```

### 10.6 Database Migration Checklist

Before applying migrations:

- [ ] Migration tested in development environment
- [ ] Rollback script prepared and tested
- [ ] RLS policies reviewed
- [ ] Indexes created for query patterns
- [ ] Column comments added

### 10.7 Quality Gates

Before merging any Phase 1.5 PR:

| Gate | Criteria |
|------|----------|
| **Schema Review** | Migration tested, rollback documented |
| **Code Review** | Follows existing patterns, no security issues |
| **Test Coverage** | New functions have unit tests |
| **Accessibility** | WCAG AA compliance verified |
| **Performance** | No N+1 queries, memoization where needed |
| **Mobile** | Responsive design verified |

---

## Appendix A: Stream Dependencies

```
Stream A (Extended Care)    ──┐
                              ├──► CostDashboard Integration
Stream D (Payment)          ──┘

Stream B (Conflict)         ──────► SchedulePlanner Integration

Stream C (Waitlist)         ──┬──► AlternativeCampSuggester (shared)
                              │
Stream E (Sibling)          ──┘
```

### Critical Path

1. **Day 1-2**: Apply database migration (all streams unblocked)
2. **Day 2-4**: Build supabase.js helper functions
3. **Day 3-5**: Build utility libraries (formatters, distance)
4. **Day 4-8**: Build individual components (parallelizable by stream)
5. **Day 8-12**: Integration with SchedulePlanner and Dashboard
6. **Day 12-14**: Testing and polish

---

## Appendix B: Data Flow Diagrams

### Extended Care Cost Flow

```
User toggles Extended Care
        │
        ▼
ExtendedCareToggle.handleToggle()
        │
        ▼
supabase.updateScheduledCampExtendedCare()
        │
        ▼
Database: scheduled_camps updated
        │
        ▼
AuthContext.refreshSchedule()
        │
        ▼
CostDashboard.getTotalCostWithExtendedCare()
        │
        ▼
UI: Total cost updates
```

### Conflict Detection Flow

```
User drags camp to calendar week
        │
        ▼
SchedulePlanner.handleDrop()
        │
        ▼
supabase.checkScheduleConflicts()
        │
        ▼
Conflicts found? ──► No ──► supabase.addScheduledCamp()
        │
        ▼ Yes
ConflictWarningModal opens
        │
        ├──► Cancel: Close modal
        │
        ├──► AM/PM camps: addScheduledCamp({ conflict_acknowledged: true })
        │
        └──► Replace: deleteScheduledCamp() then addScheduledCamp()
```

### Sibling Logistics Flow

```
User schedules camp successfully
        │
        ▼
SchedulePlanner.checkSiblingLogisticsAfterSchedule()
        │
        ▼
supabase.checkSiblingLogistics(userId, weekStart)
        │
        ▼
Alerts returned? ──► No ──► Done
        │
        ▼ Yes
SiblingLogisticsAlert toast appears
        │
        ├──► Dismiss: Hide toast, show inline indicator
        │
        └──► Find alternatives: Open AlternativeCampSuggester
```

---

*This document should be read alongside [COMPONENT_SPECS.md](./COMPONENT_SPECS.md), [UX_DESIGN_SPECS.md](./UX_DESIGN_SPECS.md), and [BUSINESS_RULES.md](./BUSINESS_RULES.md).*

---

**Document Prepared By**: Tech Lead
**Review Requested From**: Database Engineer, Frontend Engineers
**Next Step**: Database migration deployment followed by parallel stream implementation
