-- Phase 1.5: Database Engineer Optimized Migration
-- Prepared by: Database Engineer
-- Date: January 12, 2026
-- Version: 2.0 (Optimized)
--
-- This migration builds on phase1_5_critical_gaps.sql with:
-- - Security hardening (SET search_path, CHECK constraints)
-- - Additional RPC functions for Frontend/Backend integration
-- - Performance-optimized indexes
-- - Audit logging triggers
-- - Fix for existing security issues (camp_sessions RLS)
--
-- IMPORTANT: Run this migration AFTER phase1_5_critical_gaps.sql
-- Test in development environment before production deployment.

BEGIN;

-- ============================================================================
-- SECTION 1: SECURITY HARDENING FOR EXISTING FUNCTIONS
-- ============================================================================

-- Fix check_schedule_conflict to include search_path security
DROP FUNCTION IF EXISTS check_schedule_conflict(UUID, DATE, DATE, UUID);

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

COMMENT ON FUNCTION check_schedule_conflict IS 'Detect scheduling conflicts for a child within a date range. Returns conflicting camps.';
GRANT EXECUTE ON FUNCTION check_schedule_conflict TO authenticated;

-- Fix calculate_zip_distance to include search_path security
DROP FUNCTION IF EXISTS calculate_zip_distance(TEXT, TEXT);

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
GRANT EXECUTE ON FUNCTION calculate_zip_distance TO authenticated, anon;


-- ============================================================================
-- SECTION 2: ADDITIONAL CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure numeric fields are non-negative (if not already added)
DO $$
BEGIN
  -- Extended care pricing must be non-negative
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'camps_extended_care_am_price_check'
  ) THEN
    ALTER TABLE camps
      ADD CONSTRAINT camps_extended_care_am_price_check
      CHECK (extended_care_am_price IS NULL OR extended_care_am_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'camps_extended_care_pm_price_check'
  ) THEN
    ALTER TABLE camps
      ADD CONSTRAINT camps_extended_care_pm_price_check
      CHECK (extended_care_pm_price IS NULL OR extended_care_pm_price >= 0);
  END IF;

  -- Deposit amount must be non-negative
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'camps_deposit_amount_check'
  ) THEN
    ALTER TABLE camps
      ADD CONSTRAINT camps_deposit_amount_check
      CHECK (deposit_amount IS NULL OR deposit_amount >= 0);
  END IF;

  -- Expected refund must be non-negative
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scheduled_camps_expected_refund_check'
  ) THEN
    ALTER TABLE scheduled_camps
      ADD CONSTRAINT scheduled_camps_expected_refund_check
      CHECK (expected_refund IS NULL OR expected_refund >= 0);
  END IF;

  -- Waitlist position must be positive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scheduled_camps_waitlist_position_check'
  ) THEN
    ALTER TABLE scheduled_camps
      ADD CONSTRAINT scheduled_camps_waitlist_position_check
      CHECK (waitlist_position IS NULL OR waitlist_position >= 1);
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: NEW RPC FUNCTIONS FOR FRONTEND/BACKEND INTEGRATION
-- ============================================================================

-- 3.1: Get upcoming payments with urgency categorization
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

COMMENT ON FUNCTION get_upcoming_payments IS 'Get scheduled camps with payment deadlines, categorized by urgency (overdue, due_this_week, upcoming)';
GRANT EXECUTE ON FUNCTION get_upcoming_payments TO authenticated;


