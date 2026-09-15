---
name: local-stack-smoke-test
description: Run the local stack smoke test across proxy, safeguard UI, chat UI, and Python app syntax checks. Use before sharing changes or opening a PR.
disable-model-invocation: true
---

# Local Stack Smoke Test

## Goal
Provide a repeatable pre-PR confidence pass.

## Steps
1. Run JS syntax check:
   - `node --check proxy-server.js`
2. Run Python syntax check:
   - `python -m py_compile gpt-oss-safeguard/app.py`
3. Start proxy and verify key pages:
   - root page
   - safeguard page
   - chat page
4. Validate one streaming interaction in safeguard and one in chat.
5. Stop with a clear pass/fail summary and list blockers.

## Output Format
- `Checks run`
- `Checks passed`
- `Failures and reproduction`
