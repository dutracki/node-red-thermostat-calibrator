# Examples

This directory contains example configurations for common scenarios.

## Basic Setup

### Example 1: Standard Naming Convention

**Devices:**
- Sensor: `zigbee2mqtt/temp_living_room`
- Thermostat: `zigbee2mqtt/thermostat_living_room`

**Configuration:**
```javascript
const CONFIG = {
    step: 0.2,
    storePrefix: 'thermoCal_',
    contextStore: 'file',
    
    autoPrefixes: {
        sensor: 'zigbee2mqtt/temp_',
        thermostat: 'zigbee2mqtt/thermostat_',
    },
    
    customMap: {}
};
```

---

## Custom Mapping Examples

### Example 2: Aqara Sensors + Tuya TRVs

**Devices:**
- Bedroom Sensor: `zigbee2mqtt/aqara_multi_bedroom`
- Bedroom TRV: `zigbee2mqtt/tuya_trv_bed_01`
- Living Sensor: `zigbee2mqtt/aqara_temp_living`
- Living TRV: `zigbee2mqtt/tuya_valve_living`

**Configuration:**
```javascript
const CONFIG = {
    step: 0.2,
    storePrefix: 'thermoCal_',
    contextStore: 'file',
    
    autoPrefixes: {
        sensor: '',
        thermostat: '',
    },
    
    customMap: {
        "zigbee2mqtt/aqara_multi_bedroom": "bedroom",
        "zigbee2mqtt/tuya_trv_bed_01": "bedroom",
        "zigbee2mqtt/aqara_temp_living": "living_room",
        "zigbee2mqtt/tuya_valve_living": "living_room"
    }
};
```

---

### Example 3: Mixed Setup (Auto + Custom)

**Devices:**
- Kitchen uses standard naming: `temp_kitchen` / `thermostat_kitchen`
- Bathroom has custom names: `sonoff_bath_sensor` / `danfoss_bath_valve`

**Configuration:**
```javascript
const CONFIG = {
    step: 0.2,
    storePrefix: 'thermoCal_',
    contextStore: 'file',
    
    autoPrefixes: {
        sensor: 'zigbee2mqtt/temp_',
        thermostat: 'zigbee2mqtt/thermostat_',
    },
    
    customMap: {
        "zigbee2mqtt/sonoff_bath_sensor": "bathroom",
        "zigbee2mqtt/danfoss_bath_valve": "bathroom"
    }
};
```

---

## Advanced Examples

### Example 4: Different Calibration Steps

Some older TRVs only support 0.5°C or 1°C steps:

```javascript
const CONFIG = {
    step: 0.5,  // or 1.0 for very old devices
    // ... rest of config
};
```

### Example 5: RAM vs File Storage

**RAM Storage (default):**
- Faster
- Data lost on Node-RED restart
```javascript
contextStore: 'default'
```

**File Storage:**
- Persistent across restarts
- Slightly slower
```javascript
contextStore: 'file'
```

---

## Supported Thermostat Models

### Tested Devices

✅ **Tuya TS0601 (various models)**
✅ **Danfoss Ally**
✅ **Moes HY368/HY369**
✅ **Eurotronic Spirit**
✅ **Saswell SAS980SWT**

### Sensor Recommendations

For best accuracy, use:
- **Aqara WSDCGQ11LM** (±0.3°C)
- **Sonoff SNZB-02** (±0.5°C)
- **Xiaomi LYWSD03MMC** (flashed with custom firmware)

---

## Node-RED Flow Example

```json
[
    {
        "id": "mqtt-in",
        "type": "mqtt in",
        "topic": "zigbee2mqtt/#",
        "broker": "your-broker-id"
    },
    {
        "id": "calibrator",
        "type": "function",
        "name": "Thermostat Calibrator",
        "func": "/* Paste function.js code here */"
    },
    {
        "id": "mqtt-out",
        "type": "mqtt out",
        "broker": "your-broker-id"
    }
]
```

Wire: `mqtt-in` → `calibrator` → `mqtt-out`