-- 3.2: Check sibling logistics for a specific week
CREATE OR REPLACE FUNCTION check_sibling_logistics(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  child1_id UUID,
  child1_name TEXT,
  camp1_id TEXT,
  camp1_name TEXT,
  camp1_location TEXT,
  camp1_zip TEXT,
  child2_id UUID,
  child2_name TEXT,
  camp2_id TEXT,
  camp2_name TEXT,
  camp2_location TEXT,
  camp2_zip TEXT,
  distance_miles NUMERIC,
  estimated_drive_minutes INTEGER
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
      c.address AS location,
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
    s1.location AS camp1_location,
    s1.zip_code AS camp1_zip,
    s2.child_id AS child2_id,
    s2.child_name AS child2_name,
    s2.camp_id AS camp2_id,
    s2.camp_name AS camp2_name,
    s2.location AS camp2_location,
    s2.zip_code AS camp2_zip,
    public.calculate_zip_distance(s1.zip_code, s2.zip_code) AS distance_miles,
    ROUND(public.calculate_zip_distance(s1.zip_code, s2.zip_code) * 2.5)::INTEGER AS estimated_drive_minutes
  FROM scheduled s1
  CROSS JOIN scheduled s2
  WHERE s1.child_id < s2.child_id  -- Avoid duplicates
    AND public.calculate_zip_distance(s1.zip_code, s2.zip_code) > distance_threshold;
END;
$$;

COMMENT ON FUNCTION check_sibling_logistics IS 'Check for distant camps between siblings in the same week. Returns pairs exceeding 10 mile threshold.';
GRANT EXECUTE ON FUNCTION check_sibling_logistics TO authenticated;


-- 3.3: Calculate total cost with extended care for a user's summer
CREATE OR REPLACE FUNCTION calculate_summer_total(p_user_id UUID)
RETURNS TABLE (
  total_base_cost NUMERIC,
  total_extended_care_cost NUMERIC,
  total_cost NUMERIC,
  camp_count INTEGER,
  weeks_covered INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(sc.price, c.min_price, 0)), 0) AS total_base_cost,
    COALESCE(SUM(
      CASE WHEN sc.needs_extended_care_am THEN COALESCE(c.extended_care_am_price, 0) * 5 ELSE 0 END +
      CASE WHEN sc.needs_extended_care_pm THEN COALESCE(c.extended_care_pm_price, 0) * 5 ELSE 0 END
    ), 0) AS total_extended_care_cost,
    COALESCE(SUM(
      COALESCE(sc.price, c.min_price, 0) +
      CASE WHEN sc.needs_extended_care_am THEN COALESCE(c.extended_care_am_price, 0) * 5 ELSE 0 END +
      CASE WHEN sc.needs_extended_care_pm THEN COALESCE(c.extended_care_pm_price, 0) * 5 ELSE 0 END
    ), 0) AS total_cost,
    COUNT(DISTINCT sc.id)::INTEGER AS camp_count,
    COUNT(DISTINCT sc.start_date)::INTEGER AS weeks_covered
  FROM public.scheduled_camps sc
  JOIN public.camps c ON c.id = sc.camp_id
  WHERE sc.user_id = p_user_id
    AND sc.status NOT IN ('cancelled');
END;
$$;

COMMENT ON FUNCTION calculate_summer_total IS 'Calculate total summer costs including extended care for a user';
GRANT EXECUTE ON FUNCTION calculate_summer_total TO authenticated;


