
/**
 * Advanced Thermostat Calibration Node (v2.0)
 * 
 * Features:
 * - Supports 0.2°C calibration steps.
 * - Regex-based device discovery with custom weighting.
 * - Multi-sensor aggregation per room.
 * - Time-weighted averaging (Fresh/Normal/Old/Very Old).
 */

// --- CONFIGURATION ---
const CONFIG = {
    // Enable detailed logging for debugging regex, weights, and calculations
    debug: true,

    // Per-Location Overrides
    locations: {
        "office": {
            // Device-specific settings can go here (e.g. specific debounce?)
        }
    },

    // Calibration precision
    step: 0.2,

    // Prefix for Node-RED internal storage keys
    storePrefix: 'thermoCal_',
    contextStore: 'default',

    // Time-based weighting for sensor readings (in minutes)
    timeWeights: {
        fresh: { maxAge: 5, weight: 1.0 },   // 0-5 mins
        normal: { maxAge: 14, weight: 0.8 }, // 5-14 mins
        old: { maxAge: 22, weight: 0.4 },    // 14-22 mins
        veryOld: { maxAge: 30, weight: 0.1 } // 22-30 mins
        // >30 mins is ignored
    },

    // Discovery Rules: Checked in order. First match wins.
    discovery: [
        // 1. Secondary Sensor: "zigbee2mqtt/temp_office_2" -> Location: "office"
        {
            pattern: 'zigbee2mqtt/temp_(.*)_2',
            type: 'sensor',
            baseWeight: 0.5
        },
        // 2. Primary Sensor: "zigbee2mqtt/temp_office" -> Location: "office"
        {
            pattern: 'zigbee2mqtt/temp_(.*)',
            type: 'sensor',
            baseWeight: 1.0
        },
        // 3. Thermostat: "zigbee2mqtt/thermostat_office" -> Location: "office"
        {
            pattern: 'zigbee2mqtt/thermostat_(.*)',
            type: 'thermostat'
        }
    ]
};

// --- HELPER FUNCTIONS ---

/**
 * Logs a message to the Node-RED debug panel if debug mode is enabled.
 * @context Observability - filters noise unless debugging.
 * @param {string} msg - The message to log.
 */
function log(msg) {
    if (CONFIG.debug) {
        node.warn(`[DEBUG] ${msg}`);
    }
}

/**
 * Rounds a number to the nearest step (e.g., 0.5) to align with thermostat precision.
 * @param {number} value - Input value capable of floating point errors.
 * @param {number} step - Precision step (e.g. 0.1, 0.5).
 * @returns {number} The rounded value fixed to 1 decimal place.
 */
function roundToStep(value, step) {
    const inverse = 1.0 / step;
    const rounded = Math.round(value * inverse) / inverse;
    return parseFloat(rounded.toFixed(1));
}

/**
 * Identifies the device context from an MQTT topic using regex discovery rules.
 * @context Discovery - Maps loose MQTT topics to strict internal Location IDs.
 * @param {string} topic - MQTT topic string.
 * @returns {{id: string, type: 'sensor'|'thermostat', baseWeight: number}|null} Identified device or null.
 */
function identifyDevice(topic) {
    if (!topic) return null;

    for (const rule of CONFIG.discovery) {
        const regex = new RegExp(rule.pattern);
        const match = topic.match(regex);
        if (match) {
            const id = match[1];
            if (CONFIG.debug) {
                log(`Topic '${topic}' matched rule '${rule.pattern}' -> Location: '${id}', Type: ${rule.type}, Weight: ${rule.baseWeight || 1.0}`);
            }
            return {
                id: id,
                type: rule.type,
                baseWeight: rule.baseWeight !== undefined ? rule.baseWeight : 1.0
            };
        }
    }

    if (CONFIG.debug) {
        log(`Topic '${topic}' did not match any discovery rules.`);
    }
    return null;
}

/**
 * Calculates the time-decay weight for a sensor reading.
 * @context Data_Quality - Older data is less reliable.
 * @param {number} ageMinutes - Age of the reading in minutes.
 * @returns {number} Weight multiplier (0.0 - 1.0).
 */
function getWeightForAge(ageMinutes) {
    if (ageMinutes <= CONFIG.timeWeights.fresh.maxAge) return CONFIG.timeWeights.fresh.weight;
    if (ageMinutes <= CONFIG.timeWeights.normal.maxAge) return CONFIG.timeWeights.normal.weight;
    if (ageMinutes <= CONFIG.timeWeights.old.maxAge) return CONFIG.timeWeights.old.weight;
    if (ageMinutes <= CONFIG.timeWeights.veryOld.maxAge) return CONFIG.timeWeights.veryOld.weight;
    return 0; // Too old
}

