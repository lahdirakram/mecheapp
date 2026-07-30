#!/usr/bin/env bash
# Internal helper — push a JS-only OTA update for a given eas.json build PROFILE to its OTA BRANCH.
# Usage: _ota.sh <app> <profile> <branch> [message]      (app = a directory under apps/)
#
# Why this exists: `eas update` does NOT read eas.json's `env`, so the EXPO_PUBLIC_* keys must be
# exported by hand. Doing it from a script (sourced straight out of eas.json) means the bundle's
# backend ALWAYS matches the channel — no manual key juggling, no risk of shipping prod keys to the
# staging channel (or vice-versa).
#
# The app is a parameter because meche and meche-pro are two SEPARATE EAS projects with their own
# eas.json and their own channels. This script used to hardcode apps/meche, so the Pro app had no
# scripted lane and every Pro OTA was a hand-typed `eas update` with hand-exported keys — the exact
# failure mode the paragraph above exists to prevent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

APP="$1"
PROFILE="$2"
BRANCH="$3"
MSG="${4:-$BRANCH OTA}"

[ -f "$ROOT/apps/$APP/eas.json" ] || { echo "no such app: apps/$APP (missing eas.json)" >&2; exit 1; }
cd "$ROOT/apps/$APP"

# Node 22 required (Node 18 crashes Metro/EAS — see memory build-needs-node-22).
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null

# Export every EXPO_PUBLIC_* from the chosen profile; refuse to run if a placeholder is unfilled.
eval "$(PROFILE="$PROFILE" node -e '
  const p = process.env.PROFILE;
  const env = ((require("./eas.json").build[p]) || {}).env || {};
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith("EXPO_PUBLIC_")) continue;
    if (String(v).startsWith("REPLACE_ME")) {
      console.error("eas.json placeholder not filled: " + k + " (profile " + p + ")");
      process.exit(1);
    }
    console.log("export " + k + "=" + JSON.stringify(v));
  }
')"

echo "→ OTA: app=$APP  profile=$PROFILE  branch=$BRANCH  backend=$EXPO_PUBLIC_SUPABASE_URL"
npx eas-cli@20.3.0 update --branch "$BRANCH" --message "$MSG" --environment production --non-interactive
