-- Phase 1.5: Critical Gap Closure - Database Migration
-- Prepared by: Project Manager
-- Date: January 11, 2026
--
-- This migration adds all schema changes needed for Phase 1.5 features:
-- - Extended care cost tracking
-- - Schedule conflict detection
-- - Waitlist workflow
-- - Payment deadline tracking
-- - Camp cancellation handling
-- - Sibling logistics (ZIP code support)
--
-- IMPORTANT: Run this migration in a single transaction.
-- Test in development environment before production deployment.

BEGIN;

-- ============================================================================
-- STREAM A: Extended Care Cost Tracking
-- ============================================================================

-- A1: Add extended care pricing columns to camps table
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS extended_care_am_price NUMERIC,
  ADD COLUMN IF NOT EXISTS extended_care_pm_price NUMERIC;

COMMENT ON COLUMN camps.extended_care_am_price IS 'Daily rate for morning extended care (before standard hours)';
COMMENT ON COLUMN camps.extended_care_pm_price IS 'Daily rate for afternoon extended care (after standard hours)';

-- A1: Add extended care flags to scheduled_camps
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS needs_extended_care_am BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_extended_care_pm BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN scheduled_camps.needs_extended_care_am IS 'Whether this scheduled camp requires morning extended care';
COMMENT ON COLUMN scheduled_camps.needs_extended_care_pm IS 'Whether this scheduled camp requires afternoon extended care';


-- ============================================================================
-- STREAM B: Schedule Conflict Detection
-- ============================================================================

-- B1: Add conflict acknowledgement to scheduled_camps
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS conflict_acknowledged BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN scheduled_camps.conflict_acknowledged IS 'User acknowledged scheduling conflict (e.g., AM/PM camps same week)';

-- B1: Create or replace conflict check function
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.camp_id,
    c.camp_name,
    sc.start_date,
    sc.end_date
  FROM scheduled_camps sc
  JOIN camps c ON c.id = sc.camp_id
  WHERE sc.child_id = p_child_id
    AND sc.status NOT IN ('cancelled')
    AND sc.conflict_acknowledged = FALSE
    AND (p_exclude_id IS NULL OR sc.id != p_exclude_id)
    AND (
      (p_start_date <= sc.end_date AND p_end_date >= sc.start_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- STREAM C: Waitlist & Cancellation Workflows
-- ============================================================================

-- C1: Add waitlist tracking to scheduled_camps
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

COMMENT ON COLUMN scheduled_camps.waitlist_position IS 'Position on waitlist (1 = first in line). NULL if not waitlisted.';

-- C1: Add cancellation tracking to scheduled_camps
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS expected_refund NUMERIC,
  ADD COLUMN IF NOT EXISTS refund_received BOOLEAN DEFAULT FALSE;

-- Add check constraint for cancelled_by values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scheduled_camps_cancelled_by_check'
  ) THEN
    ALTER TABLE scheduled_camps
      ADD CONSTRAINT scheduled_camps_cancelled_by_check
      CHECK (cancelled_by IS NULL OR cancelled_by IN ('user', 'camp'));
  END IF;
END $$;

COMMENT ON COLUMN scheduled_camps.cancelled_by IS 'Who initiated cancellation: user or camp';
COMMENT ON COLUMN scheduled_camps.cancellation_reason IS 'Reason for cancellation (weather, low enrollment, personal, etc.)';
COMMENT ON COLUMN scheduled_camps.expected_refund IS 'Expected refund amount based on camp policy';
COMMENT ON COLUMN scheduled_camps.refund_received IS 'Whether refund has been received';


-- ============================================================================
-- STREAM D: Payment Deadline Tracking
-- ============================================================================

-- D1: Add payment-related columns to camps table
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deposit_due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_due_date DATE;

COMMENT ON COLUMN camps.deposit_amount IS 'Required deposit amount to secure spot';
COMMENT ON COLUMN camps.deposit_due_date IS 'Deadline for deposit payment';
COMMENT ON COLUMN camps.payment_due_date IS 'Deadline for full payment';

-- D1: Add payment status to scheduled_camps
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Add check constraint for payment_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scheduled_camps_payment_status_check'
  ) THEN
    ALTER TABLE scheduled_camps
      ADD CONSTRAINT scheduled_camps_payment_status_check
      CHECK (payment_status IN ('unpaid', 'deposit_paid', 'full_paid'));
  END IF;
END $$;

COMMENT ON COLUMN scheduled_camps.payment_status IS 'Payment status: unpaid, deposit_paid, full_paid';


-- ============================================================================
-- STREAM E: Sibling Logistics Support
-- ============================================================================

-- E1: Add ZIP code to camps for distance estimation (if not exists)
-- Note: Full geocoding (lat/long) is planned for Phase 3
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS zip_code TEXT;

COMMENT ON COLUMN camps.zip_code IS 'Camp ZIP code for distance estimation. Full geocoding in Phase 3.';

-- E1: Create ZIP code distance estimation table
-- Santa Barbara area ZIP codes with approximate coordinates for distance calc
CREATE TABLE IF NOT EXISTS zip_code_coords (
  zip_code TEXT PRIMARY KEY,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  area_name TEXT -- e.g., 'Downtown', 'Mesa', 'Goleta', 'Carpinteria'
);

