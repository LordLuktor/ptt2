# Full Duplex Call System - API Documentation

## Overview

The Full Duplex Call System enables phone-call-style communication using WebRTC technology. The system consists of:

- **Database Tables**: Store call records, WebRTC signals, and user presence
- **Edge Functions**: Server-side API endpoints for call management, signaling, and presence
- **Client Implementation**: Mobile/web apps use these APIs + WebRTC for peer-to-peer audio

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client A  │◄────────┤   Supabase   ├────────►│  Client B   │
│   (Caller)  │  Signal │  Edge Funcs  │  Signal │  (Callee)   │
└──────┬──────┘         └──────────────┘         └──────┬──────┘
       │                                                  │
       │              WebRTC P2P Audio Stream            │
       └─────────────────────────────────────────────────┘
```

### Communication Flow

1. **Call Initiation**: Caller creates call via `call-management/initiate`
2. **Ringing Notification**: Callee receives notification via realtime subscription
3. **WebRTC Signaling**: Both parties exchange SDP offers/answers and ICE candidates via `webrtc-signal`
4. **Direct Audio**: WebRTC establishes peer-to-peer audio connection
5. **Call Management**: Accept/reject/end via `call-management/update`

## Database Schema

### Tables

#### `calls`
Stores call records with status and metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| caller_id | uuid | User who initiated call |
| callee_id | uuid | User receiving call |
| channel_id | uuid | Optional channel context |
| status | enum | 'ringing', 'active', 'ended', 'missed', 'rejected' |
| started_at | timestamptz | Call initiation time |
| answered_at | timestamptz | When call was answered |
| ended_at | timestamptz | When call ended |
| duration_seconds | integer | Call duration |
| end_reason | text | 'completed', 'rejected', 'timeout', 'error' |

#### `webrtc_signals`
Stores WebRTC signaling data for peer connection establishment.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| call_id | uuid | Associated call |
| from_user_id | uuid | Signal sender |
| to_user_id | uuid | Signal recipient |
| signal_type | text | 'offer', 'answer', 'ice-candidate' |
| signal_data | jsonb | WebRTC payload |
| created_at | timestamptz | Signal creation time |

#### `user_presence`
Tracks user availability and call status.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Primary key |
| status | text | 'online', 'busy', 'offline', 'in_call' |
| last_seen | timestamptz | Last activity |
| current_call_id | uuid | Active call reference |
| updated_at | timestamptz | Last update |

## Edge Functions API

All endpoints require authentication via the `Authorization: Bearer <token>` header.

### Base URL

```
https://<your-project>.supabase.co/functions/v1/
```

---

## Call Management API

### 1. Initiate Call

Start a new call to another user.

**Endpoint**: `POST /call-management/initiate`

**Request Body**:
```json
{
  "calleeId": "uuid",
  "channelId": "uuid" // optional
}
```

**Response**:
```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "caller_id": "caller-uuid",
    "callee_id": "callee-uuid",
    "status": "ringing",
    "started_at": "2025-11-06T12:00:00Z",
    ...
  }
}
```

**Errors**:
- `400`: Missing calleeId, cannot call self
- `404`: Callee not found
- `409`: Callee is busy

---

### 2. Update Call

Accept, reject, or end a call.

**Endpoint**: `POST /call-management/update`

**Request Body**:
```json
{
  "callId": "uuid",
  "action": "accept" | "reject" | "end",
  "endReason": "completed" // optional, for end action
}
```

**Response**:
```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "status": "active",
    "answered_at": "2025-11-06T12:00:05Z",
    ...
  }
}
```

**Rules**:
- Only callee can accept or reject
- Either party can end
- Call status transitions: ringing → active → ended

---

### 3. Get Active Call

Retrieve user's current active call.

**Endpoint**: `GET /call-management/active`

**Response**:
```json
{
  "call": {
    "id": "call-uuid",
    "status": "active",
    ...
  }
}
```

Returns `null` if no active call.

---

### 4. Get Call History

Retrieve user's call history.

**Endpoint**: `GET /call-management/history?limit=50`

**Query Parameters**:
- `limit`: Number of records (default: 50)

**Response**:
```json
{
  "calls": [
    {
      "id": "call-uuid",
      "caller_id": "uuid",
      "callee_id": "uuid",
      "status": "ended",
      "duration_seconds": 125,
      ...
    }
  ]
}
```

---

## WebRTC Signaling API

### 1. Send Signal

Send WebRTC signaling data (offer, answer, ICE candidate).

**Endpoint**: `POST /webrtc-signal`

**Request Body**:
```json
{
  "callId": "uuid",
  "toUserId": "uuid",
  "signalType": "offer" | "answer" | "ice-candidate",
  "signalData": {
    // WebRTC SDP or ICE candidate data
    "sdp": "...",
    "type": "offer"
  }
}
```

**Response**:
```json
{
  "success": true,
  "signal": {
    "id": "signal-uuid",
    "call_id": "call-uuid",
    "signal_type": "offer",
    ...
  }
}
```

---

### 2. Get Signals

Retrieve pending WebRTC signals.

**Endpoint**: `GET /webrtc-signal?callId=uuid&since=2025-11-06T12:00:00Z`

**Query Parameters**:
- `callId`: Required, the call ID
- `since`: Optional, ISO timestamp to get signals after

**Response**:
```json
{
  "signals": [
    {
      "id": "signal-uuid",
      "from_user_id": "uuid",
      "signal_type": "answer",
      "signal_data": { "sdp": "...", "type": "answer" },
      "created_at": "2025-11-06T12:00:05Z"
    }
  ]
}
```

**Usage Pattern**:
1. Caller creates call
2. Caller generates WebRTC offer, sends via this API
3. Callee polls for signals, receives offer
4. Callee generates answer, sends via this API
5. Caller polls for signals, receives answer
6. Both exchange ICE candidates as they're discovered

---

## Presence API

### 1. Update Presence

Update user's presence status.

**Endpoint**: `POST /presence/update`

**Request Body**:
```json
{
  "status": "online" | "busy" | "offline" | "in_call"
}
```

**Response**:
```json
{
  "success": true,
  "presence": {
    "user_id": "uuid",
    "status": "online",
    "last_seen": "2025-11-06T12:00:00Z"
  }
}
```

---

### 2. Heartbeat

Send keep-alive to maintain online status.

**Endpoint**: `POST /presence/heartbeat`

**Request Body**: Empty `{}`

**Response**:
```json
{
  "success": true,
  "presence": {
    "user_id": "uuid",
    "status": "online",
    "last_seen": "2025-11-06T12:00:00Z"
  }
}
```

**Recommendation**: Send every 30 seconds while app is active.

---

### 3. Get User Presence

Get a specific user's presence.

**Endpoint**: `GET /presence?userId=uuid`

**Response**:
```json
{
  "presence": {
    "user_id": "uuid",
    "status": "online",
    "last_seen": "2025-11-06T12:00:00Z",
    "current_call_id": null
  }
}
```

---

### 4. Get Talkgroup Presence

Get presence for all users in a talkgroup.

**Endpoint**: `GET /presence/talkgroup?talkgroupId=uuid`

**Response**:
```json
{
  "presences": [
    {
      "user_id": "uuid",
      "status": "online",
      "profiles": {
        "id": "uuid",
        "full_name": "John Doe",
        "role": "user"
      }
    }
  ]
}
```

---

### 5. Get Online Users

Get all online users in accessible talkgroups.

**Endpoint**: `GET /presence/online`

**Response**:
```json
{
  "presences": [
    {
      "user_id": "uuid",
      "status": "online",
      "profiles": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "role": "supervisor"
      }
    }
  ]
}
```

---

## Client Implementation Guide

### WebRTC Setup

Use free STUN/TURN servers for NAT traversal:

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const peerConnection = new RTCPeerConnection(rtcConfig);
```

