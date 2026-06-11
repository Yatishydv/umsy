# Session Pool Testing Guide

## Overview
The backend now includes a SessionPool that limits concurrent Playwright sessions to 20. Excess requests are queued in FIFO order.

## Testing Concurrent Sessions

### Method 1: Using curl (sequential)
```bash
# Terminal 1-5 (run simultaneously)
curl -X POST http://localhost:3001/api/start-login \
  -H "Content-Type: application/json" \
  -d '{"regno":"12345678","password":"yourpassword"}'
```

### Method 2: Using a test script
Create `test-pool.js`:

```javascript
const testConcurrency = async () => {
    const requests = [];
    
    // Create 25 concurrent requests (5 more than max)
    for (let i = 0; i < 25; i++) {
        const promise = fetch('http://localhost:3001/api/start-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                regno: '12345678',
                password: 'test123'
            })
        });
        requests.push(promise);
    }
    
    console.log('🚀 Firing 25 concurrent requests...');
    const results = await Promise.allSettled(requests);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Completed: ${successful}/25`);
};

testConcurrency();
```

Run: `node test-pool.js`

### Expected Behavior

**Console Logs:**
```
🎫 SessionPool initialized with max 20 concurrent sessions
📊 Pool Status: 0/20 active, 0 queued, 20 available
✅ Slot acquired | Active: 1/20 | Queued: 0
✅ Slot acquired | Active: 2/20 | Queued: 0
...
✅ Slot acquired | Active: 20/20 | Queued: 0
⏳ Pool full, queueing request | Active: 20/20 | Queued: 1
⏳ Pool full, queueing request | Active: 20/20 | Queued: 2
...
🔄 Slot released and reassigned | Active: 20/20 | Queued: 4
🔄 Slot released and reassigned | Active: 20/20 | Queued: 3
```

### Check Pool Status
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "activeSessions": 5,
  "pool": {
    "active": 5,
    "maxActive": 20,
    "queued": 0,
    "available": 15
  }
}
```

## Production Monitoring

Monitor these metrics:
- `pool.active` - Current active Playwright sessions
- `pool.queued` - Users waiting for a slot
- `pool.available` - Free slots

If `queued` consistently > 0, consider:
1. Increasing `maxActive` (if server has resources)
2. Optimizing Playwright automation speed
3. Scaling horizontally with load balancer

## Configuration

To change max sessions, edit `server.js`:
```javascript
const sessionPool = new SessionPool(30); // Increase to 30
```

**Recommended values:**
- Development: 10-20
- Production (2GB RAM): 20-30
- Production (4GB RAM): 30-50
