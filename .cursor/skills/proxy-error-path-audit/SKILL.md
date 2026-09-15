---
name: proxy-error-path-audit
description: Audit proxy error paths for network failures, malformed upstream payloads, and timeout handling. Use when changing proxy-server.js or upstream API integration.
paths:
  - "**/proxy-server.js"
disable-model-invocation: true
---

# Proxy Error Path Audit

## Goal
Harden non-happy paths so users receive actionable failures.

## Audit Areas
1. Upstream connection failures return clear status and body.
2. Upstream non-2xx responses preserve signal and are not silently rewritten.
3. Timeout/abort behavior cleans up sockets/streams.
4. Invalid upstream content does not crash request handlers.
5. Logs avoid leaking secrets while remaining diagnosable.

## Output Format
- `Error paths covered`
- `Unhandled failure modes`
- `Hardening recommendations`
