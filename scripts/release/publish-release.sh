#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="${1:-$(node -p "require('./package.json').version")}"
TAG="v${VERSION}"
OWNER_REPO="SapienXai/GhostChat"

CHROME_FILE=".output/ghost-chat-${VERSION}-chrome.zip"
EDGE_FILE=".output/ghost-chat-${VERSION}-edge.zip"
FIREFOX_FILE=".output/ghost-chat-${VERSION}-firefox.zip"

for file in "$CHROME_FILE" "$EDGE_FILE" "$FIREFOX_FILE"; do
  if [[ ! -f "$file" ]]; then
    echo "[release:publish] missing artifact: $file"
    exit 1
  fi
done

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "[release:publish] creating local tag $TAG"
  git tag -a "$TAG" -m "Release $TAG"
else
  echo "[release:publish] tag already exists locally: $TAG"
fi

echo "[release:publish] pushing branch..."
git push origin master
echo "[release:publish] pushing tag..."
git push origin "$TAG"

CRED="$(printf "protocol=https\nhost=github.com\n\n" | git credential fill)"
USER_NAME="$(printf "%s" "$CRED" | sed -n 's/^username=//p' | head -n1)"
PASSWORD="$(printf "%s" "$CRED" | sed -n 's/^password=//p' | head -n1)"

if [[ -z "$USER_NAME" || -z "$PASSWORD" ]]; then
  echo "[release:publish] github credentials not found via git credential"
  exit 1
fi

CREATE_PAYLOAD="{\"tag_name\":\"${TAG}\",\"target_commitish\":\"master\",\"name\":\"${TAG}\",\"body\":\"Release ${TAG}\",\"draft\":false,\"prerelease\":false}"
CREATE_RES="$(curl -sS -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" -X POST "https://api.github.com/repos/${OWNER_REPO}/releases" -d "$CREATE_PAYLOAD" || true)"

if printf "%s" "$CREATE_RES" | rg -q '"id"'; then
  RELEASE_ID="$(printf "%s" "$CREATE_RES" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)"
else
  RELEASE_JSON="$(curl -sSfL -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${OWNER_REPO}/releases/tags/${TAG}")"
  RELEASE_ID="$(printf "%s" "$RELEASE_JSON" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)"
fi

if [[ -z "${RELEASE_ID:-}" ]]; then
  echo "[release:publish] failed to resolve release id"
  exit 1
fi

upload_asset() {
  local file_path="$1"
  local asset_name
  asset_name="$(basename "$file_path")"
  local upload_url="https://uploads.github.com/repos/${OWNER_REPO}/releases/${RELEASE_ID}/assets?name=${asset_name}"

  local response
  response="$(curl -sS -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" -H "Content-Type: application/zip" --data-binary @"$file_path" "$upload_url" || true)"

  if printf "%s" "$response" | rg -q '"already_exists"'; then
    local assets_json asset_id
    assets_json="$(curl -sSfL -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${OWNER_REPO}/releases/${RELEASE_ID}/assets")"
    asset_id="$(printf "%s" "$assets_json" | tr '{' '\n' | rg "\"name\"[[:space:]]*:[[:space:]]*\"${asset_name}\"" -B3 | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)"

    if [[ -n "$asset_id" ]]; then
      curl -sSfL -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" -X DELETE "https://api.github.com/repos/${OWNER_REPO}/releases/assets/${asset_id}" >/dev/null
      response="$(curl -sSfL -u "$USER_NAME:$PASSWORD" -H "Accept: application/vnd.github+json" -H "Content-Type: application/zip" --data-binary @"$file_path" "$upload_url")"
    fi
  fi

  local url
  url="$(printf "%s" "$response" | sed -n 's/.*"browser_download_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  if [[ -z "$url" ]]; then
    echo "[release:publish] failed to upload $asset_name"
    exit 1
  fi

  echo "$url"
}

CHROME_URL="$(upload_asset "$CHROME_FILE")"
EDGE_URL="$(upload_asset "$EDGE_FILE")"
FIREFOX_URL="$(upload_asset "$FIREFOX_FILE")"

echo "[release:publish] release=https://github.com/${OWNER_REPO}/releases/tag/${TAG}"
echo "[release:publish] chrome=$CHROME_URL"
echo "[release:publish] edge=$EDGE_URL"
echo "[release:publish] firefox=$FIREFOX_URL"
