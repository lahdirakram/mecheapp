#!/usr/bin/env bash
# Ship a JS-only change to MÈCHE PRO on PRODUCTION (production channel → prod backend).
# Only run this after the same change is validated on staging.
#
# CAREFUL, this channel is not "nobody" yet: the Pro app is not on sale, so the production channel
# is consumed by the TestFlight build (1.0.0 (4)) that is ATTACHED to the pending App Store
# submission. Whatever sits on this channel is what an Apple reviewer runs.
# Usage: ./scripts/ota-pro-prod.sh "what changed"
set -euo pipefail
exec "$(dirname "$0")/_ota.sh" meche-pro production production "${1:-prod OTA}"