-- Insert Santa Barbara area ZIP codes
INSERT INTO zip_code_coords (zip_code, city, latitude, longitude, area_name) VALUES
  ('93101', 'Santa Barbara', 34.4208, -119.6982, 'Downtown'),
  ('93102', 'Santa Barbara', 34.4208, -119.6982, 'Downtown PO'),
  ('93103', 'Santa Barbara', 34.4358, -119.7163, 'West Side'),
  ('93105', 'Santa Barbara', 34.4492, -119.7278, 'Mission Canyon'),
  ('93106', 'Santa Barbara', 34.4140, -119.8489, 'UCSB/Isla Vista'),
  ('93107', 'Santa Barbara', 34.4140, -119.8489, 'UCSB PO'),
  ('93108', 'Santa Barbara', 34.4358, -119.6295, 'Montecito'),
  ('93109', 'Santa Barbara', 34.4022, -119.7238, 'Mesa'),
  ('93110', 'Santa Barbara', 34.4492, -119.7611, 'San Roque'),
  ('93111', 'Santa Barbara', 34.4500, -119.8000, 'Goleta (SB)'),
  ('93116', 'Goleta', 34.4358, -119.8273, 'Goleta PO'),
  ('93117', 'Goleta', 34.4358, -119.8673, 'Goleta'),
  ('93013', 'Carpinteria', 34.3989, -119.5184, 'Carpinteria'),
  ('93067', 'Summerland', 34.4214, -119.5965, 'Summerland')
ON CONFLICT (zip_code) DO NOTHING;

-- E1: Create distance calculation function (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_zip_distance(zip1 TEXT, zip2 TEXT)
RETURNS NUMERIC AS $$
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
  FROM zip_code_coords WHERE zip_code = zip1;

  -- Get coordinates for second ZIP
  SELECT latitude, longitude INTO lat2, lon2
  FROM zip_code_coords WHERE zip_code = zip2;

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
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_zip_distance IS 'Calculate approximate distance in miles between two ZIP codes using Haversine formula';


-- ============================================================================
-- NOTIFICATION TYPE ADDITIONS
-- ============================================================================

-- Add new notification types for Phase 1.5 features
-- Note: The CHECK constraint needs to be updated to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
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
    -- Phase 1.5 additions:
    'payment_reminder'::text,
    'payment_overdue'::text,
    'camp_cancelled'::text,
    'waitlist_update'::text,
    'schedule_conflict'::text,
    'sibling_logistics'::text
  ]));


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for efficient conflict checking
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_child_dates
  ON scheduled_camps (child_id, start_date, end_date)
  WHERE status != 'cancelled';

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_payment_status
  ON scheduled_camps (user_id, payment_status)
  WHERE payment_status != 'full_paid';

-- Index for waitlist queries
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_waitlist
  ON scheduled_camps (user_id, status)
  WHERE status = 'waitlisted';

-- Index for camps by ZIP code (for sibling logistics)
CREATE INDEX IF NOT EXISTS idx_camps_zip_code
  ON camps (zip_code)
  WHERE zip_code IS NOT NULL;


-- ============================================================================
-- RLS POLICY UPDATES (if needed)
-- ============================================================================

-- The existing RLS policies on scheduled_camps should cover the new columns
-- since they operate at the row level. No updates needed.

-- zip_code_coords is reference data, allow public read
ALTER TABLE zip_code_coords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ZIP code data" ON zip_code_coords;
CREATE POLICY "Anyone can read ZIP code data" ON zip_code_coords
  FOR SELECT USING (true);


COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (run separately if needed)
-- ============================================================================

/*
-- To rollback this migration, run the following:

BEGIN;

-- Remove new columns from camps
ALTER TABLE camps
  DROP COLUMN IF EXISTS extended_care_am_price,
  DROP COLUMN IF EXISTS extended_care_pm_price,
  DROP COLUMN IF EXISTS deposit_amount,
  DROP COLUMN IF EXISTS deposit_due_date,
  DROP COLUMN IF EXISTS payment_due_date,
  DROP COLUMN IF EXISTS zip_code;

-- Remove new columns from scheduled_camps
ALTER TABLE scheduled_camps
  DROP COLUMN IF EXISTS needs_extended_care_am,
  DROP COLUMN IF EXISTS needs_extended_care_pm,
  DROP COLUMN IF EXISTS conflict_acknowledged,
  DROP COLUMN IF EXISTS waitlist_position,
  DROP COLUMN IF EXISTS cancelled_by,
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS expected_refund,
  DROP COLUMN IF EXISTS refund_received,
  DROP COLUMN IF EXISTS payment_status;

-- Drop functions
DROP FUNCTION IF EXISTS check_schedule_conflict(UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS calculate_zip_distance(TEXT, TEXT);

-- Drop ZIP code table
DROP TABLE IF EXISTS zip_code_coords;

-- Remove new indexes
DROP INDEX IF EXISTS idx_scheduled_camps_child_dates;
DROP INDEX IF EXISTS idx_scheduled_camps_payment_status;
DROP INDEX IF EXISTS idx_scheduled_camps_waitlist;
DROP INDEX IF EXISTS idx_camps_zip_code;

-- Restore original notification type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
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
    'system'::text
  ]));

COMMIT;
*/
