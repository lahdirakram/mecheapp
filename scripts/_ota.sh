#!/usr/bin/env bash
# Internal helper — push a JS-only OTA update for a given eas.json build PROFILE to its OTA BRANCH.
# Usage: _ota.sh <profile> <branch> [message]
#
# Why this exists: `eas update` does NOT read eas.json's `env`, so the EXPO_PUBLIC_* keys must be
# exported by hand. Doing it from a script (sourced straight out of eas.json) means the bundle's
# backend ALWAYS matches the channel — no manual key juggling, no risk of shipping prod keys to the
# staging channel (or vice-versa).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/meche"

PROFILE="$1"
BRANCH="$2"
MSG="${3:-$BRANCH OTA}"

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

echo "→ OTA: profile=$PROFILE  branch=$BRANCH  backend=$EXPO_PUBLIC_SUPABASE_URL"
npx eas-cli@20.3.0 update --branch "$BRANCH" --message "$MSG" --environment production --non-interactive
