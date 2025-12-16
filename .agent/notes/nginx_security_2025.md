# Nginx Security Best Practices (Late 2025)

**Date**: 2025-12-10
**Status**: Final
**Workflow**: `/research_subject`

## Key Findings

### 1. Core Hardening
- **Version Hiding**: `server_tokens off;` to prevent reconnaissance.
- **Privilege Separation**: Run worker processes as non-root user (e.g., `user nginx;`).
- **Resource Limits**:
    - `client_max_body_size`: Limit upload size.
    - `client_body_buffer_size`, `client_header_buffer_size`: Prevent buffer overflow/DoS.
    - `limit_req` & `limit_conn`: Enforce rate limiting.
- **Permissions**: `chown -R root:nginx /etc/nginx` (read-only for workers).

### 2. Encryption (TLS 1.3 & HTTP/3)
- **Protocols**: Disable TLS 1.0/1.1/1.2. **Enforce TLS 1.3**.
- **Cipher Suites**: Use rigorous suites (e.g., `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
- **HTTP/3 (QUIC)**:
    - Requires Nginx 1.25+ (Mainline 1.27.x+ recommended for 2025).
    - Listen on UDP 443: `listen 443 quic reuseport;`
    - Add `Alt-Svc` header: `add_header Alt-Svc 'h3=":443"; ma=86400';`
- **HSTS**: `Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"`.

### 3. Web Application Firewall (WAF)
- **Standard**: **ModSecurity v3** + **OWASP Core Rule Set (CRS)**.
    - *Note*: Nginx commercial ModSec support ended; use Open Source version maintained by OWASP.
- **Alternative**: **Coraza** (Go-based WAF), gaining traction but experimental support for Nginx.
- **Config**: Enable `SecRuleEngine On` after testing in `DetectionOnly`.

### 4. Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or SAMEORIGIN)
- `Content-Security-Policy`: Strict policy denying inline scripts/styles.
- `Permissions-Policy`: Restrict browser features (camera, mic, etc.).
- `Referrer-Policy: strict-origin-when-cross-origin`

### 5. Monitoring & Maintenance
- **Logging**: Ensure `access_log` and `error_log` are active.
- **Updates**: Patch Nginx immediately for CVEs (e.g., typical high-sev vulnerabilities found in 2025).

## Constraints for Code / Infrastructure

1.  **Docker Images**:
    - Use `mainline-alpine` or custom build for HTTP/3 support (standard repos might lag).
    - Ensure `libmodsecurity` is compiled if WAF is required.

2.  **Configuration Structure**:
    - Split configs: `conf.d/security.conf`, `conf.d/headers.conf`.
    - Do not commit secrets (SSL keys) to git.

3.  **Frontend Integration**:
    - Ensure SvelteKit/Vite config doesn't conflict with CSP (e.g., inline styles in dev vs prod).

## Implementation Guide

### Basic Hardened Config Snippet
```nginx
server {
    listen 443 ssl;
    listen 443 quic reuseport; # HTTP/3
    http2 on;
    
    server_tokens off;

    # SSL
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off; # Let client choose from strong list
    
    # Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Alt-Svc 'h3=":443"; ma=86400';

    # ... location blocks ...
}
```
