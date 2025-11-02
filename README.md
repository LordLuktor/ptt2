# PTT System - Push-to-Talk Communication Platform

A full-featured Push-to-Talk (PTT) communication system with mobile apps for iOS/Android and web dashboards for management.

## 🎯 Features

### Mobile App (Users & Supervisors)

#### User Features
- **2-Way Radio Interface** with orange PTT button and red ALERT button
- Push-to-talk functionality (press and hold to transmit)
- Emergency alert button
- Single talkgroup assignment (up to 5 channels)
- Real-time transmission indicators
- GPS location tracking
- Channel switching

#### Supervisor Features
- **Multiple PTT Buttons** (one per group)
- Manage up to 3 talkgroups with 5 channels each
- Multi-group monitoring
- Individual PTT controls for each channel
- Real-time transmission status for all channels
- GPS location tracking

### Web Dashboard (Dispatchers & Admins)

#### Dispatcher Features
- **User Management**: Add, edit, and assign users within organization
- **Supervisor Management**: Promote users to supervisors
- **Talkgroup Management**: Create and manage talkgroups
- **Channel Management**: Create up to 5 channels per talkgroup
- **Location Tracking**: View user locations on map (web only)
- Organization-scoped access

#### Admin Features
- **Organization Management**: Create and delete organizations
- **System-Wide User Management**: Manage all users across all organizations
- **Role Assignment**: Change user roles (user, supervisor, dispatcher, admin)
- **System Statistics**: View platform-wide metrics
- Full platform access

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React Native + Expo (iOS, Android, Web)
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Authentication**: Supabase Auth (email/password)
- **Location**: Expo Location API
- **Real-time**: Supabase Realtime (WebSocket subscriptions)

### Key Components

```
app/
├── (auth)/           # Authentication screens
├── (tabs)/           # Main app navigation
├── dashboard/        # Web dashboards
components/
├── UserRadio.tsx              # User PTT interface
├── SupervisorRadio.tsx        # Supervisor multi-PTT interface
├── dashboard/
    ├── DispatcherDashboard.tsx
    └── AdminDashboard.tsx
services/
├── locationService.ts  # GPS tracking
└── pttService.ts      # PTT session management
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ptt-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run database migrations**

   All migrations are already applied via the Supabase MCP tool.

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Creating the Admin User

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for detailed instructions.

**Quick Start:**

1. Sign up through the app with email: `admin@ptt.steinmetz.ltd`
2. Run in Supabase SQL Editor:
   ```sql
   SELECT set_user_admin('admin@ptt.steinmetz.ltd');
   ```

## 👥 User Roles

### User
- Limited to 1 talkgroup
- Access to up to 5 channels in their group
- Can transmit on PTT
- Can send emergency alerts
- GPS location tracked

### Supervisor
- Access to up to 3 talkgroups
- 5 channels per talkgroup
- Individual PTT button for each channel
- Can monitor multiple channels simultaneously
- GPS location tracked
- Can view locations of assigned users

### Dispatcher
- Organization administrator
- Manage users and supervisors within organization
- Create and manage talkgroups and channels
- View user locations on map
- Cannot transmit (web dashboard only)

### Admin
- System administrator
- Manage all organizations
- Full access to all users and data
- Change user roles system-wide
- Cannot transmit (web dashboard only)

## 📱 Using the Mobile App

### For Users

1. **Sign In**: Use credentials provided by your dispatcher
2. **Select Channel**: Tap channel buttons to switch
3. **Push to Talk**: Press and hold orange PTT button to transmit
4. **Emergency Alert**: Tap red ALERT button (requires confirmation)
5. **Monitor**: Green "Receiving transmission" indicator shows when others are talking

### For Supervisors

1. **Sign In**: Use supervisor credentials
2. **View Groups**: All assigned talkgroups are displayed
3. **Transmit**: Each channel has its own PTT button
4. **Monitor**: RX badge shows when receiving on a channel
5. **Multi-Group**: Simultaneously monitor multiple groups

## 💻 Using the Web Dashboard

### Accessing the Dashboard

1. Sign in to the mobile app
2. Navigate to **Settings** tab
3. Click **Open Dashboard** button
4. Dashboard opens in the app (best viewed in web browser)

### Dispatcher Dashboard

#### Users Tab
- View all users and supervisors in your organization
- Assign users to talkgroups
- Promote users to supervisors
- View user assignments

#### Groups Tab
- Create new talkgroups
- Add channels to talkgroups (max 5 per group)
- Delete talkgroups and channels
- Manage group structure

#### Map Tab
- View real-time locations of users
- Track user movements
- Monitor user status

### Admin Dashboard

#### Organizations Tab
- Create new organizations
- View organization statistics
- Delete organizations (warning: deletes all data)
- Monitor organization health

#### All Users Tab
- View all users across all organizations
- Change user roles with one click
- Delete users
- System-wide user management

#### System Tab
- View platform statistics
- System information
- Overall health metrics

## 🗄️ Database Schema

### Core Tables

- **organizations**: Organization/company management
- **profiles**: User profiles with roles
- **talkgroups**: Radio talkgroups
- **channels**: Communication channels within talkgroups
- **user_talkgroup_assignments**: User-to-talkgroup mappings
- **supervisor_talkgroup_assignments**: Supervisor-to-talkgroup mappings
- **ptt_sessions**: PTT transmission sessions
- **location_tracking**: GPS location history

### Security

All tables use Row Level Security (RLS):
- Users can only see their own data
- Supervisors can see their assigned users
- Dispatchers can see their organization
- Admins can see everything

## 🔒 Security Features

- **Authentication**: Supabase Auth with email/password
- **Row Level Security**: Database-level access control
- **Role-Based Access**: Enforced at database and application level
- **Secure Sessions**: Token-based authentication
- **Location Privacy**: Only supervisors/dispatchers can view user locations

## 🌐 Deployment

### Mobile App Deployment

#### iOS
```bash
eas build --platform ios
eas submit --platform ios
```

#### Android
```bash
eas build --platform android
eas submit --platform android
```

### Web Dashboard Deployment

The web version is built automatically when deploying to Expo.

For custom deployment:
```bash
npm run build:web
```

Deploy the `dist/` folder to your web server.

### Docker Deployment

For deployment with Docker Swarm + Traefik:

1. **Build the web version**
   ```bash
   npm run build:web
   ```

2. **Create Dockerfile** (if needed for custom server)

3. **Configure Traefik labels** for SSL and routing

4. **Deploy to Docker Swarm** with URL `ptt.steinmetz.ltd`

## 📊 Monitoring & Analytics

### Real-Time Metrics Available

- Active PTT sessions
- User locations
- Channel activity
- Organization statistics
- User counts by role

### Location Tracking

- Updates every 30 seconds by default
- Configurable update interval
- Stores location history
- Displays on web dashboard map

## 🐛 Troubleshooting

### App won't load
- Check `.env` file has correct Supabase credentials
- Verify database migrations are applied
- Clear Expo cache: `expo start -c`

### Location not tracking
- Ensure location permissions granted
- Check device settings allow background location
- iOS: Enable "Always" location permission
- Android: Grant "Allow all the time" permission

### Dashboard not accessible
- Verify user role is dispatcher or admin
- Check "Open Dashboard" button in Settings
- For best experience, use desktop web browser

### PTT not working
- Check user is assigned to a talkgroup
- Verify channel exists
- Check network connectivity
- Review Supabase real-time logs

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing guidelines if applicable]

## 📧 Support

For support, contact your system administrator or dispatcher.

---

Built with ❤️ using React Native, Expo, and Supabase
