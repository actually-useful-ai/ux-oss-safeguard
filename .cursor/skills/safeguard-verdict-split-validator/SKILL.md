---
name: safeguard-verdict-split-validator
description: Validate assistantfinal split handling between analysis and verdict panels in safeguard flows. Use when changing safeguard.html or gpt-oss-safeguard/app.py output handling.
paths:
  - "**/safeguard.html"
  - "**/gpt-oss-safeguard/app.py"
disable-model-invocation: true
---

# Safeguard Verdict Split Validator

## Goal
Ensure `assistantfinal` boundary behavior remains stable and user-facing verdict rendering is correct.

## Workflow
1. Locate token split logic around `assistantfinal`.
2. Validate behavior for:
   - token present exactly once
   - token missing entirely
   - token repeated unexpectedly
   - token split across stream chunks
3. Confirm analysis and verdict panels render deterministic content without cross-contamination.
4. Confirm verdict styling maps correctly to PASS/FAIL/ESCALATE.
5. Record edge case coverage gaps and propose minimal guard clauses.

## Output Format
- `Boundary cases verified`
- `Render correctness`
- `Regression risks`
