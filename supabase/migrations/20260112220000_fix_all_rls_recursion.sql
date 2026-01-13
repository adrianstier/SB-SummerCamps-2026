-- Fix: Complete RLS Recursion Fix for All Squad-Related Tables
-- Date: January 12, 2026
-- Issue: Multiple tables have RLS policies causing infinite recursion
--
-- Tables affected: squad_members, squads, squad_notifications, camp_interests
--
-- Solution: Use SECURITY DEFINER functions consistently across all tables

BEGIN;

-- ============================================================================
-- STEP 1: Ensure helper functions exist (create or replace)
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

-- Function to get member user_ids for a squad (bypasses RLS)
CREATE OR REPLACE FUNCTION get_squad_member_ids(p_squad_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT user_id FROM public.squad_members WHERE squad_id = p_squad_id;
$$;

COMMENT ON FUNCTION is_squad_member IS 'Check if user is member of a squad. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION is_squad_owner IS 'Check if user is owner of a squad. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION get_user_squad_ids IS 'Get all squad IDs for a user. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION get_squad_member_ids IS 'Get all member IDs for a squad. SECURITY DEFINER to avoid RLS recursion.';


-- ============================================================================
-- STEP 2: Drop ALL existing policies on squad_members
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'squad_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON squad_members', pol.policyname);
    END LOOP;
END $$;


-- ============================================================================
-- STEP 3: Create new non-recursive policies on squad_members
-- ============================================================================

-- SELECT: Users can view their own membership OR members of squads they belong to
CREATE POLICY "squad_members_select"
  ON squad_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    squad_id IN (SELECT get_user_squad_ids())
  );

-- INSERT: Users can only add themselves to squads
CREATE POLICY "squad_members_insert"
  ON squad_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own membership
CREATE POLICY "squad_members_update"
  ON squad_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can remove themselves, or owners can remove others
CREATE POLICY "squad_members_delete"
  ON squad_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    is_squad_owner(squad_id)
  );


-- ============================================================================
-- STEP 4: Drop ALL existing policies on squads
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'squads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON squads', pol.policyname);
    END LOOP;
END $$;


-- ============================================================================
-- STEP 5: Create new non-recursive policies on squads
-- ============================================================================

CREATE POLICY "squads_select"
  ON squads
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    id IN (SELECT get_user_squad_ids())
  );

CREATE POLICY "squads_insert"
  ON squads
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "squads_update"
  ON squads
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "squads_delete"
  ON squads
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());


-- ============================================================================
-- STEP 6: Drop ALL existing policies on squad_notifications
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'squad_notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON squad_notifications', pol.policyname);
    END LOOP;
END $$;


-- ============================================================================
-- STEP 7: Create new non-recursive policies on squad_notifications
-- ============================================================================

CREATE POLICY "squad_notifications_select"
  ON squad_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "squad_notifications_insert"
  ON squad_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- Allow system/triggers to create notifications

CREATE POLICY "squad_notifications_update"
  ON squad_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "squad_notifications_delete"
  ON squad_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- STEP 8: Drop ALL existing policies on camp_interests
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'camp_interests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON camp_interests', pol.policyname);
    END LOOP;
END $$;


-- ============================================================================
-- STEP 9: Create new non-recursive policies on camp_interests
-- Key insight: camp_interests should be viewable by:
-- 1. The owner (user_id = auth.uid())
-- 2. Squad members IF looking_for_friends is true
-- ============================================================================

CREATE POLICY "camp_interests_select"
  ON camp_interests
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own interests
    user_id = auth.uid()
    OR
    -- User can see interests from squad members who are looking for friends
    (
      looking_for_friends = TRUE
      AND user_id IN (
        SELECT get_squad_member_ids(squad_id)
        FROM (SELECT get_user_squad_ids() AS squad_id) AS user_squads
      )
    )
  );

CREATE POLICY "camp_interests_insert"
  ON camp_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "camp_interests_update"
  ON camp_interests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "camp_interests_delete"
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
