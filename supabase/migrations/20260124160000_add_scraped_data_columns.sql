-- Migration: Add columns for scraped camp data (extracted, pdf_links, social_media, etc.)
-- Purpose: Store rich scraped data from camp websites including pricing tiers, sessions, activities

ALTER TABLE camps ADD COLUMN IF NOT EXISTS extracted JSONB DEFAULT '{}'::jsonb;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS pdf_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS has_2026 BOOLEAN DEFAULT false;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS pages_scraped JSONB DEFAULT '[]'::jsonb;

-- Index for filtering camps with 2026 data
CREATE INDEX IF NOT EXISTS idx_camps_has_2026 ON camps(has_2026) WHERE has_2026 = true;

-- GIN index for querying extracted JSONB data
CREATE INDEX IF NOT EXISTS idx_camps_extracted ON camps USING gin(extracted);
