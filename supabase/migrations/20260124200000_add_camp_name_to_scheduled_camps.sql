-- Add camp_name column to scheduled_camps table
-- This stores the camp name at the time of scheduling for display purposes

ALTER TABLE scheduled_camps ADD COLUMN IF NOT EXISTS camp_name TEXT;
