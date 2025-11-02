# Admin User Setup Guide

## Creating the First Admin User

### Step 1: Sign Up Via the App

1. Open the PTT app (mobile or web)
2. Go to Sign Up screen
3. Create an account with:
   - **Email**: `admin@ptt.steinmetz.ltd` (or your preferred email)
   - **Password**: Choose a strong password
   - **Full Name**: System Administrator

### Step 2: Set Admin Role in Database

After signing up, open your **Supabase SQL Editor** and run:

```sql
SELECT set_user_admin('admin@ptt.steinmetz.ltd');
```

You should see: `User admin@ptt.steinmetz.ltd is now an admin`

That's it! The user is now an admin. You can now sign in and access the dashboard.

### Alternative: Set Admin Role for Any Existing User

To promote any existing user to admin:

```sql
SELECT set_user_admin('user@example.com');
```

### Default Admin Credentials (After Setup)

- **Email**: `admin@ptt.steinmetz.ltd`
- **Password**: Whatever you set during sign-up
- **Organization**: PTT System (created automatically)

## Accessing the Admin Dashboard

1. Sign in to the app
2. Navigate to **Settings** tab
3. Click **Open Dashboard** button
4. You'll see the Admin Dashboard with:
   - Organization management
   - User management (all users across all organizations)
   - System statistics
   - Role management

## Admin Capabilities

As an admin, you can:

- ✅ Create and delete organizations
- ✅ View all users across all organizations
- ✅ Change user roles (user, supervisor, dispatcher, admin)
- ✅ Delete users
- ✅ View system-wide statistics
- ✅ Full access to all features

## Creating Additional Admins

To create more admin users:

1. Have them sign up normally through the app
2. Run: `SELECT set_user_admin('their-email@example.com');`

## Dispatcher vs Admin

- **Dispatcher**: Organization-level admin, manages users/groups within their organization
- **Admin**: System-level admin, manages all organizations and can access everything

## Security Notes

- The admin role has full system access
- Keep admin credentials secure
- Regularly audit admin users
- Consider using strong authentication methods
