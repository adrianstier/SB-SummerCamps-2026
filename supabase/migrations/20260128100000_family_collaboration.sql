-- ============================================================================
-- FAMILY COLLABORATION FEATURE
-- Date: January 28, 2026
--
-- Enables real-time collaboration for families planning summer camps together.
-- Features:
--   - Family workspaces where multiple parents can plan
--   - Share schedule with partner functionality
--   - Comments/notes that sync between family members
--   - Request approval workflow for adding camps
--   - Activity feed showing recent family planning activity
--   - Camp suggestion feature (parent to parent)
--   - Real-time notifications for schedule changes
-- ============================================================================

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Function to check if user is a member of a family
CREATE OR REPLACE FUNCTION is_family_member(p_family_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = p_family_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

-- Function to check if user is admin of a family
CREATE OR REPLACE FUNCTION is_family_admin(p_family_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = p_family_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- Function to get user's family IDs
CREATE OR REPLACE FUNCTION get_user_family_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT family_id FROM public.family_members
  WHERE user_id = p_user_id AND status = 'active';
$$;

-- Function to get family member IDs for a family
CREATE OR REPLACE FUNCTION get_family_member_ids(p_family_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT user_id FROM public.family_members
  WHERE family_id = p_family_id AND status = 'active';
$$;

COMMENT ON FUNCTION is_family_member IS 'Check if user is member of a family. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION is_family_admin IS 'Check if user is admin of a family. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION get_user_family_ids IS 'Get all family IDs for a user. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION get_family_member_ids IS 'Get all member IDs for a family. SECURITY DEFINER to avoid RLS recursion.';


-- ============================================================================
-- 1. FAMILIES TABLE - Core family workspace
-- ============================================================================

CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  settings JSONB DEFAULT '{
    "require_approval": false,
    "notify_on_changes": true,
    "notify_on_suggestions": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);

-- RLS for families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. FAMILY_MEMBERS TABLE - Members of a family workspace
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  nickname TEXT, -- Optional display name within family
  can_edit_schedule BOOLEAN DEFAULT true,
  can_approve_camps BOOLEAN DEFAULT false,
  notify_schedule_changes BOOLEAN DEFAULT true,
  notify_comments BOOLEAN DEFAULT true,
  notify_suggestions BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- RLS for family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. FAMILY_INVITATIONS TABLE - Pending invitations to join family
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Null until they sign up
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT, -- Optional personal message
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON family_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(token);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family ON family_invitations(family_id);

-- RLS for family_invitations
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 4. SCHEDULE_COMMENTS TABLE - Comments on scheduled camps
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  scheduled_camp_id UUID REFERENCES scheduled_camps(id) ON DELETE CASCADE,
  week_date DATE, -- For comments on a week (not specific camp)
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  parent_comment_id UUID REFERENCES schedule_comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete for audit trail
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_comments_family ON schedule_comments(family_id);
CREATE INDEX IF NOT EXISTS idx_schedule_comments_camp ON schedule_comments(scheduled_camp_id);
CREATE INDEX IF NOT EXISTS idx_schedule_comments_week ON schedule_comments(week_date);
CREATE INDEX IF NOT EXISTS idx_schedule_comments_child ON schedule_comments(child_id);

-- RLS for schedule_comments
ALTER TABLE schedule_comments ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 5. CAMP_SUGGESTIONS TABLE - Suggest camps to family members
-- ============================================================================

CREATE TABLE IF NOT EXISTS camp_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  camp_id TEXT NOT NULL, -- Camp ID from camps table
  suggested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Null = suggest to all
  child_id UUID REFERENCES children(id) ON DELETE CASCADE, -- Which child this is for
  week_date DATE, -- Which week to suggest for
  note TEXT, -- Optional note with the suggestion
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'added')),
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_camp_suggestions_family ON camp_suggestions(family_id);
CREATE INDEX IF NOT EXISTS idx_camp_suggestions_to ON camp_suggestions(suggested_to);
CREATE INDEX IF NOT EXISTS idx_camp_suggestions_status ON camp_suggestions(status);

-- RLS for camp_suggestions
ALTER TABLE camp_suggestions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 6. APPROVAL_REQUESTS TABLE - Request approval for adding camps
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  scheduled_camp_id UUID REFERENCES scheduled_camps(id) ON DELETE CASCADE,
  camp_id TEXT NOT NULL, -- Camp being requested
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_price NUMERIC(10,2),
  note TEXT, -- Why requesting this camp
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_family ON approval_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);

