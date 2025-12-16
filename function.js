/**
 * Thermostat Calibration Node (v3.0)
 * 
 * Refactored storage model:
 * - Per-location state: {thermostat, sensors, lastCal, lastCalTime}
 * - Triggers on BOTH sensor AND thermostat updates
 * - 60-min sensor timeout, linear time-weight decay
 * - Step: 0.01, hysteresis: 0.75×step
 */

// --- CONFIGURATION ---
const CONFIG = {
    debug: true,
    step: 0.01,
    hysteresisFactor: 0.75,
    storePrefix: 'tc_',
    contextStore: 'default',
    sensorTimeout: 60, // minutes
    cooldownMs: 5000,

    // Time weights: linear interpolation between these points
    timeWeights: [
        { age: 0, weight: 1.0 },
        { age: 5, weight: 1.0 },
        { age: 15, weight: 0.8 },
        { age: 30, weight: 0.5 },
        { age: 60, weight: 0.2 },
        { age: 61, weight: 0 }
    ],

    // Discovery: first match wins
    discovery: [
        { pattern: 'zigbee2mqtt/temp_(.*)_2', type: 'sensor', baseWeight: 0.5 },
        { pattern: 'zigbee2mqtt/temp_(.*)', type: 'sensor', baseWeight: 1.0 },
        { pattern: 'zigbee2mqtt/thermostat_(.*)', type: 'thermostat' }
    ]
};

// --- HELPERS ---
function log(m) { if (CONFIG.debug) node.warn(m); }

function getWeight(ageMin) {
    const pts = CONFIG.timeWeights;
    if (ageMin <= pts[0].age) return pts[0].weight;
    if (ageMin >= pts[pts.length - 1].age) return 0;
    for (let i = 0; i < pts.length - 1; i++) {
        if (ageMin <= pts[i + 1].age) {
            const t = (ageMin - pts[i].age) / (pts[i + 1].age - pts[i].age);
            return pts[i].weight + t * (pts[i + 1].weight - pts[i].weight);
        }
    }
    return 0;
}

function round(v, step) {
    return parseFloat((Math.round(v / step) * step).toFixed(2));
}

function identify(topic) {
    for (const r of CONFIG.discovery) {
        const m = topic.match(new RegExp(r.pattern));
        if (m) return { loc: m[1], type: r.type, weight: r.baseWeight || 1 };
    }
    return null;
}

function getState(loc) {
    const key = `${CONFIG.storePrefix}${loc}`;
    return flow.get(key, CONFIG.contextStore) || {
        thermostat: null, // {topic, temp, cal, ts}
        sensors: {},      // {topic: {temp, ts, weight}}
        lastCal: null,
        lastCalTime: 0
    };
}

function setState(loc, state) {
    flow.set(`${CONFIG.storePrefix}${loc}`, state, CONFIG.contextStore);
}

// --- MAIN ---
const now = msg.ts || Date.now();
const topic = msg.topic;

// Skip /set commands
if (topic?.endsWith('/set')) return null;

const dev = identify(topic);
if (!dev) return null;

const loc = dev.loc;
const state = getState(loc);

// --- INGESTION ---
let isSensorUpdate = false;

if (dev.type === 'sensor') {
    const temp = msg.payload?.temperature;
    if (typeof temp !== 'number') return null;

    state.sensors[topic] = { temp, ts: now, weight: dev.weight };
    setState(loc, state);
    log(`[${loc}] Sensor ${topic.split('/').pop()}: ${temp}°C`);
    isSensorUpdate = true;

} else if (dev.type === 'thermostat') {
    const temp = msg.payload?.local_temperature;
    const cal = msg.payload?.local_temperature_calibration ?? 0;
    if (temp === undefined) return null;

    state.thermostat = { topic, temp, cal, ts: now };
    setState(loc, state);
    log(`[${loc}] Thermo stored: cal=${cal}`);
    // Thermostat update only stores state, does NOT trigger calculation
    return null;
}

// --- CALCULATION (only on sensor update) ---
if (!isSensorUpdate) return null;

// Need thermostat data to calculate
if (!state.thermostat) {
    log(`[${loc}] Waiting for thermostat`);
    return null;
}

// Cooldown check
if (now - state.lastCalTime < CONFIG.cooldownMs) {
    log(`[${loc}] Cooldown active`);
    return null;
}

// Aggregate sensor readings
let sumWT = 0, sumW = 0, validCount = 0;
const validSensors = {};

for (const [t, s] of Object.entries(state.sensors)) {
    const age = (now - s.ts) / 60000;
    const tw = getWeight(age);
    if (tw > 0) {
        const fw = s.weight * tw;
        sumWT += s.temp * fw;
        sumW += fw;
        validCount++;
        validSensors[t] = s;
    }
}

// Update sensors (prune old)
state.sensors = validSensors;
setState(loc, state);

if (validCount === 0) {
    log(`[${loc}] No valid sensors`);
    return null;
}

const avgTemp = sumWT / sumW;
const thermo = state.thermostat;
const rawInternal = thermo.temp - thermo.cal;
const newCalExact = avgTemp - rawInternal;
const newCalRounded = round(newCalExact, CONFIG.step);

log(`[${loc}] Avg=${avgTemp.toFixed(2)} Raw=${rawInternal.toFixed(2)} NewCal=${newCalExact.toFixed(3)}→${newCalRounded}`);

// Decision gate
const deviation = Math.abs(newCalExact - thermo.cal);
const threshold = CONFIG.step * CONFIG.hysteresisFactor;

if (newCalRounded === thermo.cal) {
    log(`[${loc}] No change (same)`);
    return null;
}

if (deviation <= threshold) {
    log(`[${loc}] No change (dev ${deviation.toFixed(3)} < ${threshold.toFixed(3)})`);
    return null;
}

// Action
state.lastCal = newCalRounded;
state.lastCalTime = now;
setState(loc, state);

log(`[${loc}] ACTION: ${thermo.cal}→${newCalRounded}`);

msg.topic = `${thermo.topic}/set`;
msg.payload = { local_temperature_calibration: newCalRounded };
return msg;
