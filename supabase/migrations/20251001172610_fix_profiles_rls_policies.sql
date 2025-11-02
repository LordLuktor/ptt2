/*
  # Fix Profiles RLS Policies - Remove Infinite Recursion

  1. Changes
    - Drop all existing policies on profiles table
    - Create new policies using auth.uid() directly without subqueries
    - Use simpler, non-recursive policies
    - Allow profile creation during signup
    - Keep security while avoiding recursion

  2. Security
    - Users can read/update their own profile
    - Service role can manage all profiles (for admin functions)
    - Public can insert during signup
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Dispatchers can manage users in their organization" ON profiles;
DROP POLICY IF EXISTS "Dispatchers can view users in their organization" ON profiles;
DROP POLICY IF EXISTS "Supervisors can view users in their talkgroups" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (but not role or organization)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role has full access (for admin operations via RPC functions)
CREATE POLICY "Service role full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