-- RLS for approval_requests
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. FAMILY_ACTIVITY_FEED TABLE - Track all family planning activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_activity_feed (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'camp_added', 'camp_removed', 'camp_updated',
    'comment_added', 'comment_reply',
    'suggestion_sent', 'suggestion_accepted', 'suggestion_declined',
    'approval_requested', 'approval_approved', 'approval_denied',
    'member_joined', 'member_left', 'member_invited',
    'child_added', 'settings_changed'
  )),
  target_type TEXT, -- 'scheduled_camp', 'comment', 'suggestion', 'approval', 'member', 'child'
  target_id UUID,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  camp_id TEXT,
  camp_name TEXT,
  week_date DATE,
  details JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_family ON family_activity_feed(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON family_activity_feed(user_id);

-- RLS for family_activity_feed
ALTER TABLE family_activity_feed ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 8. FAMILY_NOTIFICATIONS TABLE - Real-time notifications for family events
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Who receives this
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who triggered this
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'schedule_change', 'new_comment', 'comment_reply', 'comment_mention',
    'new_suggestion', 'suggestion_response',
    'approval_requested', 'approval_response',
    'member_joined', 'member_left',
    'invitation_received', 'invitation_accepted'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT, -- What this links to
  target_id UUID,
  data JSONB DEFAULT '{}', -- Additional context
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_notifications_user ON family_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_notifications_family ON family_notifications(family_id);

-- RLS for family_notifications
ALTER TABLE family_notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 9. ADD family_id TO scheduled_camps (optional family association)
-- ============================================================================

ALTER TABLE scheduled_camps
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE scheduled_camps
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE scheduled_camps
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
CHECK (approval_status IN ('pending', 'approved', 'denied'));

CREATE INDEX IF NOT EXISTS idx_scheduled_camps_family ON scheduled_camps(family_id);


-- ============================================================================
-- 10. ADD family_id TO children (shared children within family)
-- ============================================================================

ALTER TABLE children
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ==================== FAMILIES ====================

CREATE POLICY "families_select"
  ON families
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT get_user_family_ids())
  );

CREATE POLICY "families_insert"
  ON families
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_update"
  ON families
  FOR UPDATE
  TO authenticated
  USING (is_family_admin(id))
  WITH CHECK (is_family_admin(id));

CREATE POLICY "families_delete"
  ON families
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());


-- ==================== FAMILY_MEMBERS ====================

CREATE POLICY "family_members_select"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_id IN (SELECT get_user_family_ids())
  );

CREATE POLICY "family_members_insert"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() -- Can add yourself
    OR is_family_admin(family_id) -- Admins can add others
  );

CREATE POLICY "family_members_update"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() -- Can update own membership
    OR is_family_admin(family_id) -- Admins can update others
  );

CREATE POLICY "family_members_delete"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() -- Can leave
    OR is_family_admin(family_id) -- Admins can remove
  );


-- ==================== FAMILY_INVITATIONS ====================

CREATE POLICY "family_invitations_select"
  ON family_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_user_id = auth.uid()
    OR is_family_member(family_id)
  );

CREATE POLICY "family_invitations_insert"
  ON family_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND is_family_member(family_id)
  );

CREATE POLICY "family_invitations_update"
  ON family_invitations
  FOR UPDATE
  TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_user_id = auth.uid()
  );

CREATE POLICY "family_invitations_delete"
  ON family_invitations
  FOR DELETE
  TO authenticated
  USING (
    inviter_id = auth.uid()
    OR is_family_admin(family_id)
  );


-- ==================== SCHEDULE_COMMENTS ====================

CREATE POLICY "schedule_comments_select"
  ON schedule_comments
  FOR SELECT
  TO authenticated
  USING (is_family_member(family_id));

CREATE POLICY "schedule_comments_insert"
  ON schedule_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_family_member(family_id)
  );

CREATE POLICY "schedule_comments_update"
  ON schedule_comments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() -- Own comments
    OR is_family_admin(family_id) -- Admins can edit (e.g., pin)
  );

CREATE POLICY "schedule_comments_delete"
  ON schedule_comments
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_family_admin(family_id)
  );


-- ==================== CAMP_SUGGESTIONS ====================

CREATE POLICY "camp_suggestions_select"
  ON camp_suggestions
  FOR SELECT
  TO authenticated
  USING (
    suggested_by = auth.uid()
    OR suggested_to = auth.uid()
    OR (suggested_to IS NULL AND is_family_member(family_id))
  );

CREATE POLICY "camp_suggestions_insert"
  ON camp_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    suggested_by = auth.uid()
    AND is_family_member(family_id)
  );

CREATE POLICY "camp_suggestions_update"
  ON camp_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    suggested_by = auth.uid()
    OR suggested_to = auth.uid()
    OR (suggested_to IS NULL AND is_family_member(family_id))
  );

