const fs = require('fs');

// 1. Read the Node-RED function node script
const functionBody = fs.readFileSync('function.js', 'utf8');

// 2. Mock Node-RED Environment
const mockFlowData = {};
const flow = {
    get: (key, store) => mockFlowData[key],
    set: (key, value, store) => {
        // clone to simulate persistence
        mockFlowData[key] = JSON.parse(JSON.stringify(value));
    }
};

const node = {
    warn: (msg) => console.log(`[Node WARN] ${msg}`),
    error: (msg) => console.error(`[Node ERROR] ${msg}`)
};

// 3. Create Executor
const runFunction = new Function('msg', 'flow', 'node', functionBody);

// 4. Test Harness
function runTest(name, scenarioFn) {
    console.log(`\n=== TEST: ${name} ===`);
    try {
        scenarioFn();
        console.log('✅ PASS');
    } catch (e) {
        console.error('❌ FAIL', e);
        process.exit(1);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
}

// 5. Execute Tests
runTest("Identify Devices (Regex)", () => {
    // Sensor 1 (Primary)
    let m1 = { topic: 'zigbee2mqtt/temp_office', payload: { temperature: 20 } };
    runFunction(m1, flow, node);
    let readings = flow.get('thermoCal_sensorReadings_office');
    assert(readings['zigbee2mqtt/temp_office'].baseWeight === 1.0, "Primary sensor weight should be 1.0");

    // Sensor 2 (Secondary)
    let m2 = { topic: 'zigbee2mqtt/temp_office_2', payload: { temperature: 22 } };
    runFunction(m2, flow, node);
    readings = flow.get('thermoCal_sensorReadings_office');
    assert(readings['zigbee2mqtt/temp_office_2'].baseWeight === 0.5, "Secondary sensor weight should be 0.5");
});

runTest("Weighted Average Calculation", () => {
    let thermoMsg = {
        topic: 'zigbee2mqtt/thermostat_office',
        payload: {
            local_temperature: 19,
            local_temperature_calibration: 0
        }
    };

    flow.set('thermoCal_cooldown_office', 0);

    const output = runFunction(thermoMsg, flow, node);

    // Avg = 20.666... (Ref previous test logic)
    // Diff = 1.666... -> 1.6
    assert(output !== null, "Should return a message");
    assert(output.payload.local_temperature_calibration === 1.6, `Expected 1.6, got ${output.payload.local_temperature_calibration}`);
});

runTest("Time Decay Logic", () => {
    let readings = flow.get('thermoCal_sensorReadings_office');
    const now = Date.now();

    readings['zigbee2mqtt/temp_office'].ts = now - (10 * 60 * 1000); // 10 mins old
    readings['zigbee2mqtt/temp_office_2'].ts = now - (1 * 60 * 1000); // 1 min old

    flow.set('thermoCal_sensorReadings_office', readings);
    flow.set('thermoCal_cooldown_office', 0);

    let thermoMsg = {
        topic: 'zigbee2mqtt/thermostat_office',
        payload: { local_temperature: 19, local_temperature_calibration: 0 }
    };

    const output = runFunction(thermoMsg, flow, node);
    // Avg = 20.769... -> Cal 1.8
    assert(output.payload.local_temperature_calibration === 1.8, `Expected 1.8, got ${output.payload.local_temperature_calibration}`);
});

runTest("Debug Flag Verification", () => {
    // 1. Enable Debug by modifying the source code string on the fly
    const debugFunctionBody = functionBody.replace('debug: false', 'debug: true');
    const runDebugFunction = new Function('msg', 'flow', 'node', debugFunctionBody);

    // Capture logs
    const logs = [];
    const debugNode = {
        warn: (msg) => logs.push(msg),
        error: (msg) => console.error(msg)
    };

    // 2. Run a simple event
    let msg = { topic: 'zigbee2mqtt/temp_office', payload: { temperature: 25 } };
    runDebugFunction(msg, flow, debugNode);

    // 3. Assert logs exist and contain [DEBUG]
    const hasDebugLog = logs.some(l => l.includes('[DEBUG]'));
    assert(hasDebugLog, "Should produce [DEBUG] logs when enabled");

    // Check specific log
    const hasIncoming = logs.some(l => l.includes('Incoming: zigbee2mqtt/temp_office'));
    assert(hasIncoming, "Should log incoming message");

    console.log("Captured Logs Sample:", logs[0]);
});

runTest("Cooldown Data Ingestion Fix", () => {
    // 1. Set Cooldown Active (Last update = Now)
    const now = Date.now();
    flow.set('thermoCal_cooldown_office', now);

    // 2. Clear old sensor data
    flow.set('thermoCal_sensorReadings_office', {});

    // 3. Send Sensor Data (during cooldown period)
    let msg = {
        topic: 'zigbee2mqtt/temp_office',
        payload: { temperature: 30 },
        ts: now + 100 // 100ms later
    };

    runFunction(msg, flow, node);

    // 4. Assert Data WAS Ingested
    let readings = flow.get('thermoCal_sensorReadings_office');
    assert(readings['zigbee2mqtt/temp_office'] !== undefined, "Data should be ingested even during cooldown");
    assert(readings['zigbee2mqtt/temp_office'].temp === 30, "Temperature should be stored");
});

runTest("Feedback Loop (Echo) Suppression", () => {
    // Standard Config
    let testFnBody = functionBody; // Use default Logic

    const runTestFn = new Function('msg', 'flow', 'node', testFnBody);

    // 1. Setup Initial State
    const locId = 'office';
    const now = Date.now();
    flow.set(`thermoCal_cooldown_${locId}`, now); // Just acted!
    flow.set(`thermoCal_thermoTemp_${locId}`, 20);
    flow.set(`thermoCal_topicName_${locId}`, `zigbee2mqtt/thermostat_${locId}`);

    // 2. Incoming "Echo" message (from the action we just did)
    // It comes 100ms after the action
    const msg = {
        topic: `zigbee2mqtt/thermostat_${locId}`,
        payload: { local_temperature: 20, local_temperature_calibration: 1 }, // Updated cal
        ts: now + 100
    };

    // 3. Execution
    const res = runTestFn(msg, flow, node);

    // 4. Assertion
    assert(res === null, "Echo message should be suppressed (return null)");

    // Check that state WAS updated despite suppression
    const storedCal = flow.get(`thermoCal_currentCal_${locId}`);
    assert(storedCal === 1, "Thermostat state should be updated even if calc is suppressed");
});
