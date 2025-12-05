# Bug Fixes

## v1.0.1 - Fixed Infinite Loop Issue

### Problem
The calibration function was stuck in an infinite loop because:
1. Each calibration command triggered the thermostat to broadcast its state
2. The function processed its own `/set` commands as status updates
3. No cooldown period between calibration updates

### Solution
Three fixes were implemented:

1. **Filter Command Topics**: Ignore messages on topics ending with `/set` (these are outgoing commands, not status updates)
2. **Add Cooldown Timer**: 5-second cooldown period after each calibration change to allow the thermostat to settle
3. **Improved Loop Prevention**: Cooldown timestamp set immediately when sending calibration commands

### Changes Made
```javascript
// Filter out command topics
if (msg.topic && msg.topic.endsWith('/set')) {
    return null;
}

// Check cooldown before processing
const COOLDOWN_MS = 5000; // 5 seconds
if ((now - lastUpdateTime) < COOLDOWN_MS) {
    return null;
}

// Set cooldown when sending updates
flow.set(cooldownKey, Date.now(), CONFIG.contextStore);
```

### Testing
After applying the fix:
- ✅ No more infinite loops
- ✅ Calibration converges to correct value
- ✅ Only one update every 5+ seconds per location
- ✅ Multiple locations can still update independently

### Affected Versions
- **Fixed in**: v1.0.1+
- **Affected**: v1.0.0
