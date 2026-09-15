---
name: proxy-cors-regression-check
description: Validate Node proxy CORS and routing behavior, including passthrough status codes and preflight handling. Use when editing proxy-server.js, API forwarding logic, or request headers.
paths:
  - "**/proxy-server.js"
disable-model-invocation: true
---

# Proxy CORS Regression Check

## Goal
Confirm that proxy changes preserve routing, CORS headers, and upstream status behavior.

## Workflow
1. Run `node --check proxy-server.js`.
2. Verify static route behavior:
   - `/` serves chat or safeguard entry as intended.
   - `/safeguard.html` and `/ollama-chat.html` remain reachable.
3. Verify proxy behavior for `/api/*`:
   - Request forwarding target is unchanged unless explicitly requested.
   - Upstream status codes are forwarded verbatim.
   - Response headers include expected CORS fields.
4. Verify OPTIONS/preflight handling:
   - Response returns CORS allow headers and a non-error status.
5. Report any behavior drift with exact request path and observed/expected response.

## Output Format
- `Passes`: bullet list of validated checks.
- `Findings`: bullet list of regressions with impacted path and likely root cause.
- `Next action`: one concrete fix step.
