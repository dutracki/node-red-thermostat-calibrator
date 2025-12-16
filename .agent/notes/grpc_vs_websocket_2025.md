# gRPC-Web vs WebSocket: SvelteKit + Go

**Date**: 2025-12-11
**Status**: Final
**Workflow**: `/research_subject`

---

## Quick Comparison

| Feature | WebSocket | gRPC-Web |
|---------|-----------|----------|
| Browser Support | ✅ Native (99%+) | ❌ Requires proxy (Envoy) |
| Complexity | Low | High |
| Data Format | JSON/Binary | Protocol Buffers |
| Streaming | Full-duplex | Server-side only* |
| Type Safety | Manual | ✅ Auto-generated |
| Latency | ~1-5ms overhead | ~0.5-2ms (binary) |
| Payload Size | JSON: larger | Protobuf: 3-10x smaller |
| Best For | Chat, notifications, games | Microservices, APIs |

*gRPC-Web limited client streaming in browsers

---

## Performance Comparison

### Latency

| Metric | WebSocket | gRPC-Web |
|--------|-----------|----------|
| Connection Setup | ~100ms (1 handshake) | ~150ms (proxy + HTTP/2) |
| Message Latency | 1-5ms | 0.5-2ms |
| Reconnection | Fast (single TCP) | Slower (proxy layer) |

### Throughput

| Scenario | WebSocket | gRPC-Web |
|----------|-----------|----------|
| Small messages (<1KB) | ~50k msg/sec | ~80k msg/sec |
| Large payloads (>10KB) | Limited by JSON | 3-10x faster (binary) |
| Concurrent streams | 1 per connection | Multiplexed (HTTP/2) |

### CPU & Memory Resources (Go, 10k connections)

| Metric | WebSocket | gRPC |
|--------|-----------|------|
| Memory per conn | 2-8 KB | 2-4 KB |
| 10k connections | ~50-80 MB | ~30-50 MB |
| CPU idle (10k) | ~1-2% | ~1-2% |
| CPU broadcast (10k) | ~15-25% | ~10-20% |
| Goroutines | 1 per conn | Multiplexed |

**Key Resource Findings:**
- **WebSocket**: ~2-8KB per connection (includes read/write buffers)
- **gRPC**: More efficient due to HTTP/2 multiplexing + Protobuf
- **Go handles 10k+ connections** easily with goroutines (I/O-bound)
- **Naive gRPC streaming** (1 goroutine per stream) can cause CPU spikes
- **Use connection pooling** and broker patterns for >10k connections

### Bandwidth
- **WebSocket/JSON**: 100% baseline
- **gRPC/Protobuf**: 30-70% reduction (binary serialization)

---

## Security Comparison

| Security Feature | WebSocket | gRPC-Web |
|------------------|-----------|----------|
| Transport Encryption | ✅ WSS (TLS) | ✅ TLS (required) |
| Built-in Auth | ❌ Manual impl | ✅ Interceptors |
| Origin Validation | ⚠️ Manual | ✅ Envoy handles |
| mTLS Support | ⚠️ Custom | ✅ Native |
| CORS | Manual headers | Envoy config |

### WebSocket Security
```go
// Go: Validate origin
upgrader := websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        return origin == "https://grouppe.digitaly.site"
    },
}
```

### gRPC-Web Security
```yaml
# Envoy: mTLS config
transport_socket:
  name: envoy.transport_sockets.tls
  typed_config:
    require_client_certificate: true
```

### Auth Patterns
- **WebSocket**: Send JWT after connection, validate in handler
- **gRPC**: Use interceptors, token in metadata

---

## Reliability Comparison

| Feature | WebSocket | gRPC-Web |
|---------|-----------|----------|
| Auto-reconnect | ❌ Manual impl | ❌ Manual impl |
| Message Delivery | At-most-once | At-most-once |
| Connection Lifespan | Long-lived | Per-request or stream |
| Load Balancing | ⚠️ Sticky sessions | ✅ Per-request |
| Horizontal Scaling | ⚠️ Needs Pub/Sub | ✅ Easier |

### WebSocket Reliability Patterns

**Heartbeat/Ping-Pong:**
```go
// Go: Keep connection alive
ticker := time.NewTicker(30 * time.Second)
for range ticker.C {
    conn.WriteMessage(websocket.PingMessage, nil)
}
```

**Reconnection with Backoff:**
```typescript
// SvelteKit: Exponential backoff
let retries = 0;
function connect() {
    ws = new WebSocket(url);
    ws.onclose = () => {
        setTimeout(connect, Math.min(1000 * 2**retries++, 30000));
    };
}
```

**Redis Pub/Sub for Scaling:**
```go
// Go: Horizontal scaling
pubsub := redis.Subscribe("events")
for msg := range pubsub.Channel() {
    broadcast(msg.Payload)
}
```

### gRPC Reliability Patterns

**Retry with Exponential Backoff:**
```go
// Go: gRPC retry config
retryPolicy := grpc.WithDefaultServiceConfig(`{
    "retryPolicy": {
        "maxAttempts": 4,
        "initialBackoff": "0.1s",
        "maxBackoff": "1s"
    }
}`)
```

---

## Recommendation for grouppe

### Use **WebSocket** ✅

**Reasons:**
1. **Existing Chi backend** - Easy to add `gorilla/websocket`
2. **Real-time features** - Chat, notifications, live updates
3. **No proxy needed** - Simpler infrastructure
4. **Full-duplex** - Both client→server and server→client

### When to Consider gRPC

Switch to gRPC-Web if:
- Team grows (>5 devs) and type safety becomes critical
- Building many microservices
- Bandwidth efficiency critical (mobile users)

---

## Constraints for Code

1. **WebSocket** = simpler, faster to implement
2. **Always use WSS** (TLS) in production
3. **Validate Origin** header to prevent CSWSH attacks
4. **Implement heartbeat** (30s interval recommended)
5. **Use Redis Pub/Sub** for horizontal scaling
6. **Exponential backoff** for reconnection (max 30s)

---

## Go Implementation Checklist

- [ ] Add `gorilla/websocket` dependency
- [ ] Create `/ws` endpoint in Chi router
- [ ] Validate Origin header
- [ ] Implement ping/pong heartbeat
- [ ] Add connection manager for broadcasting
- [ ] Redis Pub/Sub for multiple instances
- [ ] Graceful shutdown handling
