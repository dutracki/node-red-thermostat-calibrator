# Self-Hosted Map Options (WebP Support)

**Date**: 2025-12-11
**Status**: Final
**Workflow**: `/research_subject`

---

## tileserver-gl (Recommended)

### Overview
- **GitHub**: https://github.com/maptiler/tileserver-gl
- **Docker Image**: `maptiler/tileserver-gl`
- **License**: BSD-2-Clause
- **WebP Support**: ✅ Yes (configurable quality)
- **Last Update**: Active development

### Key Features
- Serves both **vector tiles** (MVT) and **raster tiles** (PNG/JPEG/WebP)
- Supports **MBTiles**, **PMTiles**, and **XYZ** sources
- Built-in **Mapbox GL styles** support
- **CORS** headers included
- **TileJSON** and **WMTS** endpoints
- Lightweight (~200MB Docker image)

---

## Data Sources

### Option 1: MapTiler (Pre-built MBTiles)
- **URL**: https://data.maptiler.com/downloads/planet/
- **Poland**: ~1.5GB MBTiles
- **Includes**: Roads, buildings, landuse, POIs
- **License**: Free for self-hosting (attribution required)

### Option 2: Geofabrik (OSM PBF → Generate MBTiles)
- **URL**: https://download.geofabrik.de/europe/poland.html
- **Poland PBF**: ~1.8GB
- **Requires**: OpenMapTiles tools to convert

### Option 3: OpenFreeMap (Weekly Planet)
- **URL**: https://openfreemap.org/downloads/
- **Format**: MBTiles
- **Updates**: Weekly

---

## Docker Setup

### docker-compose.yml
```yaml
services:
  tileserver:
    image: maptiler/tileserver-gl:latest
    container_name: tileserver-gl
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    environment:
      - NODE_ENV=production
    command: --config /data/config.json
```

### config.json
```json
{
  "options": {
    "paths": {
      "root": "/data",
      "styles": "/data/styles",
      "fonts": "/data/fonts",
      "sprites": "/data/sprites",
      "mbtiles": "/data"
    },
    "formatOptions": {
      "webp": { "quality": 80 },
      "png": {},
      "jpeg": { "quality": 80 }
    },
    "maxAge": 31536000
  },
  "data": {
    "poland": {
      "mbtiles": "poland.mbtiles"
    }
  },
  "styles": {
    "osm-bright": {
      "style": "styles/osm-bright/style.json",
      "tilejson": {
        "bounds": [14.1, 49.0, 24.2, 54.9]
      }
    }
  }
}
```

---

## WebP Configuration

### Enable WebP Output
WebP is served automatically when requested via URL:
```
/styles/{style}/{z}/{x}/{y}.webp
/styles/{style}/{z}/{x}/{y}@2x.webp  # Retina
```

### Quality Settings
```json
"formatOptions": {
  "webp": {
    "quality": 80,        // 0-100, higher = better quality
    "lossless": false,    // true for lossless compression
    "nearLossless": false // true for near-lossless
  }
}
```

### Leaflet Integration
```javascript
L.tileLayer('https://tiles.yourserver.com/styles/osm-bright/{z}/{x}/{y}.webp', {
  maxZoom: 19,
  tileSize: 256,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

---

## Production Best Practices

### 1. Caching
- Set `maxAge` in config.json for Cache-Control headers
- Use Nginx/Cloudflare as reverse proxy for additional caching
- Recommended: 1 year for tiles (`31536000`)

### 2. Performance
- Use **@2x tiles** only when needed (doubles requests)
- Set appropriate **maxZoom** to avoid generating too many tiles
- Consider **pre-rendering** popular tiles

### 3. Security
- Run container as non-root user
- Limit exposed ports
- Use HTTPS via reverse proxy

### 4. Monitoring
- Container exposes `/health` endpoint
- Monitor disk usage (MBTiles can be large)

---

## File Structure
```
data/
├── config.json
├── poland.mbtiles
├── fonts/
│   └── Open Sans Regular/
├── sprites/
│   ├── osm-bright.json
│   └── osm-bright.png
└── styles/
    └── osm-bright/
        └── style.json
```

---

## Constraints for Code

1. **MBTiles file required** - Must download before deployment
2. **Fonts/Sprites needed** - For custom styles
3. **Container needs ~2-4GB RAM** for large datasets
4. **Disk**: Poland MBTiles ~1.5GB, Europe ~15GB
5. **Leaflet compatible** - Just change tile URL

---

## Quick Start Commands

```bash
# 1. Create data directory
mkdir -p data/styles data/fonts data/sprites

# 2. Download Poland MBTiles (from MapTiler after signup)
# Or generate from Geofabrik PBF

# 3. Start tileserver
docker compose up -d

# 4. Access
# Viewer: http://localhost:8080
# TileJSON: http://localhost:8080/data/poland.json
# Tiles: http://localhost:8080/styles/osm-bright/{z}/{x}/{y}.webp
```
