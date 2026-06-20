#!/usr/bin/env bash
# Ship a JS-only change to STAGING (preview channel → staging backend). Test it on your TestFlight /
# Play-internal build before promoting to prod with ota-prod.sh.
# Usage: ./scripts/ota-staging.sh "what changed"
set -euo pipefail
exec "$(dirname "$0")/_ota.sh" preview preview "${1:-staging OTA}"