-- 3.4: Find alternative camps for a given context
CREATE OR REPLACE FUNCTION find_alternative_camps(
  p_child_age INTEGER,
  p_exclude_camp_id TEXT DEFAULT NULL,
  p_preferred_category TEXT DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  camp_id TEXT,
  camp_name TEXT,
  organization TEXT,
  category TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  min_age INTEGER,
  max_age INTEGER,
  has_extended_care BOOLEAN,
  location TEXT,
  is_category_match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS camp_id,
    c.camp_name,
    c.organization,
    c.category,
    c.min_price,
    c.max_price,
    c.min_age,
    c.max_age,
    c.has_extended_care,
    c.address AS location,
    (p_preferred_category IS NOT NULL AND c.category = p_preferred_category) AS is_category_match
  FROM public.camps c
  WHERE c.is_closed = FALSE
    AND (c.min_age IS NULL OR c.min_age <= p_child_age)
    AND (c.max_age IS NULL OR c.max_age >= p_child_age)
    AND (p_exclude_camp_id IS NULL OR c.id != p_exclude_camp_id)
    AND (p_max_price IS NULL OR c.min_price IS NULL OR c.min_price <= p_max_price)
  ORDER BY
    -- Category matches first
    (p_preferred_category IS NOT NULL AND c.category = p_preferred_category) DESC,
    -- Then by price (affordable first)
    c.min_price ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION find_alternative_camps IS 'Find alternative camps for a child, prioritizing category matches';
GRANT EXECUTE ON FUNCTION find_alternative_camps TO authenticated, anon;


-- ============================================================================
-- SECTION 4: ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for user schedule overview (calendar views)
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_user_dates
  ON scheduled_camps (user_id, start_date, end_date)
  WHERE status != 'cancelled';

-- Composite index for payment queries with status
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_user_payment_status
  ON scheduled_camps (user_id, status, payment_status)
  WHERE status != 'cancelled';

-- Index for camp lookups by category (alternative camp search)
CREATE INDEX IF NOT EXISTS idx_camps_category_active
  ON camps (category, min_price)
  WHERE is_closed = FALSE;


-- ============================================================================
-- SECTION 5: FIX MISSING RLS ON CAMP_SESSIONS
-- ============================================================================

-- Enable RLS on camp_sessions (identified as security issue)
ALTER TABLE camp_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for session availability
DROP POLICY IF EXISTS "Anyone can read camp sessions" ON camp_sessions;
CREATE POLICY "Anyone can read camp sessions"
  ON camp_sessions
  FOR SELECT
  USING (true);

-- Only admins can modify sessions
DROP POLICY IF EXISTS "Admins can modify camp sessions" ON camp_sessions;
CREATE POLICY "Admins can modify camp sessions"
  ON camp_sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================================
-- SECTION 6: AUDIT LOGGING FOR PHASE 1.5 OPERATIONS
-- ============================================================================

-- Trigger function for payment status changes
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
        'new_status', NEW.payment_status,
        'camp_id', NEW.camp_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for payment status logging
DROP TRIGGER IF EXISTS trg_log_payment_status ON scheduled_camps;
CREATE TRIGGER trg_log_payment_status
  AFTER UPDATE OF payment_status ON scheduled_camps
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_status_change();

-- Trigger function for cancellation tracking
CREATE OR REPLACE FUNCTION log_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'camp_cancelled',
      'scheduled_camp',
      NEW.id::text,
      jsonb_build_object(
        'camp_id', NEW.camp_id,
        'cancelled_by', NEW.cancelled_by,
        'reason', NEW.cancellation_reason,
        'expected_refund', NEW.expected_refund
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for cancellation logging
DROP TRIGGER IF EXISTS trg_log_cancellation ON scheduled_camps;
CREATE TRIGGER trg_log_cancellation
  AFTER UPDATE OF status ON scheduled_camps
  FOR EACH ROW
  EXECUTE FUNCTION log_cancellation();


-- ============================================================================
-- SECTION 7: RUN ANALYZE FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE camps;
ANALYZE scheduled_camps;
ANALYZE zip_code_coords;
ANALYZE children;


COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

/*
-- Verify new functions exist
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_schedule_conflict',
    'calculate_zip_distance',
    'get_upcoming_payments',
    'check_sibling_logistics',
    'calculate_summer_total',
    'find_alternative_camps'
  );

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('scheduled_camps', 'camps');

-- Verify check constraints
SELECT constraint_name, table_name
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND table_name IN ('camps', 'scheduled_camps');

-- Verify RLS on camp_sessions
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'camp_sessions';

-- Test conflict detection function
SELECT * FROM check_schedule_conflict(
  '00000000-0000-0000-0000-000000000000'::UUID,
  '2026-06-15'::DATE,
  '2026-06-19'::DATE,
  NULL
);

-- Test distance calculation
SELECT calculate_zip_distance('93101', '93117');
-- Expected: ~8.5 miles
*/


-- ============================================================================
-- ROLLBACK SCRIPT (run separately if needed)
-- ============================================================================

/*
BEGIN;

-- Drop new functions
DROP FUNCTION IF EXISTS get_upcoming_payments(UUID);
DROP FUNCTION IF EXISTS check_sibling_logistics(UUID, DATE);
DROP FUNCTION IF EXISTS calculate_summer_total(UUID);
DROP FUNCTION IF EXISTS find_alternative_camps(INTEGER, TEXT, TEXT, NUMERIC, INTEGER);

-- Drop triggers
DROP TRIGGER IF EXISTS trg_log_payment_status ON scheduled_camps;
DROP TRIGGER IF EXISTS trg_log_cancellation ON scheduled_camps;
DROP FUNCTION IF EXISTS log_payment_status_change();
DROP FUNCTION IF EXISTS log_cancellation();

-- Drop new indexes
DROP INDEX IF EXISTS idx_scheduled_camps_user_dates;
DROP INDEX IF EXISTS idx_scheduled_camps_user_payment_status;
DROP INDEX IF EXISTS idx_camps_category_active;

-- Drop new constraints (keep the ones from base migration)
ALTER TABLE camps DROP CONSTRAINT IF EXISTS camps_extended_care_am_price_check;
ALTER TABLE camps DROP CONSTRAINT IF EXISTS camps_extended_care_pm_price_check;
ALTER TABLE camps DROP CONSTRAINT IF EXISTS camps_deposit_amount_check;
ALTER TABLE scheduled_camps DROP CONSTRAINT IF EXISTS scheduled_camps_expected_refund_check;
ALTER TABLE scheduled_camps DROP CONSTRAINT IF EXISTS scheduled_camps_waitlist_position_check;

-- Remove RLS policies from camp_sessions (revert to original state)
DROP POLICY IF EXISTS "Anyone can read camp sessions" ON camp_sessions;
DROP POLICY IF EXISTS "Admins can modify camp sessions" ON camp_sessions;
ALTER TABLE camp_sessions DISABLE ROW LEVEL SECURITY;

COMMIT;
*/
