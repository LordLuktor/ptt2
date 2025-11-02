-- Create Admin User Script
-- Run this in your Supabase SQL Editor

-- Step 1: Create the admin organization (if not exists)
INSERT INTO organizations (name)
VALUES ('System Admin')
ON CONFLICT DO NOTHING;

-- Step 2: You need to create the auth user first via Supabase dashboard or auth.signUp
-- Then manually insert the profile with admin role:

-- REPLACE 'YOUR-USER-ID-HERE' with the actual UUID from auth.users after creating the user
-- REPLACE 'YOUR-ORG-ID-HERE' with the organization ID from step 1

INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  organization_id
) VALUES (
  'YOUR-USER-ID-HERE',
  'admin@ptt.steinmetz.ltd',
  'System Administrator',
  'admin',
  'YOUR-ORG-ID-HERE'
);

-- Or, if you want to update an existing user to admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@ptt.steinmetz.ltd';
