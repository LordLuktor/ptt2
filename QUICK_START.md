# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start the App

```bash
npm install
npm run dev
```

### Step 2: Create Your Admin Account

1. Open the app (scan QR code or press `w` for web)
2. Click **"Sign up"**
3. Enter:
   - **Email**: `admin@ptt.steinmetz.ltd` (or your preferred email)
   - **Password**: Your secure password
   - **Full Name**: System Administrator
4. Click **Sign Up**

### Step 3: Activate Admin Role

Open Supabase SQL Editor and run:

```sql
SELECT set_user_admin('admin@ptt.steinmetz.ltd');
```

### Step 4: Access Admin Dashboard

1. In the app, go to **Settings** tab
2. Click **"Open Dashboard"**
3. You now have full admin access!

---

## 📋 What You Can Do Now

### As Admin, You Can:

✅ Create organizations for different companies
✅ Create dispatcher accounts for each organization
✅ View all users across all organizations
✅ Change any user's role
✅ Monitor system-wide statistics

### Next Steps:

1. **Create an Organization**
   - Dashboard → Organizations → Add Organization
   - Example: "Acme Security", "City Services", etc.

2. **Create a Dispatcher**
   - Have them sign up normally
   - Dashboard → All Users → Find their account → Set role to "dispatcher"
   - They can now manage their organization

3. **Dispatcher Creates Users**
   - Dispatcher logs in → Opens Dashboard
   - Creates talkgroups and channels
   - Users sign up and get assigned by dispatcher

---

## 🎯 Testing the System

### Test as Different Roles

1. **Create a test organization**: "Test Org"
2. **Create test users**:
   - User: `user@test.com` (role: user)
   - Supervisor: `supervisor@test.com` (role: supervisor)
   - Dispatcher: `dispatcher@test.com` (role: dispatcher)

3. **Set up a talkgroup**:
   - Login as dispatcher
   - Create talkgroup: "Operations"
   - Add channels: "Channel 1", "Channel 2", etc.

4. **Assign users**:
   - Assign user to "Operations" talkgroup
   - Assign supervisor to "Operations" talkgroup

5. **Test PTT**:
   - Login as user → See PTT interface
   - Login as supervisor → See multi-PTT interface
   - Press and hold PTT button to transmit

---

## 🔑 Default Admin Credentials

After setup:

- **URL**: `http://localhost:8081` (dev) or `https://ptt.steinmetz.ltd` (production)
- **Email**: `admin@ptt.steinmetz.ltd`
- **Password**: Whatever you set during sign-up
- **Role**: Admin
- **Organization**: PTT System

---

## 📱 Platform Support

- ✅ **iOS**: Full support (requires iOS 13+)
- ✅ **Android**: Full support (requires Android 6.0+)
- ✅ **Web**: Dashboard access (Chrome, Firefox, Safari, Edge)

---

## 🆘 Need Help?

See [README.md](./README.md) for full documentation
See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for admin details

**Common Issues:**

- **Can't see dashboard button?** Make sure you're admin/dispatcher role
- **Location not working?** Grant location permissions in device settings
- **PTT not working?** User must be assigned to a talkgroup first

---

**That's it! You're ready to go! 🎉**