CREATE POLICY "camp_suggestions_delete"
  ON camp_suggestions
  FOR DELETE
  TO authenticated
  USING (
    suggested_by = auth.uid()
    OR is_family_admin(family_id)
  );


-- ==================== APPROVAL_REQUESTS ====================

CREATE POLICY "approval_requests_select"
  ON approval_requests
  FOR SELECT
  TO authenticated
  USING (is_family_member(family_id));

CREATE POLICY "approval_requests_insert"
  ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND is_family_member(family_id)
  );

CREATE POLICY "approval_requests_update"
  ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    requested_by = auth.uid() -- Can cancel own
    OR (is_family_member(family_id) AND (
      SELECT can_approve_camps FROM family_members
      WHERE family_id = approval_requests.family_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "approval_requests_delete"
  ON approval_requests
  FOR DELETE
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR is_family_admin(family_id)
  );


-- ==================== FAMILY_ACTIVITY_FEED ====================

CREATE POLICY "family_activity_feed_select"
  ON family_activity_feed
  FOR SELECT
  TO authenticated
  USING (is_family_member(family_id));

CREATE POLICY "family_activity_feed_insert"
  ON family_activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_family_member(family_id)
  );

-- No update or delete - activity feed is append-only


-- ==================== FAMILY_NOTIFICATIONS ====================

CREATE POLICY "family_notifications_select"
  ON family_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "family_notifications_insert"
  ON family_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- Allow triggers/functions to create

CREATE POLICY "family_notifications_update"
  ON family_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()); -- Can only mark own as read

CREATE POLICY "family_notifications_delete"
  ON family_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- TRIGGER FUNCTIONS FOR REAL-TIME NOTIFICATIONS
-- ============================================================================

-- Function to create family notifications
CREATE OR REPLACE FUNCTION notify_family_members()
RETURNS TRIGGER AS $$
DECLARE
  member RECORD;
  family_name TEXT;
  actor_name TEXT;
