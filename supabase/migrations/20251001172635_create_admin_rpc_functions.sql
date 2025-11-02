/*
  # Admin RPC Functions

  1. Functions
    - `get_all_profiles` - Admins/dispatchers can view relevant profiles
    - `update_user_role` - Admins/dispatchers can update user roles
    - `get_org_profiles` - Get profiles for an organization
    - Fixed `set_user_admin` function

  2. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Check permissions within function logic
    - Prevent unauthorized access
*/

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function to check if current user is dispatcher
CREATE OR REPLACE FUNCTION is_dispatcher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
  );
$$;

-- Get current user's profile (needed for dashboard)
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Get all profiles (admin only)
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all profiles';
  END IF;
  
  RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
END;
$$;

-- Get profiles for dispatcher's organization
CREATE OR REPLACE FUNCTION get_org_profiles(org_id UUID)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
  user_role user_roles;
BEGIN
  SELECT organization_id, role INTO user_org_id, user_role
  FROM profiles WHERE id = auth.uid();
  
  -- Admins can view any org, dispatchers only their own
  IF user_role = 'admin' OR (user_role = 'dispatcher' AND user_org_id = org_id) THEN
    RETURN QUERY SELECT * FROM profiles WHERE organization_id = org_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to view this organization';
  END IF;
END;
$$;

-- Update user role (admin/dispatcher only)
CREATE OR REPLACE FUNCTION update_user_role(
  user_id UUID,
  new_role user_roles
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_roles;
  current_user_org UUID;
  target_user_org UUID;
BEGIN
  SELECT role, organization_id INTO current_user_role, current_user_org
  FROM profiles WHERE id = auth.uid();
  
  SELECT organization_id INTO target_user_org
  FROM profiles WHERE id = user_id;
  
  -- Admins can change anyone's role
  IF current_user_role = 'admin' THEN
    UPDATE profiles SET role = new_role WHERE id = user_id;
    RETURN;
  END IF;
  
  -- Dispatchers can only change roles in their org, and cannot create admins
  IF current_user_role = 'dispatcher' AND current_user_org = target_user_org AND new_role != 'admin' THEN
    UPDATE profiles SET role = new_role WHERE id = user_id;
    RETURN;
  END IF;
  
  RAISE EXCEPTION 'Not authorized to update this user';
END;
$$;

-- Fixed set_user_admin function
CREATE OR REPLACE FUNCTION set_user_admin(user_email TEXT, org_name TEXT DEFAULT 'PTT System')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  org_id UUID;
BEGIN
  -- Get the user from auth.users
  SELECT * INTO user_record FROM auth.users WHERE email = user_email LIMIT 1;
  
  IF user_record.id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Get or create organization
  SELECT id INTO org_id FROM organizations WHERE name = org_name;
  
  IF org_id IS NULL THEN
    INSERT INTO organizations (name) VALUES (org_name) RETURNING id INTO org_id;
  END IF;
  
  -- Update or insert profile with admin role
  INSERT INTO profiles (id, email, full_name, role, organization_id)
  VALUES (
    user_record.id,
    user_record.email,
    COALESCE(user_record.raw_user_meta_data->>'full_name', 'Administrator'),
    'admin',
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    organization_id = org_id,
    updated_at = now();
    
  RAISE NOTICE 'User % is now an admin', user_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_dispatcher() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_profiles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, user_roles) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_admin(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION set_user_admin(TEXT, TEXT) TO postgres;
