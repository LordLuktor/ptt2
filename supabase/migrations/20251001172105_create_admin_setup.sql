/*
  # Admin User Setup

  1. Function
    - `create_admin_user` - Helper function to create admin users
  
  2. Initial Admin Setup
    - Creates default organization 'PTT System'
    - Note: You must create the auth user first, then use this to set admin role
*/

-- Create a function to set a user as admin
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
    organization_id = org_id;
END;
$$;

-- Create default PTT System organization
INSERT INTO organizations (name) VALUES ('PTT System') ON CONFLICT DO NOTHING;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_admin(TEXT, TEXT) TO authenticated;
