#!/usr/bin/env bash
# Ship a JS-only change to MÈCHE PRO on STAGING (preview channel → staging backend). Test it on the
# staging build (com.mechepro.app.staging) before promoting to prod with ota-pro-prod.sh.
# Usage: ./scripts/ota-pro-staging.sh "what changed"
set -euo pipefail
exec "$(dirname "$0")/_ota.sh" meche-pro preview preview "${1:-staging OTA}"
