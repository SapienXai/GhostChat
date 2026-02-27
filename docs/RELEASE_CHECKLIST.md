# GhostChat Release Checklist

## 1. Prepare Version
- Update `package.json` version.
- Update `public/update.json`:
  - `version`
  - `downloadUrl`
  - `downloads.chrome`
  - `downloads.edge`
  - `downloads.firefox`
  - `notesUrl`

## 2. Build Artifacts
- Run `npm run release:build-all`.
- Verify files exist:
  - `.output/ghost-chat-<version>-chrome.zip`
  - `.output/ghost-chat-<version>-edge.zip`
  - `.output/ghost-chat-<version>-firefox.zip`

## 3. Publish GitHub Release
- Run `npm run release:publish`.
- This should:
  - create/push tag `v<version>`
  - create or reuse GitHub release
  - upload chrome/edge/firefox zip assets

## 4. Verify Public Links
- Run `npm run release:verify`.
- Expect HTTP `200` for:
  - `downloadUrl`
  - `downloads.chrome`
  - `downloads.edge`
  - `downloads.firefox`
  - `notesUrl`

## 5. Final Report
- Share:
  - version
  - release page URL
  - 3 asset URLs
  - verification status codes
