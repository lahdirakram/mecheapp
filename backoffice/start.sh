#!/usr/bin/env bash
# Lance le backoffice en local. Usage : ./backoffice/start.sh   (ou PORT=3200 ./backoffice/start.sh)
#
# Vérifie tout ce qui a déjà cassé au moins une fois : version de Node, .env.local complet,
# dépendances installées, port libre. Puis rappelle sur quel backend on est branché avant
# d'ouvrir le serveur, parce que c'est de la donnée réelle en lecture.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3100}"

# ── Node 22 : le monorepo tourne par défaut sur du Node 18, qui ne convient pas (CLAUDE.md).
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node introuvable." >&2
  exit 1
fi

major="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
if [ "$major" -lt 20 ]; then
  echo "✗ Node $major détecté, il en faut au moins 20 (22 recommandé)." >&2
  echo "  → source ~/.nvm/nvm.sh && nvm use 22" >&2
  exit 1
fi

# ── Configuration
if [ ! -f .env.local ]; then
  echo "✗ backoffice/.env.local manquant." >&2
  echo "  → cp .env.example .env.local puis remplis les valeurs" >&2
  exit 1
fi

missing=()
for v in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DATABASE_URL; do
  grep -qE "^${v}=.+" .env.local || missing+=("$v")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "✗ Vide dans .env.local : ${missing[*]}" >&2
  echo "  DATABASE_URL doit être la chaîne du Session pooler (pas Transaction)." >&2
  exit 1
fi

# ── Dépendances
if [ ! -d node_modules ]; then
  echo "→ Installation des dépendances…"
  npm install
fi

# ── Port libre ? Un `next dev` oublié est le cas le plus courant.
if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "✗ Le port $PORT est déjà occupé (pid $(lsof -ti:"$PORT" | tr '\n' ' '))." >&2
  echo "  → lsof -ti:$PORT | xargs kill    ou    PORT=$((PORT + 1)) $0" >&2
  exit 1
fi

# ── Sur quel backend ? Même logique que le bandeau de l'app.
url="$(grep -E '^SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
case "$url" in
  *hqhnvjjbohzktoapsytj*) env_label="PROD ⚠  données réelles" ;;
  *vefxfjcdvstjwieasrbq*) env_label="STAGING" ;;
  *127.0.0.1*|*localhost*) env_label="LOCAL (supabase start)" ;;
  *) env_label="INCONNU — $url" ;;
esac

echo "┌─ Backoffice Mèche"
echo "│  backend : $env_label"
echo "│  accès   : http://127.0.0.1:$PORT   (loopback uniquement, lecture seule)"
echo "└─ Ctrl-C pour arrêter"
echo

exec ./node_modules/.bin/next dev -H 127.0.0.1 -p "$PORT"
