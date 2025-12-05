# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
