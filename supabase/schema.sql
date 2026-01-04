-- ============================================================================
-- SANTA BARBARA SUMMER CAMPS 2026 - DATABASE SCHEMA
-- Supabase PostgreSQL Schema for Multi-User Camp Directory
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- PROFILES TABLE
-- Extended user profile beyond Supabase auth.users
-- ============================================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  -- User role for admin functionality
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'camp_owner')),
  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  -- Notification preferences (JSON for granular control)
  notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": false,
    "weekly_digest": true,
    "price_drop": true,
    "spots_available": true,
    "registration_open": true,
    "new_session": true,
    "question_answered": true
  }'::jsonb,
  -- User preferences
  preferred_categories TEXT[], -- Array of preferred camp categories
  preferred_price_range INT4RANGE, -- e.g., [200, 500]
  zip_code TEXT,
  -- Metadata
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and public info of others
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- CHILDREN TABLE
-- Track multiple children per family with different ages and preferences
-- ============================================================================
CREATE TABLE children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  birth_date DATE,
  age_as_of_summer INTEGER, -- Age they'll be during summer 2026
  -- Child-specific preferences
  interests TEXT[], -- Array of interests for recommendations
  special_needs TEXT,
  allergies TEXT,
  -- Display
  notes TEXT,
  color TEXT DEFAULT '#3b82f6', -- For calendar display
  avatar_emoji TEXT DEFAULT '👧', -- Fun emoji avatar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own children"
  ON children FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- CAMP SESSIONS TABLE
-- Store specific weeks/dates that camps offer
-- ============================================================================
CREATE TABLE camp_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  camp_id TEXT NOT NULL,
  session_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price DECIMAL(10,2),
  spots_total INTEGER,
  spots_remaining INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  registration_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_camp_sessions_dates ON camp_sessions(start_date, end_date);
CREATE INDEX idx_camp_sessions_camp_id ON camp_sessions(camp_id);

-- ============================================================================
-- FAVORITES TABLE
-- Camps users have starred for later consideration
-- ============================================================================
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  camp_id TEXT NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, camp_id, child_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- SCHEDULED CAMPS TABLE
-- Actual camp weeks added to the family calendar
-- ============================================================================
CREATE TABLE scheduled_camps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  camp_id TEXT NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES camp_sessions(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'registered', 'confirmed', 'waitlisted', 'cancelled')),
  price DECIMAL(10,2),
  registration_date TIMESTAMPTZ,
  confirmation_number TEXT,
  google_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_camps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled camps"
  ON scheduled_camps FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_scheduled_camps_dates ON scheduled_camps(user_id, child_id, start_date, end_date);

-- ============================================================================
-- REVIEWS TABLE
-- User reviews and ratings for camps
-- ============================================================================
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  camp_id TEXT NOT NULL,
  -- Rating dimensions (1-5 scale)
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
  activities_rating INTEGER CHECK (activities_rating BETWEEN 1 AND 5),
  safety_rating INTEGER CHECK (safety_rating BETWEEN 1 AND 5),
  -- Review content
  title TEXT,
  review_text TEXT,
  -- Context
  child_age_at_time INTEGER, -- Age of child when they attended
  year_attended INTEGER,
  would_recommend BOOLEAN DEFAULT TRUE,
  -- Media
  photos TEXT[], -- Array of photo URLs
  -- Moderation
  status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'flagged', 'removed')),
  helpful_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per user per camp
  UNIQUE(user_id, camp_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can read all published reviews
CREATE POLICY "Anyone can view published reviews"
  ON reviews FOR SELECT
  USING (status = 'published');

-- Users can manage their own reviews
CREATE POLICY "Users can manage own reviews"
  ON reviews FOR ALL
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_reviews_camp_id ON reviews(camp_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating);

-- ============================================================================
-- REVIEW HELPFUL VOTES TABLE
-- Track which users found reviews helpful
-- ============================================================================
CREATE TABLE review_helpful_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own votes"
  ON review_helpful_votes FOR ALL
  USING (auth.uid() = user_id);

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_helpful_count
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- ============================================================================
-- QUESTIONS & ANSWERS TABLE
-- User questions about camps and community answers
-- ============================================================================
CREATE TABLE camp_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  camp_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON camp_questions FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can manage own questions"
  ON camp_questions FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE camp_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES camp_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  is_from_camp_owner BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers"
  ON camp_answers FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can manage own answers"
  ON camp_answers FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- User notifications for various events
-- ============================================================================
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
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
    'system'
  )),
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Related entities
  camp_id TEXT,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  question_id UUID REFERENCES camp_questions(id) ON DELETE SET NULL,
  -- Additional data for email templates (JSON)
  data JSONB DEFAULT '{}',
  -- Action URL
  action_url TEXT,
  -- Status
  read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, read, created_at DESC);

