# GhostChat Agent Guide

## Release Trigger
- If the user asks for `yeni build al`, `release et`, `sürüm yayınla`, or similar:
  1. Run `npm run release:build-all`
  2. Confirm `public/update.json` version/links are correct
  3. Run `npm run release:publish`
  4. Run `npm run release:verify`
  5. Report release URLs and status codes

## Update Metadata Contract
- Keep `public/update.json` in this shape:
  - `version`
  - `downloadUrl` (default chrome URL)
  - `downloads.chrome`
  - `downloads.edge`
  - `downloads.firefox`
  - `notesUrl`

## Notes
- Tag format: `v<version>` (example: `v0.5.10`)
- Release assets are expected in `.output`:
  - `ghost-chat-<version>-chrome.zip`
  - `ghost-chat-<version>-edge.zip`
  - `ghost-chat-<version>-firefox.zip`