### Full Call Flow Example

#### Caller Side

```javascript
// 1. Initiate call
const response = await fetch('/call-management/initiate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ calleeId: targetUserId })
});
const { call } = await response.json();

// 2. Create peer connection
const pc = new RTCPeerConnection(rtcConfig);

// 3. Add local audio stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// 4. Handle ICE candidates
pc.onicecandidate = async (event) => {
  if (event.candidate) {
    await fetch('/webrtc-signal', {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({
        callId: call.id,
        toUserId: call.callee_id,
        signalType: 'ice-candidate',
        signalData: event.candidate
      })
    });
  }
};

// 5. Create and send offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
await fetch('/webrtc-signal', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({
    callId: call.id,
    toUserId: call.callee_id,
    signalType: 'offer',
    signalData: offer
  })
});

// 6. Poll for answer
const pollForAnswer = setInterval(async () => {
  const res = await fetch(`/webrtc-signal?callId=${call.id}`);
  const { signals } = await res.json();

  const answer = signals.find(s => s.signal_type === 'answer');
  if (answer) {
    await pc.setRemoteDescription(answer.signal_data);
    clearInterval(pollForAnswer);
  }

  // Handle ICE candidates
  signals.filter(s => s.signal_type === 'ice-candidate').forEach(async (signal) => {
    await pc.addIceCandidate(signal.signal_data);
  });
}, 1000);
```