-- ============================================================================
-- CAMP WATCHLIST TABLE
-- Users can watch camps for price drops or availability
-- ============================================================================
CREATE TABLE camp_watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  camp_id TEXT NOT NULL,
  -- What to watch for
  notify_price_drop BOOLEAN DEFAULT TRUE,
  notify_spots_available BOOLEAN DEFAULT TRUE,
  notify_registration_opens BOOLEAN DEFAULT TRUE,
  -- Target price for alerts
  target_price DECIMAL(10,2),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, camp_id)
);

ALTER TABLE camp_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist"
  ON camp_watchlist FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMPARISON LISTS TABLE
-- Saved camp comparisons
-- ============================================================================
CREATE TABLE comparison_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Comparison',
  camp_ids TEXT[] NOT NULL, -- Array of camp IDs to compare
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  notes TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comparison_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own comparison lists"
  ON comparison_lists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared comparisons"
  ON comparison_lists FOR SELECT
  USING (is_shared = TRUE);

-- ============================================================================
-- ADMIN: CAMP EDITS TABLE
-- Track admin edits to camp data
-- ============================================================================
CREATE TABLE camp_edits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  camp_id TEXT NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- What was changed
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  -- Reason for edit
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_edits ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage edits
CREATE POLICY "Admins can manage camp edits"
  ON camp_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- ADMIN: REPORTED CONTENT TABLE
-- Track reported reviews, questions, etc.
-- ============================================================================
CREATE TABLE reported_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- What was reported
  content_type TEXT NOT NULL CHECK (content_type IN ('review', 'question', 'answer')),
  content_id UUID NOT NULL,
  -- Report details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'false_info', 'harassment', 'other')),
  details TEXT,
  -- Resolution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reported_content FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage reports"
  ON reported_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Summer 2026 weeks helper view
CREATE OR REPLACE VIEW summer_2026_weeks AS
SELECT
  week_num,
  week_start,
  week_start + INTERVAL '4 days' AS week_end,
  'Week ' || week_num AS week_label,
  TO_CHAR(week_start, 'Mon DD') || ' - ' || TO_CHAR(week_start + INTERVAL '4 days', 'Mon DD') AS week_display
FROM (
  SELECT
    ROW_NUMBER() OVER () AS week_num,
    week_start
  FROM generate_series(
    '2026-06-08'::DATE,
    '2026-08-21'::DATE,
    '1 week'::INTERVAL
  ) AS week_start
) weeks;

-- Camp ratings summary view
CREATE OR REPLACE VIEW camp_ratings AS
SELECT
  camp_id,
  COUNT(*) AS review_count,
  ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating,
  ROUND(AVG(value_rating)::numeric, 1) AS avg_value,
  ROUND(AVG(staff_rating)::numeric, 1) AS avg_staff,
  ROUND(AVG(activities_rating)::numeric, 1) AS avg_activities,
  ROUND(AVG(safety_rating)::numeric, 1) AS avg_safety,
  COUNT(*) FILTER (WHERE would_recommend) AS recommend_count,
  ROUND((COUNT(*) FILTER (WHERE would_recommend)::numeric / COUNT(*)::numeric) * 100) AS recommend_percent
FROM reviews
WHERE status = 'published'
GROUP BY camp_id;

