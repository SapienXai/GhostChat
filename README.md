# GhostChat

GhostChat is a browser extension that adds a floating chat widget to websites.
It is focused on Web3 browsing contexts, peer presence, and lightweight site risk signals.

## What It Does

- Site-level chat widget injected into pages
- Real-time peer chat with reactions (like/dislike), mentions, typing and away states
- "Trending" and "New & Rising" leaderboard views (site/user activity snapshots)
- Risk score panel for the current site (URL, hostname, protocol, known-domain heuristics)
- Danmaku (scrolling message overlay) toggle
- Browser notifications for new messages (configurable)
- Profile/settings page (username, avatar, theme, notification preferences)

## Tech Stack

- WXT (Manifest extension tooling)
- React 19 + TypeScript
- Remesh + remesh-react (state/domain architecture)
- Tailwind CSS v4 + shadcn/ui (Radix-based UI)
- `@rtco/client` peer communication layer
- `idb-keyval` + browser storage (`storage.sync`) for persistence

## Requirements

- Node.js `>= 20.0.0`
- pnpm (recommended)

## Local Development

```bash
git clone https://github.com/SapienXai/GhostChat.git
cd GhostChat
pnpm install
pnpm dev
```

Then load the unpacked extension:

- Chrome: `chrome://extensions` -> Developer mode -> Load unpacked -> `.output/chrome-mv3-dev`
- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `.output/firefox-mv2-dev/manifest.json`

Optional dev target:

```bash
pnpm dev:firefox
```

## Scripts

```bash
pnpm dev            # WXT dev (Chrome target)
pnpm dev:firefox    # WXT dev (Firefox target)
pnpm build          # Production builds (all configured targets)
pnpm build:chrome
pnpm build:firefox
pnpm pack           # Zip packages for distribution
pnpm pack:chrome
pnpm pack:firefox
pnpm lint           # ESLint --fix --cache
pnpm check          # TypeScript check (tsc --noEmit)
pnpm clear          # Remove .output
```

## Project Structure

```text
src/
  app/
    background/      # Extension background entry
    content/         # Injected widget app (content script UI)
    options/         # Extension options page
  assets/            # Images and styles
  components/        # Shared UI components
  constants/         # App constants
  domain/            # Remesh domains, externs, and implementations
  hooks/             # React hooks
  lib/               # Supporting libraries (e.g. avatar generation)
  messenger/         # Extension messaging helpers
  types/             # Shared type definitions
  utils/             # Utility functions (risk scoring, site/web3 detection, etc.)
```

## Architecture Notes

- UI runs from content script and renders inside a shadow-root mount.
- Domain state is managed via Remesh modules/domains.
- Message and app state are persisted with IndexedDB/local storage + browser sync storage (where applicable).
- Peer/session events are coordinated through room abstractions in `src/domain/impls`.

## Browser Permissions

Configured permissions in manifest:

- `storage`
- `notifications`
- `tabs`

## Contributing

1. Create a branch.
2. Implement your change.
3. Run checks:

```bash
pnpm lint
pnpm check
```

4. Open a PR.

## License

MIT. See [LICENSE](./LICENSE).
