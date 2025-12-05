/**
 * Advanced Thermostat Calibration Node
 * 
 * Features:
 * - Supports 0.2°C calibration steps.
 * - Mixed mode: Use standard prefixes AND custom topic names simultaneously.
 * - Auto-detects device type based on payload or configuration.
 */

// --- CONFIGURATION ---
const CONFIG = {
    // Calibration precision
    step: 0.2,

    // Prefix for Node-RED internal storage keys
    storePrefix: 'thermoCal_',
    contextStore: 'default',

    // --- STRATEGY 1: AUTOMATIC PREFIX MATCHING ---
    // Messages matching these prefixes are paired by the suffix (Location ID).
    // Example: "zigbee2mqtt/s_kitchen" & "zigbee2mqtt/t_kitchen" -> ID: "kitchen"
    autoPrefixes: {
        sensor: 'zigbee2mqtt/temp_',
        thermostat: 'zigbee2mqtt/thermostat_',
    },

    // --- STRATEGY 2: CUSTOM TOPIC MAPPING ---
    // Use this for devices that don't share a naming convention.
    // Map the FULL TOPIC to a common LOCATION ID.
    // Both the sensor and the thermostat for a room must map to the SAME ID.
    customMap: {
        // "zigbee2mqtt/bedroom_aqara": "bedroom",
        // "zigbee2mqtt/bedroom_radiator_valve": "bedroom",

        // "zigbee2mqtt/living_remote": "living_room",
        // "zigbee2mqtt/heater_main": "living_room"
    }
};

// --- HELPER FUNCTIONS ---

// Round to specific step (0.2) and fix floating point errors
function roundToStep(value, step) {
    const inverse = 1.0 / step;
    const rounded = Math.round(value * inverse) / inverse;
    return parseFloat(rounded.toFixed(1));
}

// identifyDevice: Returns { id: string, type: 'sensor'|'thermostat' } or null
function identifyDevice(topic) {
    if (!topic) return null;

    // 1. Check Custom Map first (Highest Priority)
    if (CONFIG.customMap[topic]) {
        const id = CONFIG.customMap[topic];
        // We infer type based on prefixes or assume generic; 
        // Logic below uses payload checks, so type hint here is secondary but useful.
        // We will detect type strictly by payload later to be safe.
        return { id: id, isCustom: true };
    }

    // 2. Check Auto Prefixes
    if (topic.startsWith(CONFIG.autoPrefixes.sensor)) {
        return {
            id: topic.replace(CONFIG.autoPrefixes.sensor, ''),
            type: 'sensor'
        };
    }
    if (topic.startsWith(CONFIG.autoPrefixes.thermostat)) {
        return {
            id: topic.replace(CONFIG.autoPrefixes.thermostat, ''),
            type: 'thermostat'
        };
    }

    return null;
}

// --- MAIN LOGIC ---

// 1. IDENTIFY CONTEXT
const deviceContext = identifyDevice(msg.topic);

if (!deviceContext) {
    // If you have many other Zigbee devices, you might want to comment this out to reduce noise
    // node.warn(`[Calibrator] Ignored unknown topic: ${msg.topic}`);
    return null;
}

const location = deviceContext.id;
const lastSeenValue = msg.payload?.last_seen || null;

// 2. DEDUPLICATION
if (lastSeenValue) {
    const lastSeenKey = `${CONFIG.storePrefix}lastSeen_${msg.topic}`;
    const previousLastSeen = flow.get(lastSeenKey, CONFIG.contextStore);
    if (previousLastSeen === lastSeenValue) return null;
    flow.set(lastSeenKey, lastSeenValue, CONFIG.contextStore);
}

// 3. DATA INGESTION & TYPE DETECTION
let isSensorUpdate = false;
let isThermostatUpdate = false;

// We detect type based on Payload content to be robust against custom naming
// Sensors usually have 'temperature' (and NO 'local_temperature_calibration')
// Thermostats have 'local_temperature' AND 'local_temperature_calibration'

if (msg.payload.hasOwnProperty('local_temperature')) {
    // --> IT IS A THERMOSTAT
    const localTemp = msg.payload.local_temperature;
    const currentCal = msg.payload.local_temperature_calibration;

    if (typeof localTemp === 'number') {
        // Store the temperature
        flow.set(`${CONFIG.storePrefix}thermoTemp_${location}`, localTemp, CONFIG.contextStore);
        // Store the calibration (default to 0 if missing)
        flow.set(`${CONFIG.storePrefix}currentCal_${location}`, currentCal || 0, CONFIG.contextStore);
        // IMPORTANT: Store the specific topic so we know where to send commands later
        // This supports custom names like "zigbee2mqtt/my_weird_heater"
        flow.set(`${CONFIG.storePrefix}topicName_${location}`, msg.topic, CONFIG.contextStore);

        isThermostatUpdate = true;
    }

} else if (msg.payload.hasOwnProperty('temperature')) {
    // --> IT IS A SENSOR
    const temp = msg.payload.temperature;

    if (typeof temp === 'number') {
        flow.set(`${CONFIG.storePrefix}sensorTemp_${location}`, temp, CONFIG.contextStore);
        isSensorUpdate = true;
    }
}

// 4. CALIBRATION CALCULATION
// Fetch all data for this location
const storedSensorTemp = flow.get(`${CONFIG.storePrefix}sensorTemp_${location}`, CONFIG.contextStore);
const storedThermoTemp = flow.get(`${CONFIG.storePrefix}thermoTemp_${location}`, CONFIG.contextStore);
const storedCal = flow.get(`${CONFIG.storePrefix}currentCal_${location}`, CONFIG.contextStore) || 0;
const targetTopic = flow.get(`${CONFIG.storePrefix}topicName_${location}`, CONFIG.contextStore);

// We need three things: External Temp, Thermostat Temp, and the Thermostat Topic to send the reply to.
if (
    typeof storedSensorTemp === 'number' &&
    typeof storedThermoTemp === 'number' &&
    targetTopic
) {

    // Logic: RawInternal = Displayed - Calibration
    const rawThermostatTemp = storedThermoTemp - storedCal;

    // Logic: NewCal = External - RawInternal
    const calculatedCalibration = storedSensorTemp - rawThermostatTemp;

    // Rounding (0.2 step)
    const newCalibration = roundToStep(calculatedCalibration, CONFIG.step);

    // 5. UPDATE EXECUTION
    if (newCalibration !== storedCal) {
        node.warn(`[Action] ${location} | Calibrating: ${storedCal} -> ${newCalibration} (Sensor: ${storedSensorTemp}, Thermo: ${storedThermoTemp})`);

        // Construct the set command. 
        // We append "/set" to the stored thermostat topic.
        msg.topic = `${targetTopic}/set`;
        msg.payload = {
            local_temperature_calibration: newCalibration
        };

        // Optimistic update to prevent loops
        flow.set(`${CONFIG.storePrefix}currentCal_${location}`, newCalibration, CONFIG.contextStore);

        return msg;
    } else {
        // Optional: logging for no change
        // node.warn(`[Info] ${location} | Sync OK. Sensor: ${storedSensorTemp}, Thermo: ${storedThermoTemp}`);
    }
}

return null;