-- Schedule summary view
CREATE OR REPLACE VIEW schedule_summary AS
SELECT
  sc.user_id,
  c.id AS child_id,
  c.name AS child_name,
  c.color AS child_color,
  COUNT(sc.id) AS total_camps,
  SUM(sc.price) AS total_cost,
  MIN(sc.start_date) AS first_camp_date,
  MAX(sc.end_date) AS last_camp_date,
  COUNT(DISTINCT DATE_PART('week', sc.start_date)) AS weeks_covered
FROM children c
LEFT JOIN scheduled_camps sc ON sc.child_id = c.id AND sc.status != 'cancelled'
GROUP BY sc.user_id, c.id, c.name, c.color;

-- User activity summary (for admin dashboard)
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  p.id AS user_id,
  p.email,
  p.full_name,
  p.role,
  p.created_at AS joined_at,
  p.last_active_at,
  COUNT(DISTINCT c.id) AS children_count,
  COUNT(DISTINCT f.id) AS favorites_count,
  COUNT(DISTINCT sc.id) AS scheduled_camps_count,
  COUNT(DISTINCT r.id) AS reviews_count
FROM profiles p
LEFT JOIN children c ON c.user_id = p.id
LEFT JOIN favorites f ON f.user_id = p.id
LEFT JOIN scheduled_camps sc ON sc.user_id = p.id
LEFT JOIN reviews r ON r.user_id = p.id
GROUP BY p.id, p.email, p.full_name, p.role, p.created_at, p.last_active_at;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Conflict detection function
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_user_id UUID,
  p_child_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflicting_camp_id TEXT,
  conflict_start DATE,
  conflict_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.camp_id,
    sc.start_date,
    sc.end_date
  FROM scheduled_camps sc
  WHERE sc.user_id = p_user_id
    AND sc.child_id = p_child_id
    AND sc.status != 'cancelled'
    AND (p_exclude_id IS NULL OR sc.id != p_exclude_id)
    AND (
      (p_start_date BETWEEN sc.start_date AND sc.end_date)
      OR (p_end_date BETWEEN sc.start_date AND sc.end_date)
      OR (sc.start_date BETWEEN p_start_date AND p_end_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get camp recommendations based on user preferences
CREATE OR REPLACE FUNCTION get_camp_recommendations(
  p_user_id UUID,
  p_child_id UUID DEFAULT NULL
)
RETURNS TABLE (
  camp_id TEXT,
  match_score INTEGER
) AS $$
DECLARE
  v_categories TEXT[];
  v_child_age INTEGER;
  v_interests TEXT[];
BEGIN
  -- Get user preferred categories
  SELECT preferred_categories INTO v_categories
  FROM profiles WHERE id = p_user_id;

  -- If child specified, get their interests and age
  IF p_child_id IS NOT NULL THEN
    SELECT age_as_of_summer, interests INTO v_child_age, v_interests
    FROM children WHERE id = p_child_id AND user_id = p_user_id;
  END IF;

  -- Return camps with match scores
  -- Higher score = better match
  -- This is a placeholder - actual implementation would query the camps JSON/table
  RETURN QUERY
  SELECT
    f.camp_id,
    1 AS match_score
  FROM favorites f
  WHERE f.user_id = p_user_id
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification helper function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_camp_id TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, camp_id, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_camp_id, p_action_url)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_camp_sessions_updated_at
  BEFORE UPDATE ON camp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scheduled_camps_updated_at
  BEFORE UPDATE ON scheduled_camps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON camp_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON camp_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comparison_lists_updated_at
  BEFORE UPDATE ON comparison_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notify when question is answered
CREATE OR REPLACE FUNCTION notify_question_answered()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the question owner and create notification
  INSERT INTO notifications (user_id, type, title, message, question_id, action_url)
  SELECT
    q.user_id,
    'question_answered',
    'Your question was answered',
    'Someone answered your question about a camp',
    q.id,
    '/camps/' || q.camp_id || '#questions'
  FROM camp_questions q
  WHERE q.id = NEW.question_id
    AND q.user_id != NEW.user_id; -- Don't notify if user answered their own question

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_answer_created
  AFTER INSERT ON camp_answers
  FOR EACH ROW EXECUTE FUNCTION notify_question_answered();
