
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
        // Example: "sensor.temp_office_2" -> Location: "office", Weight: 0.5
        {
            pattern: 'sensor\\.temp_(.*)_2',
            type: 'sensor',
            baseWeight: 0.5
        },
        // Example: "sensor.temp_office" -> Location: "office", Weight: 1.0
        {
            pattern: 'sensor\\.temp_(.*)',
            type: 'sensor',
            baseWeight: 1.0
        },
        // Thermostat matching
        {
            pattern: 'zigbee2mqtt/thermostat_(.*)',
            type: 'thermostat'
        },
        // Legacy/Generic fallback (optional)
        {
            pattern: 'zigbee2mqtt/temp_(.*)',
            type: 'sensor',
            baseWeight: 1.0
        }
    ]
};

// --- HELPER FUNCTIONS ---

function log(msg) {
    if (CONFIG.debug) {
        node.warn(`[DEBUG] ${msg}`);
    }
}

// Round to specific step (0.2) and fix floating point errors
function roundToStep(value, step) {
    const inverse = 1.0 / step;
    const rounded = Math.round(value * inverse) / inverse;
    return parseFloat(rounded.toFixed(1));
}

// identifyDevice: Returns { id: string, type: 'sensor'|'thermostat', baseWeight: number } or null
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

// getWeightForAge: Returns weight based on age in minutes
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

// 1. IDENTIFY CONTEXT
const deviceContext = identifyDevice(msg.topic);
if (!deviceContext) {
    return null;
}

const location = deviceContext.id;
const lastSeenValue = msg.payload?.last_seen || null;
const now = msg.ts || Date.now(); // Global definition

// 2. DEDUPLICATION
if (lastSeenValue) {
    const lastSeenKey = `${CONFIG.storePrefix}lastSeen_${msg.topic}`;
    const previousLastSeen = flow.get(lastSeenKey, CONFIG.contextStore);
    if (previousLastSeen === lastSeenValue) {
        if (CONFIG.debug) log(`Duplicate message detected (last_seen: ${lastSeenValue})`);
        return null;
    }
    flow.set(lastSeenKey, lastSeenValue, CONFIG.contextStore);
}

// 3. DATA INGESTION
let isSensorUpdate = false;
let isThermostatUpdate = false;

if (msg.payload.hasOwnProperty('local_temperature')) {
    // --> THERMOSTAT
    const localTemp = msg.payload.local_temperature;
    const currentCal = msg.payload.local_temperature_calibration;

    if (typeof localTemp === 'number') {
        if (CONFIG.debug) log(`Updating Thermostat Setup for '${location}': Temp=${localTemp}, Cal=${currentCal}`);

        flow.set(`${CONFIG.storePrefix}thermoTemp_${location}`, localTemp, CONFIG.contextStore);
        flow.set(`${CONFIG.storePrefix}currentCal_${location}`, currentCal || 0, CONFIG.contextStore);
        flow.set(`${CONFIG.storePrefix}topicName_${location}`, msg.topic, CONFIG.contextStore);
        isThermostatUpdate = true;
    }

} else if (msg.payload.hasOwnProperty('temperature')) {
    // --> SENSOR (Store in Array)
    const temp = msg.payload.temperature;

    if (typeof temp === 'number') {
        // Fetch existing readings object: { "topic": { temp, ts, weight } }
        let readings = flow.get(`${CONFIG.storePrefix}sensorReadings_${location}`, CONFIG.contextStore) || {};

        const oldReading = readings[msg.topic];
        readings[msg.topic] = {
            temp: temp,
            ts: now,
            baseWeight: deviceContext.baseWeight
        };

        if (CONFIG.debug) {
            const change = oldReading ? `(was ${oldReading.temp})` : '(new)';
            log(`Sensor Update for '${location}': ${msg.topic} = ${temp} ${change} | Weight: ${deviceContext.baseWeight}`);
        }

        flow.set(`${CONFIG.storePrefix}sensorReadings_${location}`, readings, CONFIG.contextStore);
        isSensorUpdate = true;
    }
}

