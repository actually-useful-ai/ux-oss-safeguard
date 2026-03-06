# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two single-page tools for locally-running Ollama instances, served by a shared Node.js CORS proxy.

## Architecture

- **`proxy-server.js`** - Node.js HTTP server (no dependencies beyond stdlib). Serves both HTML frontends and proxies `/api/*` requests to Ollama at `localhost:11434` with CORS headers. Forwards Ollama's status codes verbatim.
- **`ollama-chat.html`** - Chat interface. Streams responses, supports live thinking/reasoning display (`message.thinking` field), persists config to localStorage.
- **`safeguard.html`** - Standalone HTML content policy evaluator (same proxy). Policy + Prompt inputs, live-streamed Analysis and Verdict panels with phase indicators. Splits output on `assistantfinal` token; verdict box color-codes VALID/INVALID/ESCALATE.
- **`app.py`** - Gradio clone of `openai/gpt-oss-safeguard-20b` using Ollama as the backend (no 20B download). Same UX as the HF space; model/URL configurable via env vars `OLLAMA_MODEL`, `OLLAMA_URL`.

## Commands

```bash
# Node proxy (chat + safeguard HTML UIs)
npm start   # or: node proxy-server.js
# http://localhost:3000              -> chat
# http://localhost:3000/safeguard.html -> safeguard (HTML)

# Gradio safeguard (exact HF space clone, Ollama backend)
pip install -r requirements.txt
python app.py
# http://localhost:7860
```

Ollama must be running locally on port 11434. No build, lint, or test commands exist.

## Key Details

- Zero external dependencies - uses only Node.js builtins (`http`, `url`, `fs`)
- The proxy strips and re-adds CORS headers to work around Ollama's default CORS restrictions
- Frontend connects to Ollama via the proxy at the same origin, configurable URL/model in the UI
- Streaming is enabled by default; responses are parsed as newline-delimited JSON chunks
