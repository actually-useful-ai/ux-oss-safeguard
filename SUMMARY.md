# Workshop Summary

## What Was Built

Two single-page tools for locally-running Ollama instances, served by a shared Node.js CORS proxy, plus a Gradio clone of the HF safeguard space.

### Files

| File | Purpose |
|------|---------|
| `proxy-server.js` | Node.js HTTP server (zero deps). Serves HTML frontends, proxies `/api/*` to Ollama on `:11434` with CORS headers. |
| `safeguard.html` | Content policy evaluator. Policy + Prompt inputs, live-streamed Analysis and Verdict panels. Splits on `assistantfinal` token; verdict box color-codes VALID/INVALID/ESCALATE. |
| `ollama-chat.html` | Chat interface with streaming responses and live thinking/reasoning display. |
| `gpt-oss-safeguard/app.py` | Gradio clone of `openai/gpt-oss-safeguard-20b` using Ollama backend. Same UX as the HF space; model/URL configurable via env vars. |
| `package.json` | `npm start` convenience script. |

## Recent Changes

### Bubble Coloring (safeguard.html)
- Removed phase indicator dots (`.phase-bar`, `.phase-dot`, animated dots, and all related JS)
- Output boxes now carry status color directly via CSS classes:
  - `.state-active` — purple tint during streaming
  - `.state-done` — subtle purple when complete
  - `.state-error` — red tint on failure
  - `.valid` / `.invalid` / `.escalate` — green/red/amber verdict tinting

### Accessibility Settings (both HTML files)
- Added CSS custom properties for full theming (`--bg-gradient`, `--surface`, `--text`, `--accent`, etc.)
- **Dark/Light mode** via `[data-theme]` on `<html>` — all major elements respond
- **Font size** (S/M/L/XL) via `[data-font-size]` — scales all rem-based sizing
- **Reduce motion** — disables all animations/transitions
- Settings gear button in header opens a dropdown panel
- All settings persisted to `localStorage` under shared key `a11ySettings`
- Settings sync across pages (same key = same state when navigating)

## How to Run

```bash
# Requires Ollama running on localhost:11434
npm start
# http://localhost:3000              → chat
# http://localhost:3000/safeguard    → safeguard

# Gradio version (optional)
pip install -r requirements.txt
python gpt-oss-safeguard/app.py
# http://localhost:7860
```

## Next Up

- [ ] Deploy to VPS — set up Caddy reverse proxy + systemd services for Ollama and the Node proxy
- [ ] Bubble coloring refinement — increase visual differentiation between analysis/verdict states if needed
- [ ] Image upload support in chat interface
- [ ] Link preview rendering in chat messages (currently only in composer)
- [ ] Remote origin — create GitHub repo and push
