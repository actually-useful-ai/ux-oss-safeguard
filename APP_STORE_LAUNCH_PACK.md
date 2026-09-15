# App Store Launch Pack: Safeguard

> **Historical mobile concept, retained for reference.** This repository has no
> native iOS project or submission-ready assets. The specifications and copy below
> are early planning ideas, not current platform requirements or release evidence.
> Recheck requirements and validate an actual native build before resuming this work.

## 1) Launch Scope and Positioning

- Product: `Safeguard` content policy evaluator with streamed analysis and verdict output.
- Primary user: developers, trust and safety teams, and product managers testing policy-driven moderation flows.
- Core value proposition: evaluate text quickly with transparent streamed reasoning and explicit PASS/FAIL/ESCALATE outcomes.
- Launch objective: publish a polished, accessibility-conscious iOS/iPadOS store presence that converts technical evaluators and product teams.

## 2) Required App Store Assets

### App Icon (Required)

| Spec | Value |
|------|-------|
| Size | `1024 x 1024 px` |
| Format | `PNG` |
| Color space | `sRGB` or `Display P3` |
| Transparency | Not allowed |
| Corner radius | Do not round corners (Apple masks automatically) |
| Layers | Flat, single-layer appearance |

Design guidance:
- Keep one visual focal point (shield/check/scan motif works best).
- Avoid small text inside icon.
- Validate legibility at small sizes (29 px and 60 px equivalents).

### iPhone Screenshots (Required)

Apple submission baseline for this launch:
- Provide at least one iPhone set.
- For best compatibility and merchandising coverage, include both sizes below.

| Target set | Portrait size | Landscape size | Status |
|------------|---------------|----------------|--------|
| iPhone 6.9" | `1320 x 2868 px` | `2868 x 1320 px` | Required in this plan |
| iPhone 6.7" | `1290 x 2796 px` | `2796 x 1290 px` | Strongly recommended |

Count:
- Minimum `1` screenshot per localization.
- Recommended `5-8` for conversion narrative.
- Maximum `10`.

### iPad Screenshots (Required for iPad distribution)

| Target set | Portrait size | Landscape size | Status |
|------------|---------------|----------------|--------|
| iPad Pro 13" | `2064 x 2752 px` | `2752 x 2064 px` | Required in this plan |

Count:
- Recommended `5-8` screenshots.
- Keep design language parallel to iPhone set.

### App Preview Video (Optional but Included in this launch pack)

| Spec | Value |
|------|-------|
| Duration | `15-30 seconds` |
| Format | `H.264` in `MOV`, `MP4`, or `M4V` |
| Frame rate | `30 fps` |
| Max file size | `500 MB` |
| Audio | Optional (`AAC`, up to 256 kbps) |

Resolution targets for this launch:
- iPhone 6.9": `1320 x 2868` (portrait) or `2868 x 1320` (landscape)
- iPad 13": `2064 x 2752` (portrait) or `2752 x 2064` (landscape)

## 3) Screenshot Narrative System (Recommended Order)

Use this sequence for both iPhone and iPad (copy can vary slightly by device):

1. **Classify risky content fast**
2. **See streamed analysis live**
3. **Get clear PASS / FAIL / ESCALATE verdicts**
4. **Edit policy inputs for custom safety workflows**
5. **Review examples across key risk categories**
6. **Run keyboard-friendly, accessible moderation checks**

Content rules:
- Show actual product UI (not conceptual mockups only).
- Keep captions short (3-7 words), benefit-first.
- Avoid pricing text in screenshots.
- Ensure text is readable at small App Store card sizes.

## 4) App Preview Storyboard (30-second max)

Suggested sequence:
- 0-3s: open on verdict outcome panel and core promise text.
- 3-10s: show policy + prompt input workflow.
- 10-18s: show live streamed analysis and phase progression.
- 18-24s: show final verdict decoding into plain language.
- 24-30s: show accessibility and confidence message (keyboard/screen-reader friendly), then brand end-card.

Production notes:
- Record real app footage from a release-candidate build.
- Avoid tiny overlays that cannot be read on phone.
- If narration is used, ensure captions/subtitles are included for accessibility.

## 5) Asset Build Checklist

### Design and Export
- [ ] Final icon exported to `1024 x 1024 PNG` (no transparency).
- [ ] iPhone 6.9" screenshot set exported.
- [ ] iPhone 6.7" screenshot set exported.
- [ ] iPad 13" screenshot set exported.
- [ ] App preview video exported for iPhone and iPad target resolutions.

### Quality and Compliance
- [ ] All screenshots reflect current shipping UI.
- [ ] Caption text is legible and concise.
- [ ] No trademark misuse or competitor references.
- [ ] Light/dark visual consistency checked.
- [ ] Accessibility claims are true and demonstrable in app behavior.

### Upload Readiness
- [ ] Assets organized by locale folder (`en-US`, future locales).
- [ ] Filenames are deterministic and sortable.
- [ ] Final QA pass completed on App Store Connect preview pages.

## 6) Delivery Folder Structure

Recommended structure in repository:

```text
app-store/
  icon/
    safeguard-icon-1024.png
  screenshots/
    iphone-6.9/
    iphone-6.7/
    ipad-13/
  preview/
    iphone/
    ipad/
  copy/
    screenshot-captions-en-US.md
    preview-script-en-US.md
```

## 7) Team-Style Launch Review (Product + Risk)

### Business
- Audience fit is strong for technical moderation and safety evaluation buyers.
- Messaging should emphasize speed-to-verdict and policy transparency, not generic chat.
- Monetization path for future versions: hosted team workflow, audit logs, and policy template packs.

### Technical
- Current architecture is lightweight and demo-friendly; it supports a credible first App Store presence narrative.
- Primary risk for App Store submission is privacy/network disclosure clarity if external inference APIs are used.
- Verification requirement: perform final end-to-end checks on iPhone/iPad release builds with production API configuration.

### Skeptics
- Launch risk: screenshots overpromise enterprise governance features if not implemented in-app.
- Kill criterion: if verdict reliability messaging cannot be supported with clear policy limitations, pause release.
- Pivot trigger: if target users interpret the app as a generic chatbot, shift copy to strict policy evaluation framing.

## 8) iOS Accessibility and HIG Guardrails

- Support Dynamic Type for all primary content labels shown in screenshots and preview footage.
- Preserve sufficient color contrast for verdict states in both light and dark modes.
- Ensure focus order and semantics are correct for keyboard and VoiceOver operation.
- Avoid essential information encoded by color alone; include text labels (`PASS`, `FAIL`, `ESCALATE`).

## 9) "Splash" Clarification

App Store Connect does not require a separate "splash" promotional asset for iPhone/iPad submissions.
If "splash" means app launch screen branding, keep it minimal and native in the iOS app bundle; do not treat it as an App Store listing asset.

## 10) Next Execution Steps

1. Create final branded icon artwork and export the required 1024 px version.
2. Capture deterministic screenshot runs from release candidate builds on iPhone 6.9/6.7 and iPad 13".
3. Produce one iPhone and one iPad app preview cut using the storyboard above.
4. Upload to App Store Connect and run copy/asset QA before submission.
