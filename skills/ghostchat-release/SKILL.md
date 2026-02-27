---
name: ghostchat-release
description: Use this skill when asked to build and publish a new GhostChat release (version bump, build chrome/edge/firefox zips, update metadata, publish GitHub release/tag/assets, verify URLs).
---

# GhostChat Release Skill

## When to use
- User asks for: new build, release, publish new version, update release links.

## Required flow
1. Confirm target version.
2. Update:
   - `package.json` version
   - `public/update.json` fields (`version`, `downloadUrl`, `downloads.*`, `notesUrl`)
3. Build artifacts:
   - `npm run release:build-all`
4. Publish release:
   - `npm run release:publish`
5. Verify public URLs:
   - `npm run release:verify`
6. Report:
   - release page URL
   - chrome/edge/firefox URLs
   - verification status

## Commands
```bash
npm run release:build-all
npm run release:publish
npm run release:verify
```

## Files to check
- `docs/RELEASE_CHECKLIST.md`
- `scripts/release/build-all.sh`
- `scripts/release/publish-release.sh`
- `scripts/release/verify-release.sh`

## Rules
- Tag format must be `v<version>`.
- Release assets must match `ghost-chat-<version>-{chrome|edge|firefox}.zip`.
- Do not finish before URL verification passes.
