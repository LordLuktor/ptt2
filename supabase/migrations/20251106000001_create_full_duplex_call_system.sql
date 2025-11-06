/*
  # Full Duplex Call System Migration

  ## Overview
  Transforms the PTT system from half-duplex (push-to-talk) to full-duplex (phone call style)
  communication using WebRTC technology.

  ## 1. New Tables

  ### calls
  - `id` (uuid, primary key) - Unique call identifier
  - `caller_id` (uuid, foreign key to profiles) - User initiating the call
  - `callee_id` (uuid, foreign key to profiles) - User receiving the call
  - `channel_id` (uuid, foreign key to channels) - Optional: channel context
  - `status` (enum) - Call status: 'ringing', 'active', 'ended', 'missed', 'rejected'
  - `started_at` (timestamptz) - When call was initiated
  - `answered_at` (timestamptz) - When call was answered
  - `ended_at` (timestamptz) - When call ended
  - `duration_seconds` (integer) - Call duration
  - `end_reason` (text) - Why call ended: 'completed', 'rejected', 'timeout', 'error'
  - `created_at` (timestamptz) - Record creation time

  ### webrtc_signals
  - `id` (uuid, primary key) - Signal identifier
  - `call_id` (uuid, foreign key to calls) - Associated call
  - `from_user_id` (uuid, foreign key to profiles) - User sending signal
  - `to_user_id` (uuid, foreign key to profiles) - User receiving signal
  - `signal_type` (text) - Type: 'offer', 'answer', 'ice-candidate'
  - `signal_data` (jsonb) - WebRTC signal payload
  - `created_at` (timestamptz) - When signal was created

  ### user_presence
  - `user_id` (uuid, primary key, foreign key to profiles) - User ID
  - `status` (text) - Status: 'online', 'busy', 'offline', 'in_call'
  - `last_seen` (timestamptz) - Last activity timestamp
  - `current_call_id` (uuid, foreign key to calls) - Active call reference
  - `updated_at` (timestamptz) - Last status update

  ## 2. Enums
  - `call_status` - Possible call states

  ## 3. Security
  - Enable RLS on all tables
  - Users can view their own calls
  - Users can view presence of users in their talkgroups
  - Dispatchers and admins have broader access
  - All policies enforce authentication and ownership

  ## 4. Indexes
  - Optimized for call history queries
  - Fast presence lookups
  - Efficient signal retrieval for WebRTC

  ## 5. Important Notes
  - WebRTC connections are peer-to-peer; server only handles signaling
  - Presence must be updated regularly by clients
  - Old signals should be cleaned up periodically
  - This migration preserves all existing PTT functionality
*/

-- =====================================================
-- PART 1: CREATE ENUMS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
    CREATE TYPE call_status AS ENUM ('ringing', 'active', 'ended', 'missed', 'rejected');
  END IF;
END $$;

-- =====================================================
-- PART 2: CREATE CALLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  status call_status NOT NULL DEFAULT 'ringing',
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (caller_id != callee_id)
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: CREATE WEBRTC_SIGNALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS webrtc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: CREATE USER_PRESENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline', 'in_call')),
  last_seen timestamptz NOT NULL DEFAULT now(),
  current_call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 5: CREATE INDEXES
-- =====================================================

-- Calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_callee_id ON calls(callee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_channel_id ON calls(channel_id, started_at DESC);

-- WebRTC signals indexes
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_call_id ON webrtc_signals(call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id, created_at DESC);

-- User presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status, last_seen DESC);

-- =====================================================
-- PART 6: RLS POLICIES - CALLS TABLE
-- =====================================================

-- Users can view their own calls (as caller or callee)
CREATE POLICY "Users can view own calls"
  ON calls
  FOR SELECT
  TO authenticated
  USING (
    caller_id = (SELECT auth.uid())
    OR callee_id = (SELECT auth.uid())
  );

-- Users can create calls they initiate
CREATE POLICY "Users can create calls"
  ON calls
  FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = (SELECT auth.uid()));

-- Users can update calls they're part of
CREATE POLICY "Users can update own calls"
  ON calls
  FOR UPDATE
  TO authenticated
  USING (
    caller_id = (SELECT auth.uid())
    OR callee_id = (SELECT auth.uid())
  )
  WITH CHECK (
    caller_id = (SELECT auth.uid())
    OR callee_id = (SELECT auth.uid())
  );

-- Dispatchers and admins can view calls in their organization
CREATE POLICY "Dispatchers can view org calls"
  ON calls
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('dispatcher', 'admin')
      AND (
        p.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM profiles p2
          WHERE p2.id IN (calls.caller_id, calls.callee_id)
          AND p2.organization_id = p.organization_id
        )
      )
    )
  );

-- =====================================================
-- PART 7: RLS POLICIES - WEBRTC_SIGNALS TABLE
-- =====================================================

-- Users can view signals sent to them
CREATE POLICY "Users can view signals sent to them"
  ON webrtc_signals
  FOR SELECT
  TO authenticated
  USING (to_user_id = (SELECT auth.uid()));

-- Users can create signals they send
CREATE POLICY "Users can create signals"
  ON webrtc_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (SELECT auth.uid()));

-- Users can view signals they sent
CREATE POLICY "Users can view sent signals"
  ON webrtc_signals
  FOR SELECT
  TO authenticated
  USING (from_user_id = (SELECT auth.uid()));

-- =====================================================
-- PART 8: RLS POLICIES - USER_PRESENCE TABLE
-- =====================================================

-- Users can view their own presence
CREATE POLICY "Users can view own presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can view presence of users in their talkgroups
CREATE POLICY "Users can view talkgroup member presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_talkgroup_assignments uta1
      JOIN user_talkgroup_assignments uta2 ON uta2.talkgroup_id = uta1.talkgroup_id
      WHERE uta1.user_id = (SELECT auth.uid())
      AND uta2.user_id = user_presence.user_id
    )
    OR EXISTS (
      SELECT 1 FROM supervisor_talkgroup_assignments sta
      JOIN user_talkgroup_assignments uta ON uta.talkgroup_id = sta.talkgroup_id
      WHERE sta.supervisor_id = (SELECT auth.uid())
      AND uta.user_id = user_presence.user_id
    )
  );

-- Dispatchers can view presence in their organization
CREATE POLICY "Dispatchers can view org presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles p2 ON p2.id = user_presence.user_id
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('dispatcher', 'admin')
      AND (p.role = 'admin' OR p.organization_id = p2.organization_id)
    )
  );

-- =====================================================
-- PART 9: HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger for presence updates
DROP TRIGGER IF EXISTS update_presence_timestamp_trigger ON user_presence;
CREATE TRIGGER update_presence_timestamp_trigger
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- Function to automatically create presence record on user creation
CREATE OR REPLACE FUNCTION create_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_seen, updated_at)
  VALUES (NEW.id, 'offline', now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger for new users
DROP TRIGGER IF EXISTS create_user_presence_trigger ON profiles;
CREATE TRIGGER create_user_presence_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_presence();

-- Function to clean up old signals (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM webrtc_signals
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
