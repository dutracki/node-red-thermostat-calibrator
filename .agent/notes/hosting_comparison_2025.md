# Hosting Comparison for Nginx (Late 2025)

**Date**: 2025-12-10
**Status**: Final
**Workflow**: `/research_subject`

A comparison of "Free Tier" options vs. optimized cheap VPS for hosting Nginx.

## 1. Google Cloud Platform (GCP) "Always Free"
*   **Instance**: `e2-micro` (2 vCPU burstable, 1 GB RAM).
*   **Region**: Restricted to `us-central1`, `us-west1`, `us-east1`.
*   **Network**: **1 GB Egress/month (Premium)** to all regions.
*   **IP**: 1 dedicated IPv4 (Ephemeral but free).
*   **Verdict**: **Best "True Free" for low traffic**.
    *   *Warning*: The 1 GB egress limit is extremely low for a media-heavy site. One viral hit could incur costs.

## 2. Amazon Web Services (AWS) "Free Tier"
*   **Change Alert (July 2025)**: New accounts get **$100-200 credits** for 6 months instead of "12 months free".
*   **Instance**: `t2.micro` or `t3.micro`.
*   **Network**: **100 GB Egress/month** (Global).
*   **Verdict**: **Best for short-term / high bandwidth trial**.
    *   *Warning*: After credits run out (approx 6 months), you pay standard rates. Not "Always Free" for new users anymore.

## 3. Mikr.us (Polish Optimized VPS)
*   **Plan**: "Mikrus 1.0" or "2.1".
*   **Cost**:
    *   ~35 PLN/year (~$9 USD) for 1.0 (384MB RAM, 5GB Disk).
    *   ~75 PLN/year (~$19 USD) for 2.1 (1GB RAM, 10GB Disk).
*   **Network**: Unmetered (fair usage) or very high limits compared to cloud free tiers.
*   **IP**: **Shared IPv4** (NAT with ~20 ports forwarded) + Dedicated IPv6.
*   **Verdict**: **Cheapest "Peace of Mind" Production**.
    *   *Pros*: No surprise bills, "set and forget", paid yearly.
    *   *Cons*: Shared IPv4 means you cannot use standard ports `80`/`443` directly without a reverse proxy (like Cloudflare Tunnel) or IPv6.

## Summary & Recommendation

| Feature | GCP (Free) | AWS (New Free Tier) | Mikr.us (Paid Cheap) |
| :--- | :--- | :--- | :--- |
| **Cost** | $0 (Always) | $0 (6 months max) | ~$9/year |
| **RAM** | 1 GB | 1 GB | 384 MB - 1 GB |
| **Egress** | **1 GB** (Risk!) | 100 GB | High/Unmetered |
| **IP** | Public IPv4 | Public IPv4 | **Shared IPv4** |
| **Ports** | 80/443 Open | 80/443 Open | Random High Ports |

### Recommended Path

1.  **For 100% Free**: **Google Cloud e2-micro**.
    *   *Must*: Use Cloudflare to cache content and reduce egress.
    *   *Must*: Set budget alerts at $0.01.

2.  **For Stability / No Risk**: **Mikr.us 2.1 (~$19/yr)**.
    *   Use **Cloudflare Tunnel** (`cloudflared`) to tunnel traffic to the VPS. This bypasses the Shared IPv4 limitation, giving you public HTTPS on port 443 without needing a dedicated IP.
