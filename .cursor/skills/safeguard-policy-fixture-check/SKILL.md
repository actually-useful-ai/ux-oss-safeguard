---
name: safeguard-policy-fixture-check
description: Validate safeguard behavior against representative policy/content fixtures spanning PASS, FAIL, and ESCALATE outcomes. Use when changing policy prompt templates or verdict rendering.
paths:
  - "**/safeguard.html"
  - "**/gpt-oss-safeguard/app.py"
disable-model-invocation: true
---

# Safeguard Policy Fixture Check

## Goal
Use a compact, repeatable fixture set to catch classification/rendering regressions.

## Fixture Coverage
1. Benign support content expected PASS.
2. Fraud/phishing expected ESCALATE.
3. Medium-risk abusive content expected FAIL.
4. Ambiguous edge case expected stable and documented handling.

## Validation
- Confirm verdict text and color/state match the expected class.
- Confirm analysis text remains visible and coherent.
- Record mismatches with fixture ID and observed output.

## Output Format
- `Fixtures run`
- `Expected vs observed`
- `Follow-up actions`
