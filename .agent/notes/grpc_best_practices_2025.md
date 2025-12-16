# gRPC Best Practices: SvelteKit + Go

**Date**: 2025-12-11
**Status**: Final
**Workflow**: `/research_subject`
**Project Context**: grouppe - Event platform with SvelteKit frontend + Go backend

---

## Quick Reference

| Category | Key Recommendation |
|----------|-------------------|
| **Security** | Always use TLS, JWT in interceptors |
| **Performance** | Connection pooling, keepalive pings |
| **Reliability** | Retry interceptors, circuit breakers |
| **Resources** | Limit goroutines, set deadlines |

---

## 1. Security Best Practices

### TLS Configuration (Required for Production)

```go
// Server: Load TLS credentials
creds, err := credentials.NewServerTLSFromFile("server.crt", "server.key")
if err != nil { log.Fatal(err) }

server := grpc.NewServer(grpc.Creds(creds))
```

```go
// Client: Connect with TLS
creds, err := credentials.NewClientTLSFromFile("ca.crt", "")
conn, err := grpc.Dial(address, grpc.WithTransportCredentials(creds))
```

### mTLS (Mutual TLS) for Service-to-Service

```go
// Server: Require client certificates
tlsConfig := &tls.Config{
    ClientAuth: tls.RequireAndVerifyClientCert,
    ClientCAs:  certPool,
}
creds := credentials.NewTLS(tlsConfig)
```

### JWT Authentication (via Interceptors)

```go
// Server interceptor
func authInterceptor(ctx context.Context, req interface{}, 
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok { return nil, status.Error(codes.Unauthenticated, "missing metadata") }
    
    token := md.Get("authorization")
    if len(token) == 0 { return nil, status.Error(codes.Unauthenticated, "missing token") }
    
    // Validate JWT token
    claims, err := validateJWT(token[0])
    if err != nil { return nil, status.Error(codes.Unauthenticated, "invalid token") }
    
    // Add claims to context
    ctx = context.WithValue(ctx, "user", claims)
    return handler(ctx, req)
}

server := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))
```

### Security Checklist

- [ ] Use TLS in production (never insecure)
- [ ] Use mTLS for internal service communication
- [ ] Validate JWT in interceptor
- [ ] Set proper CORS headers (via Envoy)
- [ ] Disable reflection in production
- [ ] Rate limit requests
- [ ] Validate all Protobuf inputs

---

## 2. Performance Optimization

### Connection Pooling

```go
// Create connection pool
type Pool struct {
    conns []*grpc.ClientConn
    mu    sync.Mutex
    idx   int
}

func (p *Pool) Get() *grpc.ClientConn {
    p.mu.Lock()
    defer p.mu.Unlock()
    conn := p.conns[p.idx]
    p.idx = (p.idx + 1) % len(p.conns)
    return conn
}

// Initialize pool
func NewPool(addr string, size int) *Pool {
    conns := make([]*grpc.ClientConn, size)
    for i := 0; i < size; i++ {
        conn, _ := grpc.Dial(addr, grpc.WithTransportCredentials(creds))
        conns[i] = conn
    }
    return &Pool{conns: conns}
}
```

### Keepalive Configuration

```go
import "google.golang.org/grpc/keepalive"

// Client keepalive
conn, err := grpc.Dial(address,
    grpc.WithKeepaliveParams(keepalive.ClientParameters{
        Time:                10 * time.Second, // Ping if idle
        Timeout:             3 * time.Second,  // Wait for pong
        PermitWithoutStream: true,             // Ping even without RPCs
    }),
)

// Server keepalive
server := grpc.NewServer(
    grpc.KeepaliveParams(keepalive.ServerParameters{
        MaxConnectionIdle:     15 * time.Minute,
        MaxConnectionAge:      30 * time.Minute,
        MaxConnectionAgeGrace: 5 * time.Second,
        Time:                  10 * time.Second,
        Timeout:               3 * time.Second,
    }),
    grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
        MinTime:             5 * time.Second,
        PermitWithoutStream: true,
    }),
)
```

### Performance Metrics (Go, 10k connections)

| Metric | Typical Value |
|--------|---------------|
| Memory per conn | 2-4 KB |
| 10k connections | ~30-50 MB |
| CPU idle | ~1-2% |
| Throughput | 80k+ msg/sec |

### Optimization Checklist

- [ ] Use connection pool (3-5 connections per client)
- [ ] Enable keepalive (10s ping interval)
- [ ] Use Protobuf (not JSON)
- [ ] Enable gzip compression for large payloads
- [ ] Use client-side load balancing
- [ ] Benchmark with `ghz` tool

---

## 3. Reliability Patterns

### Retry Interceptor

