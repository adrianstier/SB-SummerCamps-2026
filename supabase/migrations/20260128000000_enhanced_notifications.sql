-- ============================================================================
-- ENHANCED NOTIFICATIONS SYSTEM
-- Adds comprehensive notification types and preferences
-- ============================================================================

-- Add new notification types to existing CHECK constraint
-- First, drop the existing constraint and add a new one with all types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Existing types
    'registration_reminder',
    'registration_open',
    'new_session',
    'camp_update',
    'review_reply',
    'question_answered',
    'schedule_reminder',
    'price_drop',
    'spots_available',
    'weekly_digest',
    'system',
    -- New types
    'registration_opening_alert',   -- X days before registration opens
    'waitlist_update',              -- Waitlist position changed or spot available
    'new_camp_match',               -- New camp matching user preferences
    'schedule_conflict',            -- Conflicting camp schedules detected
    'coverage_gap_reminder',        -- Reminder about uncovered weeks
    'friend_activity',              -- Squad member scheduled same camp
    'friend_match',                 -- Friend will be at same camp/week
    'squad_member_joined',          -- New member joined squad
    'squad_schedule_change',        -- Squad member changed schedule
    'budget_alert',                 -- Approaching or exceeding budget
    'early_bird_deadline',          -- Early bird pricing ending soon
    'camp_session_filling'          -- Session spots filling up
  ));

