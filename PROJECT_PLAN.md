# Safeguard project plan

## Current scope

Safeguard is a small policy-evaluation demo with web and Gradio interfaces.
The Node proxy sends Ollama-shaped requests to Hugging Face's inference endpoint
for `gpt-oss-safeguard-20b`. The Gradio interface now uses that sibling proxy by
default; explicit environment settings still support local Ollama.

The proxy already limits requests per IP, caps global concurrent requests and
bounds output tokens. Its deployment must protect forwarded client-IP headers.
The Gradio fixture tests cover request configuration and verdict boundaries,
including a marker split across chunks and an answer in the same chunk.
These tests verify transport and display behavior, not model classification quality.

## Next work

- Add a policy fingerprint beside each verdict so shared screenshots identify
  the policy that produced the result.
- Add browser fixtures for verdict decoding and keyboard/screen-reader behavior.
- Run a browser interaction pass before claiming a tested hosted Gradio deployment.
  A clean Gradio 6.27.0 install currently constructs all 22 interface components.
- Evaluate model output on a documented policy/content set before making
  reliability claims. Keep uncertain verdicts subject to human review.

## Preserved ideas

`APP_STORE_LAUNCH_PACK.md` and `app-store/copy/` retain an early mobile concept.
There is no native iOS target, app binary, completed store asset set or scheduled
submission. Recheck platform requirements if that work resumes. The Cursor skill
files remain intact under `.cursor/skills/` for explicit use during development.

## Local verification

```sh
node --check proxy-server.js
python3 -m unittest discover -s tests -v
```

Use fixture transports for automated checks. A live provider test needs a
separately chosen model, account and representative inputs.