```go
import "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/retry"

// Client with retry
retryOpts := []retry.CallOption{
    retry.WithMax(3),
    retry.WithBackoff(retry.BackoffLinear(100 * time.Millisecond)),
    retry.WithCodes(codes.Unavailable, codes.ResourceExhausted),
}

conn, err := grpc.Dial(address,
    grpc.WithUnaryInterceptor(retry.UnaryClientInterceptor(retryOpts...)),
    grpc.WithStreamInterceptor(retry.StreamClientInterceptor(retryOpts...)),
)
```

### Context Deadlines (Always Set!)

```go
// Always set deadline to prevent hanging
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.SomeMethod(ctx, req)
if err != nil {
    if status.Code(err) == codes.DeadlineExceeded {
        // Handle timeout
    }
}
```

### Circuit Breaker

```go
import "github.com/mercari/go-circuitbreaker"

cb := circuitbreaker.New(
    circuitbreaker.WithOpenTimeout(10*time.Second),
    circuitbreaker.WithTripFunc(circuitbreaker.NewTripFuncConsecutiveFailures(5)),
)

// Wrap RPC call
err := cb.Do(ctx, func() error {
    _, err := client.SomeMethod(ctx, req)
    return err
})

if errors.Is(err, circuitbreaker.ErrOpen) {
    // Circuit is open, service is down
}
```

### Error Handling with Status Codes

```go
import "google.golang.org/grpc/status"

// Returning errors
func (s *server) GetEvent(ctx context.Context, req *pb.GetEventRequest) (*pb.Event, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "event ID required")
    }
    
    event, err := s.db.FindEvent(req.Id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, status.Error(codes.NotFound, "event not found")
        }
        return nil, status.Error(codes.Internal, "database error")
    }
    
    return event, nil
}

// Client error handling
resp, err := client.GetEvent(ctx, req)
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        switch st.Code() {
        case codes.NotFound:
            // Handle 404
        case codes.InvalidArgument:
            // Handle validation error
        default:
            // Handle other errors
        }
    }
}
```

### Reliability Checklist

- [ ] Always set context deadline (5-30s typical)
- [ ] Use retry interceptor (3 retries, exponential backoff)
- [ ] Implement circuit breaker for external services
- [ ] Return proper gRPC status codes
- [ ] Log with request ID for tracing
- [ ] Handle graceful shutdown

---

## 4. Resource Management

### Limit Concurrent Streams

```go
server := grpc.NewServer(
    grpc.MaxConcurrentStreams(100),
    grpc.MaxRecvMsgSize(4 * 1024 * 1024), // 4MB max message
    grpc.MaxSendMsgSize(4 * 1024 * 1024),
)
```

### Worker Pool for Streaming

```go
// Avoid 1 goroutine per stream
type Broker struct {
    clients map[string]chan *pb.Event
    mu      sync.RWMutex
}

func (b *Broker) Broadcast(event *pb.Event) {
    b.mu.RLock()
    defer b.mu.RUnlock()
    for _, ch := range b.clients {
        select {
        case ch <- event:
        default:
            // Client too slow, skip
        }
    }
}
```

### Graceful Shutdown

```go
// Graceful shutdown
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

<-quit
log.Println("Shutting down...")

// Stop accepting new connections
server.GracefulStop()
```

---

## 5. gRPC-Web for Frontend (SvelteKit)

### Setup with Envoy Proxy

```yaml
# envoy.yaml
static_resources:
  listeners:
    - address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                route_config:
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: grpc_service }
                      cors:
                        allow_origin_string_match:
                          - prefix: "*"
                        allow_methods: "GET, POST, OPTIONS"
                        allow_headers: "content-type, x-grpc-web"
                http_filters:
                  - name: envoy.filters.http.grpc_web
                  - name: envoy.filters.http.cors
                  - name: envoy.filters.http.router
  clusters:
    - name: grpc_service
      type: LOGICAL_DNS
      lb_policy: ROUND_ROBIN
      http2_protocol_options: {}
      load_assignment:
        cluster_name: grpc_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: backend, port_value: 50051 }
```

### SvelteKit Client

```typescript
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { EventServiceClient } from "./generated/events.client";

const transport = new GrpcWebFetchTransport({
    baseUrl: "/grpc", // Proxied to Envoy
});

const client = new EventServiceClient(transport);

// Use in Svelte component
const response = await client.getEvent({ id: eventId });
```

---

## Constraints for grouppe

1. **Use gRPC internally** between Go services (not frontend)
2. **Use REST/WebSocket** for SvelteKit ↔ Go (simpler)
3. **If gRPC-Web needed**: Add Envoy proxy + code generation
4. **Always TLS** in production
5. **5s timeout** as default, adjust per endpoint
6. **3 retries** with exponential backoff
