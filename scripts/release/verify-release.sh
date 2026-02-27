#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

JSON_FILE="public/update.json"
if [[ ! -f "$JSON_FILE" ]]; then
  echo "[release:verify] missing ${JSON_FILE}"
  exit 1
fi

FAIL=0
CHECK_COUNT=0
while IFS=$'\t' read -r NAME URL; do
  [[ -z "${NAME:-}" || -z "${URL:-}" ]] && continue
  CHECK_COUNT=$((CHECK_COUNT + 1))
  STATUS="$(curl -sSfL -o /dev/null -w "%{http_code}" "$URL" || true)"
  echo "[release:verify] ${NAME} -> ${STATUS} (${URL})"
  if [[ "$STATUS" != "200" ]]; then
    FAIL=1
  fi
done < <(node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("public/update.json", "utf8"));
const rows = [];
if (data.downloadUrl) rows.push(["downloadUrl", data.downloadUrl]);
if (data.notesUrl) rows.push(["notesUrl", data.notesUrl]);
if (data.downloads && typeof data.downloads === "object") {
  for (const key of ["chrome", "edge", "firefox"]) {
    if (typeof data.downloads[key] === "string") rows.push([`downloads.${key}`, data.downloads[key]]);
  }
}
for (const [name, url] of rows) {
  console.log(`${name}\t${url}`);
}
')

if [[ "$CHECK_COUNT" -eq 0 ]]; then
  echo "[release:verify] no urls found in update metadata"
  exit 1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "[release:verify] failed: one or more URLs are not 200"
  exit 1
fi

echo "[release:verify] all URLs reachable"
