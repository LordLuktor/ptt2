# Full Duplex Call System - Deployment Guide

## Overview

The PTT system has been transformed into a **full-duplex phone call system** using WebRTC. This guide covers deploying the server-side components.

## What Was Built

### 1. Database Schema (Migration File)
**Location**: `supabase/migrations/20251106000001_create_full_duplex_call_system.sql`

New tables:
- `calls` - Call records with status tracking
- `webrtc_signals` - WebRTC signaling data
- `user_presence` - User availability tracking

### 2. Edge Functions (Server-Side APIs)

Three Supabase Edge Functions:

#### a) `webrtc-signal`
**Location**: `supabase/functions/webrtc-signal/index.ts`

Handles WebRTC signaling for establishing peer connections:
- POST: Send WebRTC signals (offer, answer, ICE candidates)
- GET: Retrieve pending signals

#### b) `call-management`
**Location**: `supabase/functions/call-management/index.ts`

Manages call lifecycle:
- POST `/initiate` - Start a new call
- POST `/update` - Accept, reject, or end calls
- GET `/active` - Get current active call
- GET `/history` - Get call history

#### c) `presence`
**Location**: `supabase/functions/presence/index.ts`

Tracks user availability:
- POST `/update` - Update presence status
- POST `/heartbeat` - Keep-alive
- GET `/presence` - Get user presence
- GET `/talkgroup` - Get talkgroup presence
- GET `/online` - Get online users

### 3. Web Build
**Location**: `dist/`

Production-ready web application built with Expo.

### 4. Documentation
**Location**: `FULL_DUPLEX_API.md`

Complete API documentation with:
- Architecture overview
- Database schema
- API endpoints
- Client implementation guide
- WebRTC setup examples
- Security details

## Deployment Steps

### Step 1: Apply Database Migration

You need to run the SQL migration in your Supabase database:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/20251106000001_create_full_duplex_call_system.sql`
5. Paste into the SQL Editor
6. Click **Run**

This creates the necessary tables, indexes, RLS policies, and functions.

### Step 2: Deploy Edge Functions

Deploy each Edge Function to Supabase:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy webrtc-signal
supabase functions deploy call-management
supabase functions deploy presence
```

#### Option B: Manual Deployment

If you don't have CLI access:

1. Go to Supabase Dashboard → **Edge Functions**
2. Click **Create a new function**
3. For each function:
   - Name: `webrtc-signal`, `call-management`, or `presence`
   - Copy the contents of `supabase/functions/[function-name]/index.ts`
   - Paste into the editor
   - Deploy

### Step 3: Verify Edge Functions

Test each function:

```bash
# Test presence endpoint
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/presence/heartbeat \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Should return: {"success": true, "presence": {...}}
```

### Step 4: Deploy Web Application

#### Option A: Static Hosting (Netlify, Vercel, GitHub Pages)

The `dist/` folder contains a complete static website:

```bash
# Netlify
netlify deploy --prod --dir=dist

# Vercel
vercel --prod dist

# GitHub Pages
# Push dist/ folder to gh-pages branch
```

#### Option B: Docker Deployment

Use the existing Dockerfile and docker-compose.yml:

```bash
# Build and deploy
docker-compose up -d

# Or with Docker Swarm
docker stack deploy -c docker-compose.yml ptt-system
```

The app will be available at `https://ptt.steinmetz.ltd` (or your configured domain).

#### Option C: Manual Web Server

Copy the `dist/` folder to any web server:

```bash
# Nginx
cp -r dist/* /var/www/html/

# Apache
cp -r dist/* /var/www/html/

# Any HTTP server
cd dist && python3 -m http.server 8080
```

### Step 5: Configure Environment Variables

Ensure these environment variables are set:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

For Edge Functions, these are automatically available:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Testing the System

### 1. Test Database

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('calls', 'webrtc_signals', 'user_presence');

-- Should return 3 rows
```

### 2. Test Edge Functions

```bash
# Get your auth token first
# Login to the app, then check browser DevTools → Application → Storage

# Test call initiation
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/call-management/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"calleeId": "TARGET_USER_ID"}'
```

### 3. Test Web Application

1. Open the web app in a browser
2. Sign in with test accounts
3. Navigate to the dashboard
4. Verify authentication works
5. Check browser console for errors

### 4. Test Full Duplex Calls (Coming Soon)

Once you build the mobile app:
1. Open app on two devices
2. Ensure both users are in the same talkgroup
3. User A initiates call to User B
4. User B accepts call
5. Both should hear each other simultaneously (full duplex)

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Web Application                       │
│                  (React + Expo Web)                      │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
             │ Auth                     │ API Calls
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Platform                      │
│  ┌─────────────┬──────────────┬─────────────────────┐  │
│  │  Auth       │  PostgreSQL  │  Edge Functions     │  │
│  │  (JWT)      │  (Database)  │  (Deno Runtime)     │  │
│  │             │              │                     │  │
│  │             │  - calls     │  - webrtc-signal    │  │
│  │             │  - signals   │  - call-management  │  │
│  │             │  - presence  │  - presence         │  │
│  └─────────────┴──────────────┴─────────────────────┘  │
│                                                          │
│  Realtime (WebSocket for push notifications)            │
└─────────────────────────────────────────────────────────┘
             │                          │
             │ WebRTC Signaling         │ WebRTC Signaling
             ▼                          ▼
        ┌─────────┐                ┌─────────┐
        │ Client A│◄──────────────►│ Client B│
        └─────────┘  P2P Audio     └─────────┘
```

