# 📦 Publishing to GitHub

Follow these steps to publish your repository:

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `node-red-thermostat-calibrator`
   - **Description**: `Automatic Zigbee thermostat calibration using external sensors for Node-RED`
   - **Public** ✅
   - **Do NOT** initialize with README, .gitignore, or license (we already have these)
3. Click **Create repository**

## Step 2: Connect Local Repository to GitHub

Replace `YOUR_USERNAME` with your GitHub username:

```bash
cd /home/grouppe/node-red-thermostat-calibrator
git remote add origin https://github.com/YOUR_USERNAME/node-red-thermostat-calibrator.git
git branch -M main
git push -u origin main
```

## Step 3: Configure Repository Settings

### Add Topics (Tags)

Go to your repository → **About** (gear icon) → Add topics:
- `node-red`
- `zigbee2mqtt`
- `thermostat`
- `home-automation`
- `smart-home`
- `calibration`
- `mqtt`
- `iot`

### Enable Issues

Settings → Features → ✅ Issues

### Add Description

```
Automatic Zigbee thermostat calibration using external sensors for Node-RED. Supports 0.2°C precision with dual naming strategies.
```

### Add Website (Optional)

If you have a demo or blog post, add it here.

## Step 4: Create First Release

1. Go to **Releases** → **Create a new release**
2. Tag version: `v1.0.0`
3. Release title: `v1.0.0 - Initial Release`
4. Description:
```markdown
## 🎉 Initial Release

First stable version of the Node-RED Thermostat Calibrator!

### Features
- ✅ Automatic thermostat calibration using external sensors
- ✅ 0.2°C precision support
- ✅ Dual naming strategy (auto-prefix + custom mapping)
- ✅ Message deduplication
- ✅ Floating point safety

### Supported Thermostats
- Tuya TRVs
- Danfoss Ally
- Moes HY368/HY369
- Eurotronic Spirit
- And many more!

### Installation
See [README.md](README.md) for installation instructions.
```
5. Click **Publish release**

## Step 5: Star Your Own Repository

Give yourself a star ⭐ to get things started!

## Step 6: Share

Share your repository:
- Node-RED forums: https://discourse.nodered.org/
- Reddit: r/homeassistant, r/nodered
- Home Assistant Community
- Twitter/X with hashtags: #NodeRED #HomeAutomation #Zigbee2MQTT

---

## Maintaining Your Repository

### Responding to Issues

- Be friendly and helpful
- Ask for logs and configuration
- Test suggestions before posting

### Accepting Pull Requests

1. Review the code
2. Test locally if possible
3. Merge with **squash and merge** (cleaner history)
4. Thank the contributor!

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- **v1.0.1**: Bug fixes (PATCH)
- **v1.1.0**: New features, backward compatible (MINOR)
- **v2.0.0**: Breaking changes (MAJOR)

---

## Optional: Add CI/CD

Consider adding automated checks:
- YAML/JSON linting
- Documentation link checks
- Automated issue labeling

---

**Good luck with your open-source project! 🚀**
