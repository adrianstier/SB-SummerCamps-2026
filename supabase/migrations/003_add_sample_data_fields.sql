-- Migration: Add sample data tracking fields
-- Purpose: Support guided tour with sample data that can be easily cleared
-- Date: 2026-01-05

-- Add is_sample flag to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE;

-- Add is_sample flag to scheduled_camps table
ALTER TABLE scheduled_camps ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE;

-- Add tour tracking fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_shown BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

-- Create index for quick sample data cleanup
CREATE INDEX IF NOT EXISTS idx_children_is_sample ON children(user_id) WHERE is_sample = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_camps_is_sample ON scheduled_camps(user_id) WHERE is_sample = TRUE;

-- Add comment
COMMENT ON COLUMN children.is_sample IS 'Marks sample data created during guided tour';
COMMENT ON COLUMN scheduled_camps.is_sample IS 'Marks sample scheduled camps from guided tour';
COMMENT ON COLUMN profiles.tour_shown IS 'Whether user was offered the guided tour';
COMMENT ON COLUMN profiles.tour_completed IS 'Whether user completed the guided tour';
