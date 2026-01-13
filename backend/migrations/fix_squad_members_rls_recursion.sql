-- Fix: Squad Members RLS Policy Recursion
-- Date: January 12, 2026
-- Issue: "infinite recursion detected in policy for relation squad_members"
--
-- The squad_members RLS policies are causing infinite recursion because
-- they likely check squad membership to verify access, which requires
-- reading squad_members, creating a loop.
--
-- Solution: Use SECURITY DEFINER functions to break the recursion cycle.

BEGIN;

-- ============================================================================
-- STEP 1: Create helper function to check squad membership without RLS
-- ============================================================================

-- Function to check if user is member of a squad (bypasses RLS)
CREATE OR REPLACE FUNCTION is_squad_member(p_squad_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = p_squad_id
      AND user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION is_squad_member IS 'Check if user is member of a squad. SECURITY DEFINER to avoid RLS recursion.';

-- Function to check if user is owner of a squad (bypasses RLS)
CREATE OR REPLACE FUNCTION is_squad_owner(p_squad_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = p_squad_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
$$;

COMMENT ON FUNCTION is_squad_owner IS 'Check if user is owner of a squad. SECURITY DEFINER to avoid RLS recursion.';

-- Function to get user's squad IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_squad_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT squad_id FROM public.squad_members WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_squad_ids IS 'Get all squad IDs for a user. SECURITY DEFINER to avoid RLS recursion.';


-- ============================================================================
-- STEP 2: Drop existing problematic policies on squad_members
-- ============================================================================

DROP POLICY IF EXISTS "Users can view squad members of their squads" ON squad_members;
DROP POLICY IF EXISTS "Users can view members of squads they belong to" ON squad_members;
DROP POLICY IF EXISTS "Squad members can view other members" ON squad_members;
DROP POLICY IF EXISTS "Users can insert themselves into squads" ON squad_members;
DROP POLICY IF EXISTS "Users can join squads" ON squad_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON squad_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON squad_members;
DROP POLICY IF EXISTS "Owners can manage squad members" ON squad_members;
DROP POLICY IF EXISTS "Owners can remove members" ON squad_members;


-- ============================================================================
-- STEP 3: Create new non-recursive policies on squad_members
-- ============================================================================

-- SELECT: Users can view members of squads they belong to
-- Uses the SECURITY DEFINER function to check membership without recursion
CREATE POLICY "Users can view squad members"
  ON squad_members
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- User can see other members if they're in the same squad
    squad_id IN (SELECT get_user_squad_ids())
  );

-- INSERT: Users can add themselves to a squad
CREATE POLICY "Users can join squads"
  ON squad_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can only insert yourself
    user_id = auth.uid()
  );

-- UPDATE: Users can update their own membership settings
CREATE POLICY "Users can update own membership"
  ON squad_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can remove themselves, or owners can remove others
CREATE POLICY "Users can leave or owners can remove"
  ON squad_members
  FOR DELETE
  TO authenticated
  USING (
    -- Users can remove themselves
    user_id = auth.uid()
    OR
    -- Owners can remove other members
    is_squad_owner(squad_id)
  );


-- ============================================================================
-- STEP 4: Fix policies on related tables (squads, squad_notifications)
-- ============================================================================

-- Drop and recreate squads policies to use the helper function
DROP POLICY IF EXISTS "Users can view their squads" ON squads;
DROP POLICY IF EXISTS "Users can view squads they belong to" ON squads;
DROP POLICY IF EXISTS "Squad members can view squad details" ON squads;

CREATE POLICY "Users can view squads they belong to"
  ON squads
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    id IN (SELECT get_user_squad_ids())
  );

-- Fix squad_notifications policies
DROP POLICY IF EXISTS "Users can view their squad notifications" ON squad_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON squad_notifications;

CREATE POLICY "Users can view own squad notifications"
  ON squad_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep the insert policy (for system/triggers)
-- Already exists: "Create squad notifications"


-- ============================================================================
-- STEP 5: Fix policies on camp_interests if they reference squads
-- ============================================================================

-- camp_interests shouldn't have squad-related RLS, but check anyway
DROP POLICY IF EXISTS "Users can view squad camp interests" ON camp_interests;

-- Standard user-based policy for camp_interests
DROP POLICY IF EXISTS "Users can view own interests" ON camp_interests;
CREATE POLICY "Users can view own interests"
  ON camp_interests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own interests" ON camp_interests;
CREATE POLICY "Users can insert own interests"
  ON camp_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own interests" ON camp_interests;
CREATE POLICY "Users can update own interests"
  ON camp_interests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own interests" ON camp_interests;
CREATE POLICY "Users can delete own interests"
  ON camp_interests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


COMMIT;

-- ============================================================================
-- VERIFICATION (run after migration)
-- ============================================================================

/*
-- Test that policies don't cause recursion
SELECT * FROM squad_members LIMIT 1;
SELECT * FROM squads LIMIT 1;
SELECT * FROM squad_notifications LIMIT 1;
SELECT * FROM camp_interests LIMIT 1;

-- Check policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('squad_members', 'squads', 'squad_notifications', 'camp_interests')
ORDER BY tablename, policyname;
*/
