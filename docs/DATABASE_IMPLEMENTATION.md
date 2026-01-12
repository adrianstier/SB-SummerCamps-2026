# Phase 1.5 Database Implementation Plan

**Prepared by**: Database Engineer
**Date**: January 12, 2026
**Status**: Ready for Implementation

---

## Executive Summary

This document provides the comprehensive database implementation plan for Phase 1.5 of SB Summer Camps 2026. It transforms the logical data models from the Technical Architecture into optimized physical implementations, with detailed attention to performance, security, and operational excellence.

### Implementation Philosophy

1. **Additive Schema Evolution**: All changes are additive - no breaking changes to existing functionality
2. **Performance by Design**: Indexes and query patterns optimized for real-world usage
3. **Security First**: RLS policies, input validation, and audit trails throughout
4. **Backward Compatibility**: Existing API contracts remain intact
5. **Operational Excellence**: Comprehensive monitoring, backup, and maintenance procedures

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Schema Changes](#2-schema-changes)
3. [Database Functions (RPC)](#3-database-functions-rpc)
4. [Index Strategy](#4-index-strategy)
5. [RLS Policy Updates](#5-rls-policy-updates)
6. [Performance Optimization](#6-performance-optimization)
7. [Security Implementation](#7-security-implementation)
8. [Migration Execution Plan](#8-migration-execution-plan)
9. [Integration Patterns](#9-integration-patterns)
10. [Operational Procedures](#10-operational-procedures)
11. [Testing & Validation](#11-testing--validation)

---

## 1. Current State Analysis

### 1.1 Existing Schema Overview

| Table | Rows | RLS | Primary Use |
|-------|------|-----|-------------|
| `camps` | 43 | Yes | Camp catalog data |
| `profiles` | 1 | Yes | User profiles |
| `children` | 2 | Yes | Child records per user |
| `scheduled_camps` | 3 | Yes | User camp schedules |
| `favorites` | 0 | Yes | Saved camps |
| `reviews` | 29 | Yes | Camp reviews |
| `notifications` | 0 | Yes | User notifications |
| `camp_sessions` | 0 | **No** | Camp session availability |
| `squads` | 0 | Yes | Friend groups |

### 1.2 Security Advisors - Current Issues

**Critical Issues Requiring Attention:**

| Issue | Severity | Table/Object | Remediation |
|-------|----------|--------------|-------------|
| RLS Disabled | ERROR | `camp_sessions` | Enable RLS with public read policy |
| RLS Disabled | ERROR | `rate_limit_entries` | Enable RLS (internal table) |
| SECURITY DEFINER Views | ERROR | 4 views | Convert to SECURITY INVOKER |
| Function search_path mutable | WARN | 18 functions | Add `SET search_path = ''` |
| Extension in public | WARN | `pg_trgm` | Consider moving to extensions schema |

### 1.3 Scheduled Camps Current Structure

```sql
scheduled_camps (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL,        -- Owner
  camp_id         TEXT NOT NULL,        -- Reference to camps.id
  child_id        UUID NOT NULL,        -- Reference to children.id
  session_id      UUID,                 -- Optional session reference
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT DEFAULT 'planned',  -- planned, registered, confirmed, waitlisted, cancelled
  price           NUMERIC,
  registration_date TIMESTAMPTZ,
  confirmation_number TEXT,
  google_event_id TEXT,
  notes           TEXT,
  is_sample       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
```

### 1.4 Camps Current Structure

```sql
camps (
  id                    TEXT PRIMARY KEY,
  camp_name             TEXT NOT NULL,
  organization          TEXT,
  category              TEXT,
  min_age               INTEGER,
  max_age               INTEGER,
  min_price             NUMERIC,
  max_price             NUMERIC,
  hours                 TEXT,
  drop_off              TEXT,
  pick_up               TEXT,
  extended_care         TEXT,         -- Textual description
  extended_care_cost    TEXT,         -- Textual description
  has_extended_care     BOOLEAN,
  -- ... other fields
)
```

---

## 2. Schema Changes

### 2.1 Camps Table Extensions

Add structured pricing and logistics data to the `camps` table:

```sql
-- Stream A: Extended Care Pricing (structured numeric values)
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS extended_care_am_price NUMERIC
    CHECK (extended_care_am_price IS NULL OR extended_care_am_price >= 0),
  ADD COLUMN IF NOT EXISTS extended_care_pm_price NUMERIC
    CHECK (extended_care_pm_price IS NULL OR extended_care_pm_price >= 0);

-- Stream D: Payment Tracking
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC
    CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  ADD COLUMN IF NOT EXISTS deposit_due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Stream E: Sibling Logistics
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS zip_code TEXT
    CHECK (zip_code IS NULL OR zip_code ~ '^\d{5}(-\d{4})?$');
```

**Column Documentation:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `extended_care_am_price` | NUMERIC | Daily rate for morning care | `15.00` |
| `extended_care_pm_price` | NUMERIC | Daily rate for afternoon care | `20.00` |
| `deposit_amount` | NUMERIC | Required deposit to secure spot | `100.00` |
| `deposit_due_date` | DATE | Deadline for deposit payment | `2026-03-01` |
| `payment_due_date` | DATE | Deadline for full payment | `2026-05-15` |
| `zip_code` | TEXT | Camp location ZIP code | `93101` |

### 2.2 Scheduled Camps Table Extensions

Add tracking fields for extended care, conflicts, waitlist, cancellation, and payments:

```sql
-- Stream A: Extended Care Needs
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS needs_extended_care_am BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_extended_care_pm BOOLEAN DEFAULT FALSE;

-- Stream B: Conflict Detection
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS conflict_acknowledged BOOLEAN DEFAULT FALSE;

-- Stream C: Waitlist Tracking
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER
    CHECK (waitlist_position IS NULL OR waitlist_position >= 1);

-- Stream C: Cancellation Tracking
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('user', 'camp')),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS expected_refund NUMERIC
    CHECK (expected_refund IS NULL OR expected_refund >= 0),
  ADD COLUMN IF NOT EXISTS refund_received BOOLEAN DEFAULT FALSE;

-- Stream D: Payment Status
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'deposit_paid', 'full_paid'));
```

**Column Documentation:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `needs_extended_care_am` | BOOLEAN | FALSE | User needs morning extended care |
| `needs_extended_care_pm` | BOOLEAN | FALSE | User needs afternoon extended care |
| `conflict_acknowledged` | BOOLEAN | FALSE | User acknowledged scheduling conflict |
| `waitlist_position` | INTEGER | NULL | Position on waitlist (1 = first) |
| `cancelled_by` | TEXT | NULL | Who cancelled: 'user' or 'camp' |
| `cancellation_reason` | TEXT | NULL | Free-text reason for cancellation |
| `expected_refund` | NUMERIC | NULL | Expected refund amount |
| `refund_received` | BOOLEAN | FALSE | Whether refund has been received |
| `payment_status` | TEXT | 'unpaid' | Payment progress tracking |

### 2.3 ZIP Code Reference Table

Create a lookup table for Santa Barbara area ZIP codes with coordinates:

```sql
CREATE TABLE IF NOT EXISTS zip_code_coords (
  zip_code    TEXT PRIMARY KEY
              CHECK (zip_code ~ '^\d{5}$'),
  city        TEXT NOT NULL,
  latitude    NUMERIC NOT NULL
              CHECK (latitude BETWEEN -90 AND 90),
  longitude   NUMERIC NOT NULL
              CHECK (longitude BETWEEN -180 AND 180),
  area_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE zip_code_coords IS 'Santa Barbara area ZIP codes with coordinates for distance calculations';
```

**Initial Data - Santa Barbara Area ZIP Codes:**

| ZIP | City | Lat | Long | Area |
|-----|------|-----|------|------|
| 93101 | Santa Barbara | 34.4208 | -119.6982 | Downtown |
| 93103 | Santa Barbara | 34.4358 | -119.7163 | West Side |
| 93105 | Santa Barbara | 34.4492 | -119.7278 | Mission Canyon |
| 93106 | Santa Barbara | 34.4140 | -119.8489 | UCSB/Isla Vista |
| 93108 | Santa Barbara | 34.4358 | -119.6295 | Montecito |
| 93109 | Santa Barbara | 34.4022 | -119.7238 | Mesa |
| 93110 | Santa Barbara | 34.4492 | -119.7611 | San Roque |
| 93111 | Santa Barbara | 34.4500 | -119.8000 | Goleta (SB) |
| 93117 | Goleta | 34.4358 | -119.8673 | Goleta |
| 93013 | Carpinteria | 34.3989 | -119.5184 | Carpinteria |
| 93067 | Summerland | 34.4214 | -119.5965 | Summerland |

### 2.4 Notification Type Extensions

Extend the notification types to support Phase 1.5 features:

```sql
-- Drop and recreate with new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    -- Existing types
    'registration_reminder'::text,
    'registration_open'::text,
    'new_session'::text,
    'camp_update'::text,
    'review_reply'::text,
    'question_answered'::text,
    'schedule_reminder'::text,
    'price_drop'::text,
    'spots_available'::text,
    'weekly_digest'::text,
    'system'::text,
    -- Phase 1.5 additions
    'payment_reminder'::text,
    'payment_overdue'::text,
    'camp_cancelled'::text,
    'waitlist_update'::text,
    'schedule_conflict'::text,
    'sibling_logistics'::text
  ]));
```

---

## 3. Database Functions (RPC)

### 3.1 Schedule Conflict Detection

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
  conflict_end DATE,
  scheduled_camp_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.camp_id,
    c.camp_name,
    sc.start_date,
    sc.end_date,
    sc.id
  FROM public.scheduled_camps sc
  JOIN public.camps c ON c.id = sc.camp_id
  WHERE sc.child_id = p_child_id
    AND sc.status NOT IN ('cancelled')
    AND sc.conflict_acknowledged = FALSE
    AND (p_exclude_id IS NULL OR sc.id != p_exclude_id)
    AND (
      -- Overlap detection: new range overlaps existing range
      p_start_date <= sc.end_date AND p_end_date >= sc.start_date
    );
END;
$$;

COMMENT ON FUNCTION check_schedule_conflict IS 'Detect scheduling conflicts for a child within a date range';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_schedule_conflict TO authenticated;
```

**Usage Pattern:**
```javascript
const { data, error } = await supabase.rpc('check_schedule_conflict', {
  p_child_id: childId,
  p_start_date: '2026-06-15',
  p_end_date: '2026-06-19',
  p_exclude_id: null // or existing scheduledCampId when editing
});
```

### 3.2 ZIP Code Distance Calculation

```sql
CREATE OR REPLACE FUNCTION calculate_zip_distance(zip1 TEXT, zip2 TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lat1 NUMERIC;
  lon1 NUMERIC;
  lat2 NUMERIC;
  lon2 NUMERIC;
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
  r NUMERIC := 3959; -- Earth's radius in miles
BEGIN
  -- Get coordinates for first ZIP
  SELECT latitude, longitude INTO lat1, lon1
  FROM public.zip_code_coords WHERE zip_code = zip1;

  -- Get coordinates for second ZIP
  SELECT latitude, longitude INTO lat2, lon2
  FROM public.zip_code_coords WHERE zip_code = zip2;

  -- Return NULL if either ZIP not found
  IF lat1 IS NULL OR lat2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to radians
  lat1 := radians(lat1);
  lon1 := radians(lon1);
  lat2 := radians(lat2);
  lon2 := radians(lon2);

  -- Haversine formula
  dlat := lat2 - lat1;
  dlon := lon2 - lon1;
  a := sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2;
  c := 2 * asin(sqrt(a));

  RETURN ROUND(r * c, 1);
END;
$$;

COMMENT ON FUNCTION calculate_zip_distance IS 'Calculate distance in miles between two ZIP codes using Haversine formula';

-- Grant execute to all (public reference data)
GRANT EXECUTE ON FUNCTION calculate_zip_distance TO authenticated, anon;
```

**Usage Pattern:**
```javascript
const { data, error } = await supabase.rpc('calculate_zip_distance', {
  zip1: '93101',
  zip2: '93117'
});
// Returns: 8.5 (miles)
```

### 3.3 Upcoming Payments Query Function

```sql
CREATE OR REPLACE FUNCTION get_upcoming_payments(p_user_id UUID)
RETURNS TABLE (
  scheduled_camp_id UUID,
  camp_id TEXT,
  camp_name TEXT,
  child_id UUID,
  child_name TEXT,
  start_date DATE,
  end_date DATE,
  price NUMERIC,
  payment_status TEXT,
  deposit_amount NUMERIC,
  deposit_due_date DATE,
  payment_due_date DATE,
  urgency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  week_from_now DATE := CURRENT_DATE + INTERVAL '7 days';
BEGIN
  RETURN QUERY
  SELECT
    sc.id AS scheduled_camp_id,
    sc.camp_id,
    c.camp_name,
    sc.child_id,
    ch.name AS child_name,
    sc.start_date,
    sc.end_date,
    COALESCE(sc.price, c.min_price) AS price,
    sc.payment_status,
    c.deposit_amount,
    c.deposit_due_date,
    c.payment_due_date,
    CASE
      WHEN c.deposit_due_date < today OR c.payment_due_date < today THEN 'overdue'
      WHEN c.deposit_due_date <= week_from_now OR c.payment_due_date <= week_from_now THEN 'due_this_week'
      ELSE 'upcoming'
    END AS urgency
  FROM public.scheduled_camps sc
  JOIN public.camps c ON c.id = sc.camp_id
  JOIN public.children ch ON ch.id = sc.child_id
  WHERE sc.user_id = p_user_id
    AND sc.status != 'cancelled'
    AND sc.payment_status != 'full_paid'
    AND (c.deposit_due_date IS NOT NULL OR c.payment_due_date IS NOT NULL)
  ORDER BY
    CASE
      WHEN c.deposit_due_date < today OR c.payment_due_date < today THEN 1
      WHEN c.deposit_due_date <= week_from_now OR c.payment_due_date <= week_from_now THEN 2
      ELSE 3
    END,
    COALESCE(c.deposit_due_date, c.payment_due_date);
END;
$$;

COMMENT ON FUNCTION get_upcoming_payments IS 'Get scheduled camps with payment deadlines, categorized by urgency';

GRANT EXECUTE ON FUNCTION get_upcoming_payments TO authenticated;
```

### 3.4 Sibling Logistics Check Function

```sql
CREATE OR REPLACE FUNCTION check_sibling_logistics(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  child1_id UUID,
  child1_name TEXT,
  camp1_id TEXT,
  camp1_name TEXT,
  camp1_zip TEXT,
  child2_id UUID,
  child2_name TEXT,
  camp2_id TEXT,
  camp2_name TEXT,
  camp2_zip TEXT,
  distance_miles NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  distance_threshold NUMERIC := 10; -- Miles threshold for alerting
BEGIN
  RETURN QUERY
  WITH scheduled AS (
    SELECT
      sc.child_id,
      ch.name AS child_name,
      sc.camp_id,
      c.camp_name,
      c.zip_code
    FROM public.scheduled_camps sc
    JOIN public.camps c ON c.id = sc.camp_id
    JOIN public.children ch ON ch.id = sc.child_id
    WHERE sc.user_id = p_user_id
      AND sc.start_date = p_week_start
      AND sc.status != 'cancelled'
      AND c.zip_code IS NOT NULL
  )
  SELECT
    s1.child_id AS child1_id,
    s1.child_name AS child1_name,
    s1.camp_id AS camp1_id,
    s1.camp_name AS camp1_name,
    s1.zip_code AS camp1_zip,
    s2.child_id AS child2_id,
    s2.child_name AS child2_name,
    s2.camp_id AS camp2_id,
    s2.camp_name AS camp2_name,
    s2.zip_code AS camp2_zip,
    public.calculate_zip_distance(s1.zip_code, s2.zip_code) AS distance_miles
  FROM scheduled s1
  CROSS JOIN scheduled s2
  WHERE s1.child_id < s2.child_id  -- Avoid duplicates
    AND public.calculate_zip_distance(s1.zip_code, s2.zip_code) > distance_threshold;
END;
$$;

COMMENT ON FUNCTION check_sibling_logistics IS 'Check for distant camps between siblings in the same week';

GRANT EXECUTE ON FUNCTION check_sibling_logistics TO authenticated;
```

---

## 4. Index Strategy

### 4.1 Performance Indexes

```sql
-- Index for efficient conflict checking (most critical)
-- Supports: WHERE child_id = ? AND status != 'cancelled' AND start_date/end_date overlap
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_conflict_check
  ON scheduled_camps (child_id, start_date, end_date)
  WHERE status != 'cancelled';

-- Index for payment status queries
-- Supports: WHERE user_id = ? AND payment_status != 'full_paid'
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_payments
  ON scheduled_camps (user_id, payment_status)
  WHERE payment_status != 'full_paid' AND status != 'cancelled';

-- Index for waitlist queries
-- Supports: WHERE user_id = ? AND status = 'waitlisted'
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_waitlist
  ON scheduled_camps (user_id, waitlist_position)
  WHERE status = 'waitlisted';

-- Index for camps by ZIP code (sibling logistics)
-- Supports: WHERE zip_code IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_camps_zip_code
  ON camps (zip_code)
  WHERE zip_code IS NOT NULL;

-- Index for scheduled camps by date range (calendar views)
-- Supports: WHERE user_id = ? ORDER BY start_date
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_user_dates
  ON scheduled_camps (user_id, start_date, end_date)
  WHERE status != 'cancelled';
```

### 4.2 Index Analysis

| Index | Purpose | Expected Queries/Day | Improvement |
|-------|---------|---------------------|-------------|
| `idx_scheduled_camps_conflict_check` | Conflict detection | 100-500 | Seq scan → Index scan |
| `idx_scheduled_camps_payments` | Payment tracker widget | 50-200 | Faster dashboard load |
| `idx_scheduled_camps_waitlist` | Waitlist management | 20-100 | Quick waitlist retrieval |
| `idx_camps_zip_code` | Distance calculations | 50-200 | Fast ZIP lookups |
| `idx_scheduled_camps_user_dates` | Calendar views | 200-1000 | Calendar rendering speed |

### 4.3 Index Maintenance

```sql
-- Analyze tables after migration for accurate query planning
ANALYZE camps;
ANALYZE scheduled_camps;
ANALYZE zip_code_coords;

-- Monitor index usage (run periodically)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## 5. RLS Policy Updates

### 5.1 ZIP Code Coords Table

```sql
-- Enable RLS
ALTER TABLE zip_code_coords ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Anyone can read ZIP code data"
  ON zip_code_coords
  FOR SELECT
  USING (true);

-- Only service role can modify
CREATE POLICY "Service role can modify ZIP codes"
  ON zip_code_coords
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 5.2 Scheduled Camps - No Policy Changes Needed

Existing RLS policies on `scheduled_camps` operate at the row level and automatically cover new columns:

```sql
-- Existing policy (verified):
-- Users can only access their own scheduled camps
-- WHERE user_id = auth.uid()
```

### 5.3 Camps Table - No Policy Changes Needed

Existing policies allow public read access to all camps, which covers the new columns.

### 5.4 Fix Missing RLS on camp_sessions

```sql
-- Enable RLS on camp_sessions (currently missing)
ALTER TABLE camp_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for session availability
CREATE POLICY "Anyone can read camp sessions"
  ON camp_sessions
  FOR SELECT
  USING (true);

-- Only admins can modify sessions
CREATE POLICY "Admins can modify camp sessions"
  ON camp_sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

---

## 6. Performance Optimization

### 6.1 Query Patterns & Optimization

#### Conflict Detection Query

**Before Optimization:**
```sql
-- Naive approach: Full table scan
SELECT * FROM scheduled_camps
WHERE child_id = $1
  AND status != 'cancelled'
  AND start_date <= $3 AND end_date >= $2;
```

**After Optimization:**
```sql
-- Uses idx_scheduled_camps_conflict_check
-- Partial index eliminates cancelled rows from scan
SELECT sc.*, c.camp_name
FROM scheduled_camps sc
JOIN camps c ON c.id = sc.camp_id
WHERE sc.child_id = $1
  AND sc.status != 'cancelled'
  AND sc.conflict_acknowledged = FALSE
  AND sc.start_date <= $3 AND sc.end_date >= $2;
```

**Expected Performance:**
- Before: ~50ms with 1000 scheduled camps
- After: ~2ms with index

#### Payment Tracking Query

**Optimized Query:**
```sql
-- Uses idx_scheduled_camps_payments
SELECT sc.*, c.camp_name, c.deposit_due_date, c.payment_due_date
FROM scheduled_camps sc
JOIN camps c ON c.id = sc.camp_id
WHERE sc.user_id = $1
  AND sc.status != 'cancelled'
  AND sc.payment_status != 'full_paid'
ORDER BY COALESCE(c.deposit_due_date, c.payment_due_date);
```

### 6.2 Caching Strategy

| Data Type | Cache Duration | Invalidation |
|-----------|---------------|--------------|
| ZIP code coords | 24 hours | Manual only |
| Camp details | 1 hour | On camp update |
| User scheduled camps | 5 minutes | On schedule change |
| Payment status | Real-time | No caching |

### 6.3 Connection Pooling Recommendations

For Supabase, connection pooling is handled automatically. Recommended settings:

```
# supabase/config.toml
[db.pooler]
enabled = true
default_pool_size = 15
max_client_conn = 100
```

---

## 7. Security Implementation

### 7.1 Input Validation at Database Level

All new columns include CHECK constraints:

```sql
-- Numeric fields must be non-negative
CHECK (extended_care_am_price IS NULL OR extended_care_am_price >= 0)
CHECK (expected_refund IS NULL OR expected_refund >= 0)

-- Enum fields use explicit value lists
CHECK (cancelled_by IS NULL OR cancelled_by IN ('user', 'camp'))
CHECK (payment_status IN ('unpaid', 'deposit_paid', 'full_paid'))

-- ZIP codes must be valid format
CHECK (zip_code IS NULL OR zip_code ~ '^\d{5}(-\d{4})?$')

-- Waitlist position must be positive
CHECK (waitlist_position IS NULL OR waitlist_position >= 1)
```

### 7.2 Function Security

All RPC functions use:

1. **SECURITY DEFINER** - Execute with function owner's privileges
2. **SET search_path = ''** - Prevent search path injection
3. **Parameter validation** - Type-safe parameters

```sql
CREATE OR REPLACE FUNCTION example_function(p_user_id UUID)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Critical security setting
AS $$
BEGIN
  -- Function body
END;
$$;
```

### 7.3 Audit Logging

Phase 1.5 operations should be logged to the existing `security_audit_log` table:

```sql
-- Example: Log payment status changes
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'payment_status_change',
      'scheduled_camp',
      NEW.id::text,
      jsonb_build_object(
        'old_status', OLD.payment_status,
        'new_status', NEW.payment_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_payment_status
  AFTER UPDATE OF payment_status ON scheduled_camps
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_status_change();
```

---

## 8. Migration Execution Plan

### 8.1 Pre-Migration Checklist

- [ ] Backup current database state
- [ ] Verify no active long-running queries
- [ ] Test migration in development environment
- [ ] Prepare rollback script
- [ ] Schedule during low-traffic period

### 8.2 Migration Script Location

The complete migration is located at:
```
backend/migrations/phase1_5_critical_gaps.sql
```

### 8.3 Execution Steps

```bash
# 1. Connect to Supabase
# Use the Supabase dashboard SQL editor or CLI

# 2. Run migration in transaction
psql $DATABASE_URL -f backend/migrations/phase1_5_critical_gaps.sql

# 3. Verify migration success
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scheduled_camps'
  AND column_name IN ('payment_status', 'needs_extended_care_am');

# 4. Run ANALYZE on affected tables
ANALYZE camps;
ANALYZE scheduled_camps;
ANALYZE zip_code_coords;
```

### 8.4 Rollback Procedure

Complete rollback script is included at the end of the migration file. To rollback:

```bash
# Extract and run rollback portion
psql $DATABASE_URL -c "
BEGIN;
-- [Rollback statements from migration file]
COMMIT;
"
```

### 8.5 Migration Verification Queries

```sql
-- Verify new columns exist
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('camps', 'scheduled_camps', 'zip_code_coords')
ORDER BY table_name, ordinal_position;

-- Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('check_schedule_conflict', 'calculate_zip_distance');

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'scheduled_camps';

-- Verify ZIP code data loaded
SELECT COUNT(*) FROM zip_code_coords;
-- Expected: 11+ rows
```

---

## 9. Integration Patterns

### 9.1 Frontend Integration (Read Operations)

#### Extended Care Toggle
```javascript
// Get camp extended care pricing
const { data: camp } = await supabase
  .from('camps')
  .select('extended_care_am_price, extended_care_pm_price')
  .eq('id', campId)
  .single();

// Get current extended care settings
const { data: scheduled } = await supabase
  .from('scheduled_camps')
  .select('needs_extended_care_am, needs_extended_care_pm')
  .eq('id', scheduledCampId)
  .single();
```

#### Payment Tracker
```javascript
// Use RPC function for categorized payments
const { data: payments } = await supabase
  .rpc('get_upcoming_payments', { p_user_id: userId });

// Group by urgency
const overdue = payments.filter(p => p.urgency === 'overdue');
const dueThisWeek = payments.filter(p => p.urgency === 'due_this_week');
const upcoming = payments.filter(p => p.urgency === 'upcoming');
```

### 9.2 Backend Integration (Write Operations)

#### Update Extended Care Settings
```javascript
export async function updateScheduledCampExtendedCare(scheduledCampId, settings) {
  // Allowlist fields
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

#### Update Payment Status
```javascript
export async function updatePaymentStatus(scheduledCampId, status) {
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
```

#### Cancel Scheduled Camp
```javascript
export async function cancelScheduledCamp(scheduledCampId, details) {
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
```

### 9.3 Real-time Subscriptions

```javascript
// Subscribe to payment deadline changes
const subscription = supabase
  .channel('payment_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'scheduled_camps',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      if (payload.new.payment_status !== payload.old.payment_status) {
        refreshPayments();
      }
    }
  )
  .subscribe();
```

---

## 10. Operational Procedures

### 10.1 Backup Procedures

Supabase provides automatic daily backups. For Phase 1.5 deployment:

```bash
# Manual backup before migration
pg_dump $DATABASE_URL > backup_pre_phase1_5_$(date +%Y%m%d).sql

# Backup specific tables
pg_dump $DATABASE_URL -t scheduled_camps -t camps > tables_backup.sql
```

### 10.2 Monitoring Queries

```sql
-- Monitor index usage
SELECT
  relname AS table,
  indexrelname AS index,
  idx_scan AS scans,
  idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check for slow queries
SELECT
  calls,
  mean_time,
  query
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table sizes
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### 10.3 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| ANALYZE | Weekly | `ANALYZE camps, scheduled_camps;` |
| VACUUM | Weekly | `VACUUM ANALYZE;` |
| Index rebuild | Monthly | `REINDEX TABLE scheduled_camps;` |
| Statistics check | Weekly | `SELECT * FROM pg_stat_user_tables;` |

---

## 11. Testing & Validation

### 11.1 Migration Test Cases

```sql
-- Test 1: Verify extended care columns
INSERT INTO scheduled_camps (
  user_id, camp_id, child_id, start_date, end_date,
  needs_extended_care_am, needs_extended_care_pm
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-camp',
  '00000000-0000-0000-0000-000000000002',
  '2026-06-15',
  '2026-06-19',
  TRUE,
  FALSE
);
-- Expected: Success

-- Test 2: Verify payment status constraint
UPDATE scheduled_camps
SET payment_status = 'invalid_status'
WHERE id = (SELECT id FROM scheduled_camps LIMIT 1);
-- Expected: Error - violates check constraint

-- Test 3: Verify conflict detection
SELECT * FROM check_schedule_conflict(
  '00000000-0000-0000-0000-000000000002',  -- child_id
  '2026-06-15',  -- start
  '2026-06-19',  -- end
  NULL           -- exclude_id
);
-- Expected: Returns any overlapping camps

-- Test 4: Verify distance calculation
SELECT calculate_zip_distance('93101', '93117');
-- Expected: ~8.5 miles
```

### 11.2 Performance Test Queries

```sql
-- Explain analyze conflict check
EXPLAIN ANALYZE
SELECT * FROM check_schedule_conflict(
  '00000000-0000-0000-0000-000000000002',
  '2026-06-15',
  '2026-06-19',
  NULL
);
-- Expected: Index Scan, < 10ms execution

-- Explain analyze payment query
EXPLAIN ANALYZE
SELECT * FROM get_upcoming_payments(
  '00000000-0000-0000-0000-000000000001'
);
-- Expected: Index Scan, < 20ms execution
```

### 11.3 Security Test Cases

```sql
-- Test RLS on zip_code_coords
SET ROLE anon;
SELECT * FROM zip_code_coords;
-- Expected: Success (public read)

INSERT INTO zip_code_coords VALUES ('00000', 'Test', 0, 0, 'Test');
-- Expected: Error (no insert permission)

RESET ROLE;
```

---

## Appendix A: Complete Migration SQL

See [backend/migrations/phase1_5_critical_gaps.sql](../backend/migrations/phase1_5_critical_gaps.sql) for the complete migration script.

## Appendix B: Type Definitions for Frontend

```typescript
// Phase 1.5 type extensions for scheduled_camps
interface ScheduledCampPhase15 {
  // Extended Care
  needs_extended_care_am: boolean;
  needs_extended_care_pm: boolean;

  // Conflict
  conflict_acknowledged: boolean;

  // Waitlist
  waitlist_position: number | null;

  // Cancellation
  cancelled_by: 'user' | 'camp' | null;
  cancellation_reason: string | null;
  expected_refund: number | null;
  refund_received: boolean;

  // Payment
  payment_status: 'unpaid' | 'deposit_paid' | 'full_paid';
}

// Phase 1.5 type extensions for camps
interface CampPhase15 {
  extended_care_am_price: number | null;
  extended_care_pm_price: number | null;
  deposit_amount: number | null;
  deposit_due_date: string | null;
  payment_due_date: string | null;
  zip_code: string | null;
}

// ZIP code reference
interface ZipCodeCoord {
  zip_code: string;
  city: string;
  latitude: number;
  longitude: number;
  area_name: string | null;
}
```

---

**Document Prepared By**: Database Engineer
**Review Requested From**: Tech Lead, Backend Engineers, Security Reviewer
**Next Step**: Apply migration to development environment, validate with test queries
