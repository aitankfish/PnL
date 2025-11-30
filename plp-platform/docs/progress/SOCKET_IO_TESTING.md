# Socket.IO Real-Time Updates - Testing Guide

## Overview

Socket.IO has been successfully integrated using Next.js instrumentation hooks. The system now supports real-time updates without requiring a custom server.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Blockchain (Solana)                                         │
│      │                                                        │
│      │ Account updates                                       │
│      ▼                                                        │
│  Helius WebSocket  ────────►  Redis Queue                   │
│                                   │                           │
│                                   │                           │
│                                   ▼                           │
│                           Event Processor                     │
│                                   │                           │
│                                   │                           │
│                    ┌──────────────┴──────────────┐           │
│                    │                              │           │
│                    ▼                              ▼           │
│               MongoDB                     Socket.IO Server    │
│            (Port 27017)                     (Port 3001)       │
│                                                   │           │
│                                                   │           │
│                                                   ▼           │
│                                           Frontend Clients    │
│                                            (Port 3000)        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## What Was Fixed

### 1. Instrumentation Hook (`src/instrumentation.ts`)
- Created a Next.js instrumentation hook that initializes Socket.IO on server startup
- Socket.IO runs on a **separate port (3001)** to avoid conflicts with Next.js
- Works with standard `npm run dev` command - no custom server needed

### 2. Frontend Socket Hook (`src/lib/hooks/useSocket.ts`)
- Updated to connect to `http://localhost:3001` instead of the Next.js server
- Maintains WebSocket + polling fallback
- Automatic reconnection on disconnect

### 3. Server Output
```
✓ Compiled /instrumentation in 460ms (270 modules)
[INFO] 🔌 Initializing Socket.IO server...
[INFO] ✅ Socket.IO server initialized
✅ Socket.IO server running on port 3001
✓ Ready in 1918ms
```

## How to Test

### Setup (Required Services)

## Current Working Setup (2 Separate Processes)

Due to a known issue with tsx and Next.js font loading, we currently run services separately:

**Terminal 1: Next.js Dev Server**
```bash
npm run dev
```
You should see:
```
✓ Ready on http://localhost:3000
```

**Terminal 2: Blockchain Sync System**
```bash
npx tsx scripts/start-sync-system.ts
```
You should see:
```
✅ Blockchain sync manager started successfully!
📡 Subscribed to X market accounts
```

## Alternative: Unified Server (Has Font Loading Bug)

There's an alternative `npm run dev:unified` command that runs everything in one process, but it currently has a webpack font loading error:

```bash
npm run dev:unified  # ❌ Currently broken - font loading issue
```

**Issue:** When using `tsx server.ts`, Next.js throws `ERR_INVALID_URL_SCHEME` for font loading.

**Workaround:** Use the 2-terminal approach above until this is resolved.

**Note:** The custom server (`server.ts`) is fully implemented and ready - we just need to find the right way to run it without breaking Next.js's internal font loading.

### Test 1: Verify Socket.IO Connection

1. Open `http://localhost:3000` in your browser
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Navigate to any market page
5. Look for these logs:
   ```
   [INFO] 🔌 Socket.IO connected
   [INFO] 📡 Subscribing to market: <address>
   ```

**Expected Result:** No connection timeout errors. You should see a successful connection message.

### Test 2: Real-Time Vote Updates

1. Open `http://localhost:3000` in **TWO browser windows** (side by side)
2. Navigate to the same market in both windows
3. In Window 1: Cast a vote (YES or NO)
4. Watch Window 2

**Expected Result:**
- Vote goes through on-chain (transaction succeeds)
- Blockchain sync detects the account update within ~2 seconds
- Socket.IO broadcasts update to all connected clients
- Window 2 automatically updates WITHOUT refresh
- Vote counts and stake amounts update in real-time

**In the browser console, you should see:**
```
[INFO] 📥 Market update received: <address>...
```

**In Terminal 2 (sync system), you should see:**
```
[INFO] 📥 Account update received: <address>... (market)
[INFO] 📤 Broadcasting market update: <address>...
```

### Test 3: Multi-User Real-Time Updates

1. Open `http://localhost:3000` in Browser 1 (Chrome)
2. Open `http://localhost:3000` in Browser 2 (Firefox or Incognito)
3. Connect **different wallets** in each browser
4. Navigate to the same market in both
5. Vote from Browser 1
6. Watch Browser 2 update automatically

