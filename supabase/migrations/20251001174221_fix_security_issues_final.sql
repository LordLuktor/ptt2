/*
  # Fix Security Issues - Indexes and Performance Optimizations

  1. Add Missing Indexes on Foreign Keys
  2. Fix RLS Performance Issues (replace auth.uid() with select)
  3. Remove Unused Indexes
  4. Fix Function Search Paths
  5. Consolidate policies to reduce warnings
*/

-- =====================================================
-- PART 1: ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_ptt_session_listeners_session_id 
  ON ptt_session_listeners(session_id);

CREATE INDEX IF NOT EXISTS idx_ptt_session_listeners_user_id 
  ON ptt_session_listeners(user_id);

CREATE INDEX IF NOT EXISTS idx_ptt_sessions_user_id 
  ON ptt_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_talkgroup_assignments_talkgroup_id 
  ON supervisor_talkgroup_assignments(talkgroup_id);

CREATE INDEX IF NOT EXISTS idx_user_talkgroup_assignments_talkgroup_id 
  ON user_talkgroup_assignments(talkgroup_id);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ptt_sessions_channel_time 
  ON ptt_sessions(channel_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_tracking_user_latest 
  ON location_tracking(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor 
  ON supervisor_talkgroup_assignments(supervisor_id, talkgroup_id);

CREATE INDEX IF NOT EXISTS idx_user_assignments_user 
  ON user_talkgroup_assignments(user_id, talkgroup_id);

-- =====================================================
-- PART 2: REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_location_tracking_user_time;
DROP INDEX IF EXISTS idx_ptt_sessions_channel;

-- =====================================================
-- PART 3: FIX RLS POLICIES - PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- PART 4: FIX RLS POLICIES - TALKGROUPS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all talkgroups" ON talkgroups;
DROP POLICY IF EXISTS "Dispatchers can manage talkgroups in their organization" ON talkgroups;
DROP POLICY IF EXISTS "Users can view assigned talkgroups" ON talkgroups;

CREATE POLICY "Users can view assigned talkgroups"
  ON talkgroups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_talkgroup_assignments
      WHERE user_talkgroup_assignments.talkgroup_id = talkgroups.id
      AND user_talkgroup_assignments.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM supervisor_talkgroup_assignments
      WHERE supervisor_talkgroup_assignments.talkgroup_id = talkgroups.id
      AND supervisor_talkgroup_assignments.supervisor_id = (select auth.uid())
    )
  );

CREATE POLICY "Dispatchers can manage talkgroups"
  ON talkgroups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('dispatcher', 'admin')
      AND (profiles.role = 'admin' OR profiles.organization_id = talkgroups.organization_id)
    )
  );

-- =====================================================
-- PART 5: FIX RLS POLICIES - CHANNELS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all channels" ON channels;
DROP POLICY IF EXISTS "Dispatchers can manage channels in their organization" ON channels;
DROP POLICY IF EXISTS "Users can view channels in assigned talkgroups" ON channels;

CREATE POLICY "Users can view channels in assigned talkgroups"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_talkgroup_assignments uta
      WHERE uta.talkgroup_id = channels.talkgroup_id
      AND uta.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM supervisor_talkgroup_assignments sta
      WHERE sta.talkgroup_id = channels.talkgroup_id
      AND sta.supervisor_id = (select auth.uid())
    )
  );

CREATE POLICY "Dispatchers can manage channels"
  ON channels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN talkgroups tg ON tg.id = channels.talkgroup_id
      WHERE p.id = (select auth.uid())
      AND p.role IN ('dispatcher', 'admin')
      AND (p.role = 'admin' OR p.organization_id = tg.organization_id)
    )
  );

-- =====================================================
-- PART 6: FIX RLS POLICIES - USER_TALKGROUP_ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own assignments" ON user_talkgroup_assignments;
DROP POLICY IF EXISTS "Supervisors can view assignments in their talkgroups" ON user_talkgroup_assignments;
DROP POLICY IF EXISTS "Dispatchers can manage assignments in their organization" ON user_talkgroup_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON user_talkgroup_assignments;

CREATE POLICY "Users can view own assignments"
  ON user_talkgroup_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Supervisors can view assignments in their talkgroups"
  ON user_talkgroup_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_talkgroup_assignments
      WHERE supervisor_talkgroup_assignments.talkgroup_id = user_talkgroup_assignments.talkgroup_id
      AND supervisor_talkgroup_assignments.supervisor_id = (select auth.uid())
    )
  );

CREATE POLICY "Dispatchers can manage assignments"
  ON user_talkgroup_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN talkgroups tg ON tg.id = user_talkgroup_assignments.talkgroup_id
      WHERE p.id = (select auth.uid())
      AND p.role IN ('dispatcher', 'admin')
      AND (p.role = 'admin' OR p.organization_id = tg.organization_id)
    )
  );

-- =====================================================
-- PART 7: FIX RLS POLICIES - SUPERVISOR_TALKGROUP_ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Supervisors can view own assignments" ON supervisor_talkgroup_assignments;
DROP POLICY IF EXISTS "Dispatchers can manage supervisor assignments in their organiza" ON supervisor_talkgroup_assignments;
DROP POLICY IF EXISTS "Admins can manage all supervisor assignments" ON supervisor_talkgroup_assignments;

