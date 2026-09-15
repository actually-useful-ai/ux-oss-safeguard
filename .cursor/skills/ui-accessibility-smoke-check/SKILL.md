---
name: ui-accessibility-smoke-check
description: Run a fast accessibility smoke check for keyboard flow, ARIA labels, focus order, and live-region behavior. Use after UI updates in safeguard.html or ollama-chat.html.
paths:
  - "**/safeguard.html"
  - "**/ollama-chat.html"
disable-model-invocation: true
---

# UI Accessibility Smoke Check

## Goal
Keep accessibility regressions from shipping during rapid UI iteration.

## Checklist
1. Keyboard-only navigation reaches all interactive controls.
2. Focus indicators are visible and logically ordered.
3. Inputs/buttons have accessible names (label, aria-label, or equivalent).
4. Dynamic output regions communicate updates appropriately (`aria-live`, busy states).
5. Color-only semantics are not the only verdict signal.

## Browser Validation
- Prefer ARIA snapshot-based checks for structure.
- For major UI changes, include a screenshot pass in light and dark themes.

## Output Format
- `Passed checks`
- `Accessibility defects`
- `Severity and fix priority`
