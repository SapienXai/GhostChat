#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./package.json').version")"

echo "[release:build-all] version=$VERSION"
echo "[release:build-all] building chrome..."
npm run pack:chrome

echo "[release:build-all] building firefox..."
npm run pack:firefox

echo "[release:build-all] building edge..."
npm run pack:edge

echo "[release:build-all] artifacts:"
ls -lh ".output/ghost-chat-${VERSION}-chrome.zip" ".output/ghost-chat-${VERSION}-edge.zip" ".output/ghost-chat-${VERSION}-firefox.zip"
