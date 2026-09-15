# App Store Asset Workspace

This directory preserves draft copy for a possible mobile app. It does not contain a production-ready icon, screenshot set, preview video or native build.

## Proposed structure

- `icon/`: Final `1024 x 1024` App Store icon export.
- `screenshots/iphone-6.9/`: iPhone 6.9-inch screenshots.
- `screenshots/iphone-6.7/`: iPhone 6.7-inch screenshots.
- `screenshots/ipad-13/`: iPad Pro 13-inch screenshots.
- `preview/iphone/`: iPhone app preview exports.
- `preview/ipad/`: iPad app preview exports.
- `copy/screenshot-captions-en-US.md`: Screenshot caption set.
- `copy/preview-script-en-US.md`: App preview storyboard/script.

## Naming Convention

Recommended screenshot filename pattern:

`safeguard-<platform>-<index>-<slug>.png`

Examples:

- `safeguard-iphone69-01-fast-classification.png`
- `safeguard-ipad13-03-live-analysis.png`

## QA Reminder

If mobile work resumes, recheck current platform requirements and capture assets from a verified native build. `APP_STORE_LAUNCH_PACK.md` contains historical concept notes.