**Expected Result:** Both users see the same data in real-time without refresh.

### Test 4: Connection Resilience

1. While on a market page, check the browser console
2. Restart the blockchain sync system (Ctrl+C and restart)
3. Browser should automatically reconnect within 5 seconds

**Expected Result:** Socket.IO reconnects automatically. You should see:
```
[WARN] 🔌 Socket.IO disconnected: transport close
[INFO] 🔌 Socket.IO connected
[INFO] 📡 Subscribing to market: <address>
```

## Common Issues & Solutions

### Issue 1: "Connection timeout" errors

**Symptoms:**
```
[ERROR] 🔌 Socket.IO connection error: Error: timeout
```

**Solution:**
- Make sure `npm run dev` is running and you see "✅ Socket.IO server running on port 3001"
- Check that port 3001 is not blocked by firewall
- Try restarting the dev server

### Issue 2: Updates not appearing

**Symptoms:** Vote goes through but other windows don't update

**Checklist:**
- ✅ Is the blockchain sync system running? (`npx tsx scripts/start-sync-system.ts`)
- ✅ Does Terminal 2 show "Account update received"?
- ✅ Does Terminal 2 show "Broadcasting market update"?
- ✅ Are both browser windows on the same market?
- ✅ Check browser console for "Market update received" logs

**Solution:** If sync system is receiving events but not broadcasting:
```bash
# Restart both services
# Terminal 1
Ctrl+C
npm run dev

# Terminal 2
Ctrl+C
npx tsx scripts/start-sync-system.ts
```

### Issue 3: "Socket.IO server not initialized"

**Symptoms:**
```
[WARN] Socket.IO server not initialized
```

**Solution:** This means the instrumentation hook didn't run. Try:
```bash
rm -rf .next
npm run dev
```

## Architecture Files

Key files in the Socket.IO system:

1. **`src/instrumentation.ts`** - Initializes Socket.IO on server startup
2. **`src/services/socket/socket-server.ts`** - Socket.IO server implementation
3. **`src/lib/hooks/useSocket.ts`** - React hooks for real-time subscriptions
4. **`src/services/blockchain-sync/event-processor.ts`** - Broadcasts to Socket.IO
5. **`src/app/market/[id]/page.tsx`** - Market page with Socket.IO integration

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Next.js | 3000 | Main web server |
| Socket.IO | 3001 | Real-time WebSocket server |
| MongoDB | 27017 | Database |
| Redis | 6379 | Event queue (if used) |

## Environment Variables

Add to `.env.local` (optional):

```bash
# Socket.IO Configuration
NEXT_PUBLIC_SOCKET_PORT=3001  # Default is 3001
SOCKET_PORT=3001              # Server-side config
```

## Success Criteria

The Socket.IO integration is working correctly when:

1. ✅ Dev server starts with "Socket.IO server running on port 3001"
2. ✅ Browser console shows "Socket.IO connected" on page load
3. ✅ Voting in one window updates other windows without refresh
4. ✅ No "connection timeout" errors in browser console
5. ✅ Sync system logs show "Broadcasting market update"
6. ✅ Real-time updates appear within 2-3 seconds of on-chain transaction

## Next Steps

Once testing confirms everything works:

1. Test with multiple concurrent users (5-10 browsers)
2. Test network resilience (disconnect/reconnect WiFi)
3. Test with production Solana mainnet (when ready)
4. Add performance monitoring for Socket.IO connections
5. Consider adding Socket.IO admin dashboard

## Debugging Tips

### Enable Verbose Logging

Add to browser console:
```javascript
localStorage.debug = 'socket.io-client:*';
```

Then refresh the page. You'll see detailed Socket.IO connection logs.

### Check Socket.IO Connection

In browser console:
```javascript
// Check if socket is connected
window.location.href = 'http://localhost:3001/api/socket/io'
```

### Monitor Events

In browser console after navigating to a market:
```javascript
// Listen to all Socket.IO events
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

## Production Considerations

Before deploying to production:

1. Update Socket.IO URL to use `wss://` (secure WebSocket)
2. Configure CORS for production domain
3. Add authentication to Socket.IO connections
4. Set up Socket.IO clustering for horizontal scaling
5. Monitor Socket.IO connection count and performance
6. Add rate limiting for Socket.IO events

---

**Status:** ✅ Socket.IO integration complete and ready for testing

**Last Updated:** 2025-11-11
