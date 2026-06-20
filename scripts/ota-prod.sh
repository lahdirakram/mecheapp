#!/usr/bin/env bash
# Ship a JS-only change to PRODUCTION (production channel → prod backend = real users).
# Only run this after the same change is validated on staging.
# Requires the production env in eas.json to be filled (no REPLACE_ME placeholders).
# Usage: ./scripts/ota-prod.sh "what changed"
set -euo pipefail
exec "$(dirname "$0")/_ota.sh" production production "${1:-prod OTA}"