CREATE POLICY "Supervisors can view own assignments"
  ON supervisor_talkgroup_assignments
  FOR SELECT
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

CREATE POLICY "Dispatchers can manage supervisor assignments"
  ON supervisor_talkgroup_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN talkgroups tg ON tg.id = supervisor_talkgroup_assignments.talkgroup_id
      WHERE p.id = (select auth.uid())
      AND p.role IN ('dispatcher', 'admin')
      AND (p.role = 'admin' OR p.organization_id = tg.organization_id)
    )
  );

-- =====================================================
-- PART 8: FIX RLS POLICIES - LOCATION_TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Users can view own location" ON location_tracking;
DROP POLICY IF EXISTS "Users can insert own location" ON location_tracking;
DROP POLICY IF EXISTS "Supervisors can view locations of users in their talkgroups" ON location_tracking;
DROP POLICY IF EXISTS "Dispatchers can view locations in their organization" ON location_tracking;
DROP POLICY IF EXISTS "Admins can view all locations" ON location_tracking;

CREATE POLICY "Users can manage own location"
  ON location_tracking
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Supervisors and dispatchers can view locations"
  ON location_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_talkgroup_assignments sta
      JOIN user_talkgroup_assignments uta ON uta.talkgroup_id = sta.talkgroup_id
      WHERE sta.supervisor_id = (select auth.uid())
      AND uta.user_id = location_tracking.user_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.id = location_tracking.user_id
      WHERE p1.id = (select auth.uid())
      AND p1.role IN ('dispatcher', 'admin')
      AND (p1.role = 'admin' OR p1.organization_id = p2.organization_id)
    )
  );

-- =====================================================
-- PART 9: FIX RLS POLICIES - PTT_SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view PTT sessions in their channels" ON ptt_sessions;
DROP POLICY IF EXISTS "Users can create PTT sessions in their channels" ON ptt_sessions;
DROP POLICY IF EXISTS "Supervisors can create PTT sessions in their channels" ON ptt_sessions;
DROP POLICY IF EXISTS "Users can update own PTT sessions" ON ptt_sessions;

CREATE POLICY "Users can view PTT sessions in their channels"
  ON ptt_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      LEFT JOIN user_talkgroup_assignments uta ON uta.talkgroup_id = c.talkgroup_id AND uta.user_id = (select auth.uid())
      LEFT JOIN supervisor_talkgroup_assignments sta ON sta.talkgroup_id = c.talkgroup_id AND sta.supervisor_id = (select auth.uid())
      WHERE c.id = ptt_sessions.channel_id
      AND (uta.user_id IS NOT NULL OR sta.supervisor_id IS NOT NULL)
    )
  );

CREATE POLICY "Users can create PTT sessions"
  ON ptt_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM channels c
      LEFT JOIN user_talkgroup_assignments uta ON uta.talkgroup_id = c.talkgroup_id AND uta.user_id = (select auth.uid())
      LEFT JOIN supervisor_talkgroup_assignments sta ON sta.talkgroup_id = c.talkgroup_id AND sta.supervisor_id = (select auth.uid())
      WHERE c.id = ptt_sessions.channel_id
      AND (uta.user_id IS NOT NULL OR sta.supervisor_id IS NOT NULL)
    )
  );

CREATE POLICY "Users can update own PTT sessions"
  ON ptt_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 10: FIX RLS POLICIES - PTT_SESSION_LISTENERS
-- =====================================================

DROP POLICY IF EXISTS "Users can view listeners in their sessions" ON ptt_session_listeners;
DROP POLICY IF EXISTS "Users can join as listeners in their channels" ON ptt_session_listeners;
DROP POLICY IF EXISTS "Supervisors can join as listeners in their channels" ON ptt_session_listeners;

CREATE POLICY "Users can view and manage listeners"
  ON ptt_session_listeners
  FOR ALL
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM ptt_sessions ps
      JOIN channels c ON c.id = ps.channel_id
      LEFT JOIN user_talkgroup_assignments uta ON uta.talkgroup_id = c.talkgroup_id AND uta.user_id = (select auth.uid())
      LEFT JOIN supervisor_talkgroup_assignments sta ON sta.talkgroup_id = c.talkgroup_id AND sta.supervisor_id = (select auth.uid())
      WHERE ps.id = ptt_session_listeners.session_id
      AND (uta.user_id IS NOT NULL OR sta.supervisor_id IS NOT NULL)
    )
  )
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 11: FIX FUNCTION SEARCH PATHS
-- =====================================================

ALTER FUNCTION is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION is_dispatcher() SET search_path = public, pg_temp;
ALTER FUNCTION get_current_profile() SET search_path = public, pg_temp;
ALTER FUNCTION get_all_profiles() SET search_path = public, pg_temp;
ALTER FUNCTION get_org_profiles(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION update_user_role(UUID, user_roles) SET search_path = public, pg_temp;
ALTER FUNCTION set_user_admin(TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION check_user_talkgroup_limit() SET search_path = public, pg_temp;
ALTER FUNCTION check_supervisor_talkgroup_limit() SET search_path = public, pg_temp;
ALTER FUNCTION check_talkgroup_channel_limit() SET search_path = public, pg_temp;
