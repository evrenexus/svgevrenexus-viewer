#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${EVRENEXUS_HOST_CONFIG:-$HOME/.config/evrenexus/host.env}"
if [[ -f "$CONFIG" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG"
  set +a
fi

LOG_DIR="${EVRENEXUS_LOG_DIR:-$HOME/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/evrenexus-update.log"
exec >>"$LOG_FILE" 2>&1

echo
echo "===== Evren Nexus host update: $(date -Is) ====="

if [[ -z "${EVRENEXUS_WEBROOT:-}" || ! -d "$EVRENEXUS_WEBROOT" ]]; then
  echo "ERROR: Set EVRENEXUS_WEBROOT to the existing website document root in $CONFIG."
  exit 2
fi
for cmd in python3 node flock; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERROR: required command missing: $cmd"; exit 2; }
done

exec 9>"$HOME/.evrenexus-update.lock"
if ! flock -n 9; then
  echo "Another Evren Nexus job is running; skipping this overlapping run."
  exit 0
fi

cd "$ROOT"
MODE="${1:-news}"
case "$MODE" in news|crypto|cars|all) ;; *) echo "Usage: $0 {news|crypto|cars|all}"; exit 2 ;; esac

is_paused() {
  python3 - <<'PY'
import json
from pathlib import Path
p = Path("data/automation.json")
try:
    state = json.loads(p.read_text(encoding="utf-8"))
except FileNotFoundError:
    state = {}
print("true" if state.get("paused") is True else "false")
PY
}

run_news() {
  if [[ "$(is_paused)" == "true" ]]; then
    echo "News automation is paused; keeping collected news unchanged."
  else
    python3 scripts/test_topic_classification.py
    python3 scripts/news_collector.py
  fi

  # These two market-data steps are required by the current Update All workflow.
  node market-data/fetch-tgju.js
  node market-data/fetch-nobitex.js

  # Match the publication order in the current workflow.
  python3 scripts/reset-editorial-selections.py
  node scripts/build-latest-news.mjs
  node scripts/validate-latest-news.mjs

  # build_public.py is non-blocking in the current workflow. Keep prior outputs if it fails.
  local backup
  backup="$(mktemp -d)"
  local files=(news.json editorial.json policy-terms.json meta.json)
  local name
  for name in "${files[@]}"; do
    if [[ -f "data/public/$name" ]]; then cp -p "data/public/$name" "$backup/$name"; fi
  done
  if python3 scripts/build_public.py; then
    echo "Public data build succeeded."
  else
    echo "WARNING: public data build failed; restoring previous public-data outputs."
    for name in "${files[@]}"; do
      if [[ -f "$backup/$name" ]]; then cp -p "$backup/$name" "data/public/$name"; fi
    done
  fi
  rm -rf "$backup"

  # The workflow treats this as a required publication step.
  node scripts/build-featured.mjs
}

run_crypto() {
  node market-data/fetch-lbank.js
}

run_cars() {
  python3 scripts/fetch-car-prices.py
}

case "$MODE" in
  news) run_news ;;
  crypto) run_crypto ;;
  cars) run_cars ;;
  all) run_news; run_crypto; run_cars ;;
esac

echo "--- Deploying confirmed public website files to $EVRENEXUS_WEBROOT"
python3 "$ROOT/hosting/deploy_static.py" "$EVRENEXUS_WEBROOT"
echo "SUCCESS: Evren Nexus host update finished at $(date -Is)"
