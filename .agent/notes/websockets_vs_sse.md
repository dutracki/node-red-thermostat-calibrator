# Real-time Tech Selection: WebSockets vs SSE
**Date**: 2025-12-11
**Status**: Final
**Tags**: #research, #realtime, #grpc, #svelte

## Core Question
"Do I need WebSockets if I have gRPC?"
**Answer**: Yes (or SSE). Browsers cannot speak raw gRPC. They need a standard web protocol to receive real-time updates from your gRPC-Gateway.

## Comparison Table (2025 Context)

| Feature | Server-Sent Events (SSE) | WebSockets |
| :--- | :--- | :--- |
| **Direction** | Unidirectional (Server -> Client) | Bidirectional (Full Duplex) |
| **Primary Use Case** | Notifications, Live Feeds, Status Updates | Chat, Collaborative Editing, Gaming |
| **Mobile Battery** | **Excellent** (30% less drain on average) | High (requires constant keep-alive) |
| **Reconnection** | **Built-in** (Auto-reconnects by default) | Manual (Requires custom logic) |
| **Protocol** | Standard HTTP/2 (Firewall friendly) | Custom WS Protocol (Often blocked) |
| **Data Format** | Text / JSON (UTF-8 only) | Text or Binary |
| **Svelte Ease** | Native `EventSource` API (Very Simple) | Requires Store binding + Socket logic |

## Fit for Grouppe
Given the architecture (Go + gRPC Gateway + Svelte + Mobile-First focus):

### 1. For Notifications & Bookings
**Strong Recommendation: SSE**
- **Why**: Use cases like "Booking Confirmed" or "5 spots left" are strictly server-to-client.
- **Benefit**: Native mobile battery efficiency is critical for users on the go.
- **Implementation**: gRPC-Gateway can map a `stream Response` directly to an SSE-compatible JSON stream.

### 2. For Live Location Tracking
**Decision Dependent**:
- **Scenario A (Passive)**: User watches others move. -> **SSE** is sufficient.
- **Scenario B (Active)**: User constantly sends *their* location + watches others. -> **WebSockets** preferred efficiently, BUT...
    - *Alternative*: Client POSTs location to REST API (cheap), Server pushes updates via SSE. This separates concerns and keeps the "listening" channel robust.

## Implementation Guide (Go + Svelte)

### Backend (gRPC Gateway)
In your `events.proto`, define a streaming RPC:
```protobuf
service EventService {
  rpc SubscribeToNotifications(SubscriptionRequest) returns (stream Notification);
}
```
gRPC-Gateway automatically exposes this as a chunked HTTP stream (NDJSON), which is effectively SSE-compatible with minor tweaking (setting `Content-Type: text/event-stream`).

### Frontend (Svelte)
Using SSE is trivial in Svelte components:
```typescript
import { onMount } from 'svelte';

onMount(() => {
    const eventSource = new EventSource('/api/v1/events/subscribe');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("New Event:", data);
        // Update Store
    };

    eventSource.onerror = (err) => {
        console.error("Stream lost, browser will auto-reconnect", err);
    };

    return () => eventSource.close();
});
```

## Conclusion
Start with **SSE**. It is simpler, native to HTTP/2, battery-friendly, and covers 90% of app use cases (notifications, status updates). Upgrade to WebSockets only if you build a high-frequency Chat or Multiplayer feature.
