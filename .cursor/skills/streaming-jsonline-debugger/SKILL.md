---
name: streaming-jsonline-debugger
description: Diagnose newline-delimited JSON stream parsing issues and partial chunk handling. Use when editing streaming UI logic in ollama-chat.html or safeguard.html.
paths:
  - "**/ollama-chat.html"
  - "**/safeguard.html"
disable-model-invocation: true
---

# Streaming JSONLine Debugger

## Goal
Catch regressions where chunked model output is malformed, truncated, or mis-parsed.

## Workflow
1. Identify stream parsing sections and buffering logic.
2. Verify parser handles:
   - partial JSON objects split across chunks
   - multiple JSON objects in one chunk
   - empty/heartbeat lines
3. Confirm non-fatal parse errors do not break subsequent valid chunks.
4. Ensure UI state updates remain incremental and do not duplicate content.
5. Summarize vulnerabilities with a concrete failing input shape.

## Quick Heuristic
- If parser assumes each chunk is complete JSON, mark as high-risk.
- If parser does not retain trailing buffer between reads, mark as high-risk.

## Output Format
- `Safe paths`
- `High-risk paths`
- `Recommended patch strategy`
