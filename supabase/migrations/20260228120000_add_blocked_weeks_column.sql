-- Add blocked_weeks JSONB column to profiles for storing vacation/schedule blocks per child
-- Structure: { [childId]: { [weekNum]: { id, label, icon, color, note?, groupId? } } }
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_weeks JSONB DEFAULT '{}';