#### Callee Side

```javascript
// 1. Listen for incoming calls (Supabase realtime)
supabase
  .channel('calls')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'calls',
    filter: `callee_id=eq.${userId}`
  }, (payload) => {
    const call = payload.new;
    // Show incoming call UI
    showIncomingCallDialog(call);
  })
  .subscribe();

// 2. Accept call
async function acceptCall(call) {
  await fetch('/call-management/update', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      callId: call.id,
      action: 'accept'
    })
  });

  // 3. Create peer connection
  const pc = new RTCPeerConnection(rtcConfig);

  // 4. Add local audio
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  // 5. Handle remote stream
  pc.ontrack = (event) => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play();
  };

  // 6. Get offer
  const res = await fetch(`/webrtc-signal?callId=${call.id}`);
  const { signals } = await res.json();
  const offer = signals.find(s => s.signal_type === 'offer');

  // 7. Set remote description and create answer
  await pc.setRemoteDescription(offer.signal_data);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // 8. Send answer
  await fetch('/webrtc-signal', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      callId: call.id,
      toUserId: call.caller_id,
      signalType: 'answer',
      signalData: answer
    })
  });

  // 9. Handle ICE candidates
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await fetch('/webrtc-signal', {
        method: 'POST',
        body: JSON.stringify({
          callId: call.id,
          toUserId: call.caller_id,
          signalType: 'ice-candidate',
          signalData: event.candidate
        })
      });
    }
  };
}
```

### Ending Calls

```javascript
async function endCall(callId) {
  // Close peer connection
  peerConnection.close();

  // Stop local stream
  localStream.getTracks().forEach(track => track.stop());

  // Update call status
  await fetch('/call-management/update', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      callId: callId,
      action: 'end',
      endReason: 'completed'
    })
  });
}
```

## Realtime Subscriptions

Use Supabase Realtime to receive instant notifications:

```javascript
// Listen for incoming calls
supabase
  .channel('my-calls')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'calls',
    filter: `callee_id=eq.${userId}`
  }, handleIncomingCall)
  .subscribe();

// Listen for call status changes
supabase
  .channel('call-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'calls',
    filter: `id=eq.${currentCallId}`
  }, handleCallUpdate)
  .subscribe();

// Listen for WebRTC signals
supabase
  .channel('webrtc-signals')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'webrtc_signals',
    filter: `to_user_id=eq.${userId}`
  }, handleWebRTCSignal)
  .subscribe();
```

## Security

- All endpoints require authentication
- RLS policies enforce data access:
  - Users can only view/manage their own calls
  - Users can only see presence of talkgroup members
  - Signals are only visible to sender and recipient
- WebRTC audio streams are encrypted peer-to-peer

## Testing

1. **Manual Testing**: Use two browser windows or devices
2. **STUN/TURN**: Test on different networks to verify NAT traversal
3. **Error Handling**: Test rejected calls, busy status, timeouts
4. **Network Conditions**: Test poor connectivity scenarios

## Troubleshooting

### Call doesn't connect
- Check both users are online
- Verify WebRTC signals are being exchanged
- Check browser console for ICE connection errors
- Ensure STUN servers are accessible

### No audio
- Check microphone permissions
- Verify `getUserMedia()` succeeded
- Check `pc.ontrack` is receiving remote stream
- Test audio element playback

### Signaling delays
- Use Supabase realtime instead of polling
- Check network latency
- Verify Edge Functions are responding quickly

## Rate Limits

Edge Functions have the following limits:
- Max request size: 10MB
- Max response size: 10MB
- Timeout: 150 seconds

## Next Steps

- Implement group calling (conference calls)
- Add video support
- Implement call recording
- Add call quality metrics
- Create native mobile apps with optimized WebRTC
