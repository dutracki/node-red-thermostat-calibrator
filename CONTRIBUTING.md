# Contributing to Node-RED Thermostat Calibrator

First off, thank you for considering contributing! 🎉

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**:
  - Node-RED version
  - Node.js version
  - Zigbee2MQTT version (if applicable)
  - Device models (sensor & thermostat)
- **Configuration**: Your `CONFIG` object (remove sensitive data)
- **Logs**: Relevant debug output from Node-RED

### 💡 Suggesting Features

Feature suggestions are welcome! Please provide:

- **Use Case**: Why is this feature useful?
- **Proposed Solution**: How should it work?
- **Alternatives**: Alternative solutions you've considered
- **Additional Context**: Screenshots, diagrams, code examples

### 🔧 Pull Requests

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** thoroughly with your own setup
5. **Document** your changes (update README if needed)
6. **Commit** with clear messages (`git commit -m 'Add support for X'`)
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

#### Code Style

- Use **clear variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**
- Follow **existing code style**

#### Testing

Since this is a Node-RED function, testing involves:

1. Deploying the function in a real Node-RED instance
2. Testing with actual MQTT messages or simulation
3. Verifying calibration calculations
4. Checking edge cases (missing data, malformed messages)

### 📚 Documentation

Improvements to documentation are always welcome:

- Fix typos or unclear explanations
- Add examples for different setups
- Create tutorials or guides
- Translate to other languages

## Development Setup

### Prerequisites

- Node-RED installed
- MQTT broker (Mosquitto recommended for testing)
- (Optional) Zigbee2MQTT with test devices

### Local Testing

1. Copy `function.js` into a Node-RED function node
2. Set up test MQTT messages with `mqtt in` nodes
3. Use `debug` nodes to monitor output
4. Check Node-RED logs for `node.warn` messages

### Simulating MQTT Messages

Use `inject` nodes with manual payloads:

**Sensor Message:**
```json
{
    "topic": "zigbee2mqtt/temp_kitchen",
    "payload": {
        "temperature": 21.5,
        "last_seen": 1733395200000
    }
}
```

**Thermostat Message:**
```json
{
    "topic": "zigbee2mqtt/thermostat_kitchen",
    "payload": {
        "local_temperature": 22.0,
        "local_temperature_calibration": 0.4,
        "last_seen": 1733395205000
    }
}
```

## Community

- Be respectful and constructive
- Help others in issues and discussions
- Share your setups and configurations

## Questions?

Feel free to open an issue with the `question` label!

---

Thank you for contributing! 🙏