// --- MAIN LOGIC ---

if (CONFIG.debug) {
    log(`Incoming: ${msg.topic} | Payload: ${JSON.stringify(msg.payload)}`);
}

// 0. FILTER OUT COMMAND TOPICS
if (msg.topic && msg.topic.endsWith('/set')) {
    if (CONFIG.debug) log(`Ignoring command topic: ${msg.topic}`);
    return null;
}

// 1. IDENTIFICATION
// @intent: Convert raw MQTT topic into a controlled internal Location ID context.
const deviceContext = identifyDevice(msg.topic);
if (!deviceContext) {
    // @HOOK: Unexpected_Device_Handler (Future: Alert user?)
    return null;
}

const location = deviceContext.id;
const lastSeenValue = msg.payload?.last_seen || null;
const now = msg.ts || Date.now(); // Global definition

// 2. DEDUPLICATION
// @intent: Reduce processing load effectively, but allow some duplicates if logic requires freshness updates.
if (lastSeenValue) {
    // Only skip if the actual temperature payload is missing (heartbeat only)
    if (msg.payload.temperature === undefined && msg.payload.local_temperature === undefined) {
        if (CONFIG.debug) log("Skipping dedupe (heartbeat only, no temp data).");
        return null;
    }
    const lastSeenKey = `${CONFIG.storePrefix}lastSeen_${msg.topic}`;
    const previousLastSeen = flow.get(lastSeenKey, CONFIG.contextStore);
    if (previousLastSeen === lastSeenValue) {
        if (CONFIG.debug) log(`Duplicate message detected (last_seen: ${lastSeenValue})`);
        return null;
    }
    flow.set(lastSeenKey, lastSeenValue, CONFIG.contextStore);
}

// 3. INGESTION (Update State)
// @intent: Store the latest reading regardless of whether we act on it. Separation of Concerns: Data != Action.
if (deviceContext.type === 'sensor') {
    const temp = msg.payload.temperature;

    // Validate Data Integrity
    if (typeof temp !== 'number') {
        node.error(`Invalid temp from ${msg.topic}: ${temp}`);
        return null;
    }

    // Persist to Flow Context
    const readingsKey = `${CONFIG.storePrefix}sensorReadings_${location}`;
    let readings = flow.get(readingsKey, CONFIG.contextStore) || {};

    // Note: We don't have 'change' variable logic here anymore for brevity/cleanliness unless we re-add it.
    // Let's keep it simple.

    readings[msg.topic] = {
        temp: temp,
        ts: now,
        baseWeight: deviceContext.baseWeight
    };

    if (CONFIG.debug) log(`Sensor Update for '${location}': ${msg.topic} = ${temp} (new) | Weight: ${deviceContext.baseWeight}`);

    flow.set(readingsKey, readings, CONFIG.contextStore);

    // Stop here. Wait for Thermostat to trigger the calibration check.
    // @reason: Sensors update often. We only calibrate when the Thermostat (the actuator) reports in.
    if (CONFIG.debug) log(`Waiting for first thermostat update to know target topic for ${location}.`);
    return null;

} else if (deviceContext.type === 'thermostat') {
    // Thermostat is the "Trigger" for calibration checks.

    // Normalize Zigbee payload variations
    const currentLocalTemp = msg.payload.local_temperature;
    const currentCalibration = msg.payload.local_temperature_calibration || 0;

    if (currentLocalTemp === undefined) return null; // Not a temp update

    // Save Thermostat State
    flow.set(`${CONFIG.storePrefix}thermoTemp_${location}`, currentLocalTemp, CONFIG.contextStore);
    flow.set(`${CONFIG.storePrefix}currentCal_${location}`, currentCalibration, CONFIG.contextStore);
    flow.set(`${CONFIG.storePrefix}topicName_${location}`, msg.topic, CONFIG.contextStore); // Store target topic logic

    if (CONFIG.debug) log(`Updating Thermostat Setup for '${location}': Temp=${currentLocalTemp}, Cal=${currentCalibration}`);

    // 3b. EARLY EXIT (Feedback Loop Prevention)
    // @intent: If we just sent a command, the thermostat sends an update. We must update state (above) but NOT trigger a new calculation.
    const cooldownKey = `${CONFIG.storePrefix}cooldown_${location}`;
    const lastUpdateTime = flow.get(cooldownKey, CONFIG.contextStore) || 0;
    const COOLDOWN_MS = 5000;

    if ((now - lastUpdateTime) < COOLDOWN_MS) {
        if (CONFIG.debug) log(`[Info] Updates saved, but calculation suppressed due to recent action (Echo suppression).`);
        return null;
    }

    // proceed to Calculation...
}