-- Add new columns to notifications table for enhanced functionality
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES squads(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_camp_id UUID REFERENCES scheduled_camps(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN (
  'registration',
  'pricing',
  'schedule',
  'social',
  'system',
  'general'
));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- Detailed user preferences for each notification type
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Global settings
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE, -- For future push notifications
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME,   -- e.g., '08:00'

  -- Registration alerts
  registration_alerts_enabled BOOLEAN DEFAULT TRUE,
  registration_alert_days INTEGER DEFAULT 7, -- Days before registration opens
  registration_opening_email BOOLEAN DEFAULT TRUE,
  registration_opening_push BOOLEAN DEFAULT TRUE,

  -- Price notifications
  price_drop_enabled BOOLEAN DEFAULT TRUE,
  price_drop_email BOOLEAN DEFAULT TRUE,
  price_drop_threshold INTEGER DEFAULT 10, -- Minimum % drop to notify
  early_bird_reminder_enabled BOOLEAN DEFAULT TRUE,
  early_bird_days_before INTEGER DEFAULT 3, -- Days before early bird ends

  -- Waitlist notifications
  waitlist_updates_enabled BOOLEAN DEFAULT TRUE,
  waitlist_email BOOLEAN DEFAULT TRUE,
  waitlist_position_change BOOLEAN DEFAULT TRUE,
  waitlist_spot_available BOOLEAN DEFAULT TRUE,

  -- New camp notifications
  new_camp_match_enabled BOOLEAN DEFAULT TRUE,
  new_camp_email BOOLEAN DEFAULT FALSE, -- Default to in-app only
  match_by_category BOOLEAN DEFAULT TRUE,
  match_by_age BOOLEAN DEFAULT TRUE,
  match_by_price BOOLEAN DEFAULT TRUE,

  -- Schedule notifications
  schedule_conflict_enabled BOOLEAN DEFAULT TRUE,
  schedule_conflict_email BOOLEAN DEFAULT FALSE,
  coverage_gap_enabled BOOLEAN DEFAULT TRUE,
  coverage_gap_email BOOLEAN DEFAULT FALSE,
  coverage_reminder_day TEXT DEFAULT 'monday', -- Day of week for reminders

  -- Friend/Squad notifications
  friend_activity_enabled BOOLEAN DEFAULT TRUE,
  friend_activity_email BOOLEAN DEFAULT FALSE,
  friend_match_enabled BOOLEAN DEFAULT TRUE,
  friend_match_email BOOLEAN DEFAULT TRUE,
  squad_updates_enabled BOOLEAN DEFAULT TRUE,
  squad_email BOOLEAN DEFAULT FALSE,

  -- Digest settings
  weekly_digest_enabled BOOLEAN DEFAULT TRUE,
  weekly_digest_day TEXT DEFAULT 'sunday', -- Day of week
  weekly_digest_time TIME DEFAULT '09:00',
  digest_include_recommendations BOOLEAN DEFAULT TRUE,
  digest_include_price_changes BOOLEAN DEFAULT TRUE,
  digest_include_registration_dates BOOLEAN DEFAULT TRUE,
  digest_include_coverage_status BOOLEAN DEFAULT TRUE,

  -- Budget alerts
  budget_alerts_enabled BOOLEAN DEFAULT TRUE,
  budget_warning_threshold INTEGER DEFAULT 80, -- % of budget to trigger warning
  budget_exceeded_email BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Create index for faster preference lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================================================
-- NOTIFICATION SUBSCRIPTIONS TABLE
-- Track which camps/weeks users are subscribed to for notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- What to watch
  camp_id TEXT, -- Specific camp ID
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  week_number INTEGER, -- Specific week
  category TEXT, -- Camp category

  -- Subscription types
  watch_registration BOOLEAN DEFAULT FALSE,
  watch_price BOOLEAN DEFAULT FALSE,
  watch_availability BOOLEAN DEFAULT FALSE,
  watch_friends BOOLEAN DEFAULT FALSE,

  -- Target values
  target_price DECIMAL(10,2), -- Alert if price drops below this

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration

  UNIQUE(user_id, camp_id, child_id, week_number)
);

ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON notification_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notif_subs_user ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_subs_camp ON notification_subscriptions(camp_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a notification with preferences check
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'general',
  p_priority TEXT DEFAULT 'normal',
  p_camp_id TEXT DEFAULT NULL,
  p_child_id UUID DEFAULT NULL,
  p_squad_id UUID DEFAULT NULL,
  p_scheduled_camp_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_prefs notification_preferences%ROWTYPE;
  v_should_email BOOLEAN := FALSE;
  v_should_notify BOOLEAN := TRUE;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;

  -- Check if notifications are globally enabled
  IF v_prefs.id IS NOT NULL AND NOT v_prefs.notifications_enabled THEN
    RETURN NULL;
  END IF;

  -- Check type-specific preferences
  IF v_prefs.id IS NOT NULL THEN
    CASE
      WHEN p_type IN ('registration_reminder', 'registration_open', 'registration_opening_alert') THEN
        v_should_notify := v_prefs.registration_alerts_enabled;
        v_should_email := v_prefs.registration_opening_email;
      WHEN p_type IN ('price_drop', 'early_bird_deadline') THEN
        v_should_notify := v_prefs.price_drop_enabled;
        v_should_email := v_prefs.price_drop_email;
      WHEN p_type IN ('waitlist_update', 'spots_available') THEN
        v_should_notify := v_prefs.waitlist_updates_enabled;
        v_should_email := v_prefs.waitlist_email;
      WHEN p_type = 'new_camp_match' THEN
        v_should_notify := v_prefs.new_camp_match_enabled;
        v_should_email := v_prefs.new_camp_email;
      WHEN p_type = 'schedule_conflict' THEN
        v_should_notify := v_prefs.schedule_conflict_enabled;
        v_should_email := v_prefs.schedule_conflict_email;
      WHEN p_type = 'coverage_gap_reminder' THEN
        v_should_notify := v_prefs.coverage_gap_enabled;
        v_should_email := v_prefs.coverage_gap_email;
      WHEN p_type IN ('friend_activity', 'friend_match') THEN
        v_should_notify := v_prefs.friend_activity_enabled;
        v_should_email := v_prefs.friend_activity_email;
      WHEN p_type IN ('squad_member_joined', 'squad_schedule_change') THEN
        v_should_notify := v_prefs.squad_updates_enabled;
        v_should_email := v_prefs.squad_email;
      WHEN p_type = 'weekly_digest' THEN
        v_should_notify := v_prefs.weekly_digest_enabled;
        v_should_email := TRUE; -- Digest is always email
      WHEN p_type = 'budget_alert' THEN
        v_should_notify := v_prefs.budget_alerts_enabled;
        v_should_email := v_prefs.budget_exceeded_email;
      ELSE
        v_should_notify := TRUE;
        v_should_email := v_prefs.email_enabled;
    END CASE;
  END IF;

  -- Don't create if user opted out
  IF NOT v_should_notify THEN
    RETURN NULL;
  END IF;

  -- Insert the notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    category,
    priority,
    camp_id,
    child_id,
    squad_id,
    scheduled_camp_id,
    data,
    action_url,
    expires_at,
    email_sent
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_category,
    p_priority,
    p_camp_id,
    p_child_id,
    p_squad_id,
    p_scheduled_camp_id,
    p_data,
    p_action_url,
    p_expires_at,
    NOT v_should_email -- Mark as sent if we don't need to send email
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
END;
$$;

-- Function to get unread notification count by category
CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id UUID)
RETURNS TABLE(category TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT n.category, COUNT(*)::BIGINT
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND n.read = FALSE
    AND n.dismissed = FALSE
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
  GROUP BY n.category;
END;
$$;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to initialize notification preferences for new users
CREATE OR REPLACE FUNCTION initialize_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to auto-create notification preferences for new profiles
DROP TRIGGER IF EXISTS create_notification_prefs_trigger ON profiles;
CREATE TRIGGER create_notification_prefs_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_notification_preferences();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, dismissed, created_at DESC)
  WHERE read = FALSE AND dismissed = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- Add index for email queue (notifications that need to be sent)
CREATE INDEX IF NOT EXISTS idx_notifications_email_queue ON notifications(email_sent, created_at)
  WHERE email_sent = FALSE;
