-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Addresses security review findings from 2026-01-11
-- ============================================================================

-- ============================================================================
-- 1. ADD ROLE MODIFICATION PROTECTION
-- Prevents users from escalating their own privileges via direct DB access
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policy with role protection
-- Users can update their own profile, but cannot change their role
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Role must remain unchanged (prevent privilege escalation)
      role IS NOT DISTINCT FROM (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    )
  );

-- ============================================================================
-- 2. ADD SHARE TOKEN EXPIRATION
-- Comparison list share tokens now expire after 14 days by default
-- ============================================================================

-- Add expiration column to comparison_lists
ALTER TABLE comparison_lists
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

-- Update the shared comparisons policy to check expiration
DROP POLICY IF EXISTS "Anyone can view shared comparisons" ON comparison_lists;

CREATE POLICY "Anyone can view non-expired shared comparisons"
  ON comparison_lists FOR SELECT
  USING (
    -- User owns the list
    auth.uid() = user_id
    OR (
      -- List is shared AND not expired
      is_shared = TRUE
      AND (share_expires_at IS NULL OR share_expires_at > NOW())
    )
  );

-- Create function to set default expiration when sharing
CREATE OR REPLACE FUNCTION set_share_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_shared changes from false to true, set 14-day expiration
  IF NEW.is_shared = TRUE AND (OLD.is_shared IS NULL OR OLD.is_shared = FALSE) THEN
    NEW.share_expires_at := NOW() + INTERVAL '14 days';
  END IF;

  -- When is_shared changes to false, clear expiration
  IF NEW.is_shared = FALSE AND OLD.is_shared = TRUE THEN
    NEW.share_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-expiration
DROP TRIGGER IF EXISTS set_share_expiration_trigger ON comparison_lists;
CREATE TRIGGER set_share_expiration_trigger
  BEFORE UPDATE ON comparison_lists
  FOR EACH ROW
  WHEN (OLD.is_shared IS DISTINCT FROM NEW.is_shared)
  EXECUTE FUNCTION set_share_expiration();

-- ============================================================================
-- 3. ADD ADMIN HELPER FUNCTION (Security Definer)
-- Prevents recursive RLS policy issues with admin checks
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update admin policies to use the function (more efficient, no recursion)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage camp edits" ON camp_edits;
CREATE POLICY "Admins can manage camp edits"
  ON camp_edits FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage reports" ON reported_content;
CREATE POLICY "Admins can manage reports"
  ON reported_content FOR ALL
  USING (is_admin());

-- ============================================================================
-- 4. ADD AUDIT LOGGING TABLE FOR SENSITIVE OPERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON security_audit_log(action, created_at DESC);

-- RLS: Only admins can view audit logs
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON security_audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- 5. ADD RATE LIMIT TRACKING TABLE (for distributed rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 minute'
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_entries(expires_at);

-- Function to clean up expired entries (call periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_entries WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================================================

-- Verify role protection policy exists:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname LIKE '%update%';

-- Verify share_expires_at column exists:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'comparison_lists' AND column_name = 'share_expires_at';

-- Verify is_admin function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'is_admin';
