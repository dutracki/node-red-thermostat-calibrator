# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.2] - 2025-12-16

### Fixed
- **Calculation Stability**: Replaced discrete time-weight thresholds with **linear interpolation**. Previously, when sensor age crossed threshold boundaries (5m, 14m, 22m, 30m), weights jumped abruptly (e.g., 0.4 → 0.1), causing calibration instability between rapid thermostat updates. Now weights transition smoothly (e.g., 0.4050 → 0.3962).

## [2.2.1] - 2025-12-15

### Added
- **Echo Suppression**: Implemented early cooldown exit to prevent feedback loops where the thermostat's own calibration confirmation triggers a re-calculation.
- **AI-Ready Documentation**: Refactored `function.js` with strict JSDoc, `@intent` comments, and explicit context for better parsing by AI agents.

### Changed
- **Config Defaults**: Updated discovery rules to prioritize matched Zigbee2MQTT topics.
- **Optimization**: Removed complex rate limiting (throttling) in favor of simple Echo Suppression to reduce overhead.

## [2.1.1] - 2025-12-15

### Fixed
- **Cooldown Logic**: Moved cooldown check to the "Action" phase. Sensor data is now correctly ingested even during the 5-second cooldown period, preventing data loss when a sensor updates immediately after a calibration event.

## [2.1.0] - 2025-12-15

### Added
- **Debug Mode**: Added `debug: true` flag to `CONFIG`. When enabled, it logs detailed info about incoming messages, regex matching, weights, and calculation steps to the Node-RED debug panel.

---

## [2.0.0] - 2025-12-15

### Added
- **Multi-Sensor Aggregation**: Supports calculating weighted average from multiple sensors in a single room.
- **Regex Discovery**: New `discovery` configuration array allowing powerful regex matching for device identification.
- **Device Weighting**: Configurable `baseWeight` per discovery rule (e.g., secondary sensors count for 50%).
- **Time-Based Weighting**: Sensor readings decay in importance over time (Fresh/Normal/Old/Very Old). Readings >30 mins are ignored.

### Changed
- **BREAKING**: Replaced `autoPrefixes` and `customMap` with the unified `discovery` rules array. Users must migrate their configuration.
- Internal state storage for sensors now uses an array of readings (`sensorReadings_[location]`) instead of a single value.

### Fixed
- Improved type safety for floating point calculations in strict mode.

---

## [1.0.1] - 2025-12-05

### Fixed
- **CRITICAL**: Fixed infinite loop causing rapid calibration updates
  - Added filtering for `/set` command topics to prevent processing outgoing commands
  - Implemented 5-second cooldown timer between calibration updates per location
  - Improved loop prevention with timestamp-based cooldown mechanism
  - Thermostats now properly stabilize instead of continuously recalibrating

### Details
The infinite loop occurred because:
1. Calibration commands triggered immediate thermostat state broadcasts
2. The function processed its own outgoing `/set` commands
3. No cooldown allowed the loop to continue indefinitely

**Impact**: Users running v1.0.0 experienced continuous MQTT traffic and never-converging calibration values.

---

## [1.0.0] - 2025-12-05

### Added
- Initial release
- Automatic thermostat calibration using external sensors
- Support for 0.2°C calibration steps
- Dual naming strategy (automatic prefixes + custom mapping)
- Message deduplication using `last_seen` timestamps
- Floating point error prevention
- Smart device type detection from payload structure
- Support for mixed topic naming conventions

### Features
- Configurable calibration steps (0.1, 0.2, 0.5, 1.0°C)
- Persistent or RAM-based context storage
- Compatible with Zigbee2MQTT and similar MQTT structures
- Works with Tuya, Danfoss, Moes, Eurotronic thermostats

---

## [Unreleased]

### Planned
- Configuration UI panel
- Prometheus metrics export
- Home Assistant MQTT discovery support
- Multi-sensor averaging built-in
- Temperature offset configuration per location
