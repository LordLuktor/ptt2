# Full Duplex Call System - Quick Reference

## 📦 What You Have

### Files Created
- ✅ Database migration: `supabase/migrations/20251106000001_create_full_duplex_call_system.sql`
- ✅ Edge Functions: `supabase/functions/{webrtc-signal,call-management,presence}/index.ts`
- ✅ Web build: `dist/` (3.3 MB)
- ✅ API docs: `FULL_DUPLEX_API.md`
- ✅ Deployment guide: `DEPLOYMENT_FULL_DUPLEX.md`
- ✅ System overview: `SYSTEM_READY.md`

## 🚀 Deploy in 3 Steps

### Step 1: Database (5 min)
```
1. Open: https://app.supabase.com
2. Go to: SQL Editor
3. Run: supabase/migrations/20251106000001_create_full_duplex_call_system.sql
```

### Step 2: Edge Functions (10 min)
```bash
supabase functions deploy webrtc-signal
supabase functions deploy call-management
supabase functions deploy presence
```

### Step 3: Web App (5 min)
```bash
# Option A: Netlify
netlify deploy --prod --dir=dist

# Option B: Docker
docker-compose up -d
```

## 🔌 API Endpoints

Base URL: `https://YOUR_PROJECT.supabase.co/functions/v1/`

### Call Management
```
POST /call-management/initiate     # Start call
POST /call-management/update       # Accept/reject/end
GET  /call-management/active       # Current call
GET  /call-management/history      # Call history
```

### WebRTC Signaling
```
POST /webrtc-signal                # Send signal
GET  /webrtc-signal?callId=xxx     # Get signals
```

### Presence
```
POST /presence/update              # Update status
POST /presence/heartbeat           # Keep alive
GET  /presence?userId=xxx          # Get presence
GET  /presence/online              # Online users
```

## 🧪 Test Commands

```bash
# Replace YOUR_PROJECT and YOUR_TOKEN

# Test heartbeat
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/presence/heartbeat \
  -H "Authorization: Bearer YOUR_TOKEN"

# Initiate call
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/call-management/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"calleeId": "USER_ID"}'

# Get active call
curl https://YOUR_PROJECT.supabase.co/functions/v1/call-management/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Database Tables

```sql
-- Verify deployment
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('calls', 'webrtc_signals', 'user_presence');

-- Check active calls
SELECT * FROM calls WHERE status = 'active';

-- Check online users
SELECT * FROM user_presence WHERE status = 'online';
```

## 🎯 Call Flow

```
1. Caller initiates       → POST /call-management/initiate
2. Callee notified        → Supabase Realtime
3. Callee accepts         → POST /call-management/update (accept)
4. Exchange WebRTC data   → POST /webrtc-signal (offer/answer/ICE)
5. Direct audio starts    → WebRTC P2P connection
6. Either user ends       → POST /call-management/update (end)
```

## 🛠️ WebRTC Setup (Client)

```javascript
// STUN servers (free)
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Create peer connection
const pc = new RTCPeerConnection(config);

// Add local audio
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// Listen for remote audio
pc.ontrack = (event) => {
  const audio = new Audio();
  audio.srcObject = event.streams[0];
  audio.play();
};
```

## 📁 Project Structure

```
project/
├── supabase/
│   ├── migrations/
│   │   └── 20251106000001_create_full_duplex_call_system.sql
│   └── functions/
│       ├── webrtc-signal/index.ts
│       ├── call-management/index.ts
│       └── presence/index.ts
├── dist/                           # Web build (3.3 MB)
├── FULL_DUPLEX_API.md             # Complete API docs
├── DEPLOYMENT_FULL_DUPLEX.md      # Deployment guide
└── SYSTEM_READY.md                # System overview
```

## 🔐 Environment Variables

```env
# Already configured in .env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## ⚡ Key Concepts

### Full Duplex
- Both parties can talk and hear **simultaneously**
- Like a phone call, not a walkie-talkie
- Direct peer-to-peer audio (WebRTC)

### WebRTC Signaling
- Server only helps establish connection
- After connection, audio goes directly between clients
- Requires exchange of: offer, answer, ICE candidates

### Presence
- Tracks user availability: online, busy, offline, in_call
- Heartbeat every 30 seconds
- Visible to talkgroup members only

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Check table names don't already exist |
| Function 500 error | Check logs in Supabase Dashboard |
| CORS error | Verify headers in function responses |
| WebRTC no audio | Check microphone permissions |
| Call not connecting | Verify STUN servers accessible |

## 📚 Documentation

- **FULL_DUPLEX_API.md**: Complete API reference with examples
- **DEPLOYMENT_FULL_DUPLEX.md**: Detailed deployment steps
- **SYSTEM_READY.md**: System overview and status
- **This file**: Quick reference for common tasks

## ✅ Deployment Checklist

- [ ] Database migration applied
- [ ] 3 Edge Functions deployed
- [ ] Web app deployed
- [ ] Can access web app in browser
- [ ] Authentication works
- [ ] Test API endpoints with curl
- [ ] Review Edge Function logs

## 🎓 Next Steps

1. **Test the APIs** - Use curl commands above
2. **Build mobile client** - Integrate WebRTC
3. **Test end-to-end** - Make a real call
4. **Monitor performance** - Check logs and metrics

## 🌐 URLs After Deployment

- Web App: `https://ptt.steinmetz.ltd` (or your domain)
- API Base: `https://YOUR_PROJECT.supabase.co/functions/v1/`
- Dashboard: `https://app.supabase.com`

---

**Need help?** Check the detailed docs:
- API Reference: `FULL_DUPLEX_API.md`
- Deployment: `DEPLOYMENT_FULL_DUPLEX.md`
- Overview: `SYSTEM_READY.md`