BEGIN
  -- Get family name
  SELECT name INTO family_name FROM families WHERE id = NEW.family_id;

  -- Get actor name
  SELECT full_name INTO actor_name FROM profiles WHERE id = NEW.user_id;

  -- Notify all family members except the actor
  FOR member IN
    SELECT fm.user_id, fm.notify_schedule_changes, fm.notify_comments, fm.notify_suggestions
    FROM family_members fm
    WHERE fm.family_id = NEW.family_id
      AND fm.user_id != NEW.user_id
      AND fm.status = 'active'
  LOOP
    -- Insert notification based on activity type
    IF NEW.activity_type IN ('camp_added', 'camp_removed', 'camp_updated')
       AND member.notify_schedule_changes THEN
      INSERT INTO family_notifications (
        family_id, user_id, from_user_id, notification_type,
        title, message, target_type, target_id, data
      ) VALUES (
        NEW.family_id,
        member.user_id,
        NEW.user_id,
        'schedule_change',
        CASE NEW.activity_type
          WHEN 'camp_added' THEN 'Camp Added'
          WHEN 'camp_removed' THEN 'Camp Removed'
          ELSE 'Schedule Updated'
        END,
        COALESCE(actor_name, 'A family member') || ' ' ||
        CASE NEW.activity_type
          WHEN 'camp_added' THEN 'added ' || COALESCE(NEW.camp_name, 'a camp')
          WHEN 'camp_removed' THEN 'removed ' || COALESCE(NEW.camp_name, 'a camp')
          ELSE 'updated the schedule'
        END,
        NEW.target_type,
        NEW.target_id,
        NEW.details
      );
    ELSIF NEW.activity_type IN ('comment_added', 'comment_reply')
          AND member.notify_comments THEN
      INSERT INTO family_notifications (
        family_id, user_id, from_user_id, notification_type,
        title, message, target_type, target_id, data
      ) VALUES (
        NEW.family_id,
        member.user_id,
        NEW.user_id,
        CASE NEW.activity_type
          WHEN 'comment_reply' THEN 'comment_reply'
          ELSE 'new_comment'
        END,
        CASE NEW.activity_type
          WHEN 'comment_reply' THEN 'New Reply'
          ELSE 'New Comment'
        END,
        COALESCE(actor_name, 'A family member') || ' ' ||
        CASE NEW.activity_type
          WHEN 'comment_reply' THEN 'replied to a comment'
          ELSE 'left a comment'
        END,
        NEW.target_type,
        NEW.target_id,
        NEW.details
      );
    ELSIF NEW.activity_type = 'suggestion_sent'
          AND member.notify_suggestions THEN
      INSERT INTO family_notifications (
        family_id, user_id, from_user_id, notification_type,
        title, message, target_type, target_id, data
      ) VALUES (
        NEW.family_id,
        member.user_id,
        NEW.user_id,
        'new_suggestion',
        'Camp Suggestion',
        COALESCE(actor_name, 'A family member') || ' suggested ' || COALESCE(NEW.camp_name, 'a camp'),
        NEW.target_type,
        NEW.target_id,
        NEW.details
      );
    ELSIF NEW.activity_type = 'approval_requested' THEN
      -- Only notify users who can approve
      IF EXISTS (
        SELECT 1 FROM family_members
        WHERE family_id = NEW.family_id
          AND user_id = member.user_id
          AND can_approve_camps = true
      ) THEN
        INSERT INTO family_notifications (
          family_id, user_id, from_user_id, notification_type,
          title, message, target_type, target_id, data
        ) VALUES (
          NEW.family_id,
          member.user_id,
          NEW.user_id,
          'approval_requested',
          'Approval Needed',
          COALESCE(actor_name, 'A family member') || ' wants to add ' || COALESCE(NEW.camp_name, 'a camp'),
          NEW.target_type,
          NEW.target_id,
          NEW.details
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create notifications from activity feed
CREATE TRIGGER notify_family_on_activity
  AFTER INSERT ON family_activity_feed
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_members();


-- Function to record activity when schedule changes
CREATE OR REPLACE FUNCTION record_schedule_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if this camp belongs to a family
  IF NEW.family_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO family_activity_feed (
        family_id, user_id, activity_type, target_type, target_id,
        child_id, camp_id, camp_name, week_date, details
      ) VALUES (
        NEW.family_id,
        COALESCE(NEW.added_by, NEW.user_id),
        'camp_added',
        'scheduled_camp',
        NEW.id,
        NEW.child_id,
        NEW.camp_id,
        NEW.camp_name,
        NEW.start_date,
        jsonb_build_object(
          'price', NEW.price,
          'status', NEW.status
        )
      );
    ELSIF TG_OP = 'UPDATE' THEN
      -- Only record if meaningful changes
      IF OLD.status != NEW.status OR OLD.start_date != NEW.start_date
         OR OLD.end_date != NEW.end_date OR OLD.price != NEW.price THEN
        INSERT INTO family_activity_feed (
          family_id, user_id, activity_type, target_type, target_id,
          child_id, camp_id, camp_name, week_date, details
        ) VALUES (
          NEW.family_id,
          auth.uid(),
          'camp_updated',
          'scheduled_camp',
          NEW.id,
          NEW.child_id,
          NEW.camp_id,
          NEW.camp_name,
          NEW.start_date,
          jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'old_price', OLD.price,
            'new_price', NEW.price
          )
        );
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.family_id IS NOT NULL THEN
        INSERT INTO family_activity_feed (
          family_id, user_id, activity_type, target_type, target_id,
          child_id, camp_id, camp_name, week_date, details
        ) VALUES (
          OLD.family_id,
          auth.uid(),
          'camp_removed',
          'scheduled_camp',
          OLD.id,
          OLD.child_id,
          OLD.camp_id,
          OLD.camp_name,
          OLD.start_date,
          '{}'
        );
      END IF;
      RETURN OLD;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for schedule activity
DROP TRIGGER IF EXISTS record_schedule_activity_trigger ON scheduled_camps;
CREATE TRIGGER record_schedule_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON scheduled_camps
  FOR EACH ROW
  EXECUTE FUNCTION record_schedule_activity();


-- ============================================================================
-- HELPER FUNCTIONS FOR API
-- ============================================================================

-- Get family by invite code (bypasses RLS for public lookup)
CREATE OR REPLACE FUNCTION get_family_by_invite_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, member_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    f.id,
    f.name,
    (SELECT COUNT(*) FROM public.family_members fm WHERE fm.family_id = f.id AND fm.status = 'active') as member_count
  FROM public.families f
  WHERE f.invite_code = p_code;
$$;

-- Mark all family notifications as read
CREATE OR REPLACE FUNCTION mark_all_family_notifications_read(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE family_notifications
  SET read = true, read_at = NOW()
  WHERE user_id = p_user_id AND read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


-- ============================================================================
-- ENABLE REALTIME FOR FAMILY TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE family_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE family_activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE camp_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;


COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================================================

/*
-- Check all tables created:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('families', 'family_members', 'family_invitations', 'schedule_comments',
                  'camp_suggestions', 'approval_requests', 'family_activity_feed', 'family_notifications');

-- Check RLS policies:
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'family%' OR tablename IN ('schedule_comments', 'camp_suggestions', 'approval_requests');

-- Check functions:
SELECT proname FROM pg_proc
WHERE proname IN ('is_family_member', 'is_family_admin', 'get_user_family_ids', 'get_family_by_invite_code');

-- Check realtime enabled:
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
*/