// 4. CALIBRATION CALCULATION
const storedThermoTemp = flow.get(`${CONFIG.storePrefix}thermoTemp_${location}`, CONFIG.contextStore);
const storedCal = flow.get(`${CONFIG.storePrefix}currentCal_${location}`, CONFIG.contextStore) || 0;
const targetTopic = flow.get(`${CONFIG.storePrefix}topicName_${location}`, CONFIG.contextStore);
const sensorReadings = flow.get(`${CONFIG.storePrefix}sensorReadings_${location}`, CONFIG.contextStore) || {};

// We need Thermostat Temp and Topic
if (typeof storedThermoTemp === 'number' && targetTopic) {

    // 4a. CALCULATE WEIGHTED AVERAGE SENSOR TEMP
    let totalWeightedTemp = 0;
    let totalWeight = 0;
    let validReadingsCount = 0;
    let validReadings = {}; // To cleanup old entries

    if (CONFIG.debug) log(`--- Starting Calculation for ${location} ---`);

    for (const [topic, data] of Object.entries(sensorReadings)) {
        const ageMinutes = (now - data.ts) / 60000;
        const timeWeight = getWeightForAge(ageMinutes);

        if (timeWeight > 0) {
            const finalWeight = data.baseWeight * timeWeight;
            totalWeightedTemp += data.temp * finalWeight;
            totalWeight += finalWeight;
            validReadingsCount++;
            validReadings[topic] = data; // Keep valid reading

            if (CONFIG.debug) log(` + Reading: ${topic} | Temp: ${data.temp} | Age: ${ageMinutes.toFixed(1)}m (x${timeWeight}) * Base(x${data.baseWeight}) = FinalWeight ${finalWeight.toFixed(2)}`);
        } else {
            if (CONFIG.debug) log(` - Dropping Expired Reading: ${topic} (Age: ${ageMinutes.toFixed(1)}m)`);
        }
    }

    // Update storage with only valid readings (cleanup)
    flow.set(`${CONFIG.storePrefix}sensorReadings_${location}`, validReadings, CONFIG.contextStore);

    if (validReadingsCount > 0 && totalWeight > 0) {
        const avgSensorTemp = totalWeightedTemp / totalWeight;

        // 4b. STANDARD CALIBRATION LOGIC
        const rawThermostatTemp = storedThermoTemp - storedCal;
        const calculatedCalibration = avgSensorTemp - rawThermostatTemp;
        const newCalibration = roundToStep(calculatedCalibration, CONFIG.step);

        if (CONFIG.debug) {
            log(`Results: AvgMsgTemp=${avgSensorTemp.toFixed(2)}, ThermoTemp=${storedThermoTemp}, CurrentCal=${storedCal}`);
            log(`Calc: RawInternal=${rawThermostatTemp} | NewCalUnrounded=${calculatedCalibration.toFixed(2)} | FinalCal=${newCalibration}`);
        }

        // 5. UPDATE EXECUTION
        if (newCalibration !== storedCal) {

            // 1.5 CHECK COOLDOWN (Global per location)
            // NOTE: Cooldown check moved to step 5 to allow data ingestion
            const cooldownKey = `${CONFIG.storePrefix}cooldown_${location}`;
            const lastUpdateTime = flow.get(cooldownKey, CONFIG.contextStore) || 0;
            const COOLDOWN_MS = 5000;

            if ((now - lastUpdateTime) < COOLDOWN_MS) {
                if (CONFIG.debug) log(`[Info] Calibration needed (-&gt; ${newCalibration}) but skipping due to cooldown (${COOLDOWN_MS - (now - lastUpdateTime)}ms).`);
                return null;
            }

            node.warn(`[Action] ${location} | Calibrating: ${storedCal} -> ${newCalibration} (AvgSensor: ${avgSensorTemp.toFixed(2)}, Thermo: ${storedThermoTemp})`);

            msg.topic = `${targetTopic}/set`;
            msg.payload = {
                local_temperature_calibration: newCalibration
            };

            flow.set(`${CONFIG.storePrefix}currentCal_${location}`, newCalibration, CONFIG.contextStore);
            flow.set(cooldownKey, now, CONFIG.contextStore);

            return msg;
        } else {
            if (CONFIG.debug) log(`No change needed (Deviation < Step).`);
        }
    } else {
        if (CONFIG.debug) log(`No valid sensor readings available for ${location}.`);
    }
} else {
    if (CONFIG.debug && !targetTopic) log(`Waiting for first thermostat update to know target topic for ${location}.`);
}

return null;
