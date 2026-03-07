# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two single-page tools for locally-running Ollama instances, served by a shared Node.js CORS proxy. Deployed at `https://dr.eamer.dev/io/safeguard/`.

## Architecture

- **`proxy-server.js`** - Node.js HTTP server (zero dependencies). Serves both HTML frontends and proxies `/api/*` to Ollama at `localhost:11434`. Includes `/health` endpoint for service manager. Port 3456.
- **`safeguard.html`** - Content policy evaluator. Split-panel: policy/prompt inputs on left, streamed Analysis and Verdict on right. Splits output on `assistantfinal` token; verdict box color-codes VALID/INVALID/ESCALATE via signal indicators.
- **`ollama-chat.html`** - Chat interface with live thinking/reasoning display (`message.thinking` field). Accessible at `/io/safeguard/chat`.
- **`gpt-oss-safeguard/app.py`** - Gradio clone of `openai/gpt-oss-safeguard-20b` using Ollama backend. Separate from the Node proxy; runs on port 7860.

Both HTML files use the **IO Suite shared theme** (`/io/shared/css/io-theme.css` + `/io/shared/js/theme.js`) for consistent styling and theme toggling across the IO ecosystem.

## Deployment

- **Service**: Registered as `safeguard` in service_manager.py
- **Port**: 3456
- **Caddy**: `handle_path /io/safeguard/*` strips prefix, proxies to localhost:3456
- **URLs**:
  - `https://dr.eamer.dev/io/safeguard/` - Safeguard evaluator (default)
  - `https://dr.eamer.dev/io/safeguard/chat` - Chat interface

## Commands

```bash
# Service management
sm start safeguard
sm restart safeguard
sm logs safeguard
sm health safeguard

# Direct (development)
node proxy-server.js              # Starts on port 3456
PORT=3000 node proxy-server.js    # Override port

# Gradio app (separate)
cd gpt-oss-safeguard
pip install -r requirements.txt
python app.py                     # http://localhost:7860
```

Ollama must be running locally on port 11434.

## Key Details

- Zero external npm dependencies - uses only Node.js builtins (`http`, `url`, `fs`)
- The proxy strips and re-adds CORS headers to work around Ollama's default CORS restrictions
- Frontend uses relative API paths via `API_BASE` that auto-detects localhost vs production
- Streaming enabled by default; responses parsed as newline-delimited JSON chunks
- Both pages integrate with IO Suite shared theme for consistent light/dark mode
