---
name: release-readiness-safeguard
description: Perform a focused release-readiness review for safeguard and proxy changes, including docs, verification evidence, and risk notes. Use before tagging or deployment.
disable-model-invocation: true
---

# Release Readiness Safeguard

## Goal
Prevent last-mile misses for a lightweight local release.

## Release Gate
1. Behavior checks completed (streaming, verdict split, proxy forwarding).
2. Syntax checks completed (`node --check`, `python -m py_compile`).
3. README and PROJECT_PLAN reflect current architecture/workflows.
4. Risk notes documented for known limitations.
5. Manual verification steps are reproducible for another developer.

## Output Format
- `Ready` or `Not ready`
- `Blocking issues`
- `Post-release watch items`