// 4. CALCULATION (Weighted Average)
// @intent: Determine the "True" room temperature by aggregating all available sensors.
const readingsKey = `${CONFIG.storePrefix}sensorReadings_${location}`;
const readings = flow.get(readingsKey, CONFIG.contextStore) || {};
const storedThermoTemp = flow.get(`${CONFIG.storePrefix}thermoTemp_${location}`, CONFIG.contextStore);
const storedCal = flow.get(`${CONFIG.storePrefix}currentCal_${location}`, CONFIG.contextStore);
const targetTopic = flow.get(`${CONFIG.storePrefix}topicName_${location}`, CONFIG.contextStore);

if (!readings || Object.keys(readings).length === 0) return null;
if (CONFIG.debug) log(`--- Starting Calculation for ${location} ---`);

let totalWeightedTemp = 0;
let totalWeight = 0;
let validReadingsCount = 0;
let validReadings = {}; // To cleanup old entries

for (const topic in readings) {
    const r = readings[topic];
    const ageMinutes = (now - r.ts) / 60000;

    // @logic: Decay weight based on data freshness
    const timeWeight = getWeightForAge(ageMinutes);

    if (timeWeight > 0) {
        const finalWeight = r.baseWeight * timeWeight;
        totalWeightedTemp += r.temp * finalWeight;
        totalWeight += finalWeight;
        validReadingsCount++;
        validReadings[topic] = r; // Keep valid reading

        if (CONFIG.debug) log(` + Reading: ${topic} | Temp: ${r.temp} | Age: ${ageMinutes.toFixed(1)}m (x${timeWeight}) * Base(x${r.baseWeight}) = FinalWeight ${finalWeight.toFixed(2)}`);
    } else {
        if (CONFIG.debug) log(` - Pruning: ${topic} (Age: ${ageMinutes.toFixed(1)}m > Max)`);
    }
}

// 4b. STORE CLEANED READINGS (Garbage Collection)
flow.set(readingsKey, validReadings, CONFIG.contextStore);

if (validReadingsCount === 0) {
    if (CONFIG.debug) log("No valid (fresh) readings available.");
    return null;
}

const avgSensorTemp = totalWeightedTemp / totalWeight;

if (CONFIG.debug) log(`Results: AvgMsgTemp=${avgSensorTemp.toFixed(2)}, ThermoTemp=${storedThermoTemp}, CurrentCal=${storedCal}`);

// 4c. CALCULATE NEW CALIBRATION
// Formula: RealTemp = (RawInternal + Cal) => RawInternal = RealTemp - Cal
const rawInternal = storedThermoTemp - storedCal;
const newCalibrationUnrounded = avgSensorTemp - rawInternal;
const newCalibration = roundToStep(newCalibrationUnrounded, CONFIG.step);

if (CONFIG.debug) log(`Calc: RawInternal=${rawInternal} | NewCalUnrounded=${newCalibrationUnrounded.toFixed(2)} | FinalCal=${newCalibration}`);

// 5. UPDATE EXECUTION (Decision Gate)
if (newCalibration !== storedCal) {

    // 5a. COOLDOWN CHECK
    // @intent: Prioritize data freshness (Ingestion) over action. Action is blocked, but data was already saved in Step 3.
    const cooldownKey = `${CONFIG.storePrefix}cooldown_${location}`;
    const lastUpdateTime = flow.get(cooldownKey, CONFIG.contextStore) || 0;
    const COOLDOWN_MS = 5000;

    if ((now - lastUpdateTime) < COOLDOWN_MS) {
        if (CONFIG.debug) log(`[Info] Calibration needed (-&gt; ${newCalibration}) but skipping due to cooldown (${COOLDOWN_MS - (now - lastUpdateTime)}ms).`);
        return null;
    }

    // 5b. EXECUTE COMMAND
    node.warn(`[Action] ${location} | Calibrating: ${storedCal} -> ${newCalibration} (AvgSensor: ${avgSensorTemp.toFixed(2)}, Thermo: ${storedThermoTemp})`);

    msg.topic = `${targetTopic}/set`;
    msg.payload = {
        local_temperature_calibration: newCalibration
    };

    flow.set(`${CONFIG.storePrefix}currentCal_${location}`, newCalibration, CONFIG.contextStore);
    flow.set(cooldownKey, now, CONFIG.contextStore);

    return msg;
} else {
    if (CONFIG.debug) log("No change needed (Deviation < Step).");
    return null;
}