## How Full Duplex Works

1. **Call Setup**: User A initiates call via `call-management/initiate`
2. **Notification**: User B receives call via Supabase Realtime
3. **WebRTC Offer**: User A creates WebRTC offer, sends via `webrtc-signal`
4. **Accept & Answer**: User B accepts, creates answer, sends via `webrtc-signal`
5. **ICE Exchange**: Both exchange ICE candidates via `webrtc-signal`
6. **P2P Connection**: WebRTC establishes direct peer-to-peer audio stream
7. **Full Duplex**: Both users can talk and hear simultaneously
8. **Call End**: Either user ends via `call-management/update`

## Key Differences from PTT (Half Duplex)

| Feature | PTT (Old) | Full Duplex (New) |
|---------|-----------|-------------------|
| Communication | Push-to-talk (one-way) | Phone call (two-way) |
| Audio Flow | Server-relayed | Peer-to-peer (WebRTC) |
| Latency | Higher | Lower |
| Bandwidth | Moderate | Moderate |
| User Action | Press button to talk | Always open |
| Multiple Users | Broadcast to channel | One-to-one calls |

## Security Features

- **Authentication**: All endpoints require JWT tokens
- **RLS Policies**: Database-level access control
- **WebRTC Encryption**: DTLS-SRTP encrypts audio streams
- **Presence Privacy**: Users only see talkgroup members
- **Call Privacy**: Only participants can access call data

## Performance Considerations

- **WebRTC**: Direct peer-to-peer reduces server load
- **Signaling**: Minimal server involvement after connection
- **Database**: Indexed queries for fast lookups
- **Edge Functions**: Deployed globally on Deno runtime
- **Presence**: Heartbeat every 30s to maintain status

## Monitoring

Monitor these aspects:

1. **Edge Function Logs**:
   - Supabase Dashboard → Edge Functions → Logs
   - Check for errors in call initiation/signaling

2. **Database Metrics**:
   - Active calls count: `SELECT COUNT(*) FROM calls WHERE status IN ('ringing', 'active')`
   - Failed calls: `SELECT COUNT(*) FROM calls WHERE status = 'missed'`

3. **WebRTC Connection Stats**:
   - Client-side: Monitor `RTCPeerConnection.getStats()`
   - Track ICE connection state
   - Monitor audio quality metrics

## Troubleshooting

### Edge Functions Not Working
- Check deployment logs in Supabase Dashboard
- Verify environment variables are set
- Test with curl commands

### Database Migration Failed
- Check for existing tables with same names
- Verify you have admin access
- Look for constraint violations in error messages

### Web Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Metro cache: `expo start -c`
- Check for TypeScript errors: `npm run typecheck`

### WebRTC Connection Fails
- Verify STUN servers are accessible
- Check browser permissions for microphone
- Test on different networks
- Look for firewall/NAT issues

## Next Steps

1. **Apply Database Migration** ✅
2. **Deploy Edge Functions** ✅
3. **Deploy Web Application** ✅
4. **Test Basic Functionality**
5. **Build Mobile Client** (Next Phase)
6. **Integrate WebRTC in Mobile App**
7. **Add Call UI Components**
8. **Test End-to-End Calling**

## Support

For issues or questions:
1. Check `FULL_DUPLEX_API.md` for detailed API documentation
2. Review Edge Function logs in Supabase Dashboard
3. Test individual components (database, functions, web)
4. Verify network connectivity and WebRTC compatibility

## URLs

After deployment, your system will be available at:

- **Web App**: `https://ptt.steinmetz.ltd` (or your domain)
- **API Base**: `https://YOUR_PROJECT.supabase.co/functions/v1/`
- **Database**: Accessible via Supabase Dashboard

## Costs

- **Supabase Free Tier**: 500MB database, 2GB bandwidth, 2M Edge Function invocations
- **WebRTC**: Free (peer-to-peer, no media server needed)
- **STUN Servers**: Free (using Google's public STUN)
- **Web Hosting**: Free on Netlify/Vercel, or use existing infrastructure

---

**Status**: Server-side system is complete and ready for deployment!

The full-duplex infrastructure is now in place. Once deployed and tested, you can proceed to build the mobile client that will use these APIs to establish WebRTC connections for phone-call-style communication.
