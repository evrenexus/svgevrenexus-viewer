#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${EVRENEXUS_HOST_CONFIG:-$HOME/.config/evrenexus/host.env}"
if [[ -f "$CONFIG" ]]; then
  # This file must be owned by the hosting account and not stored in the repository.
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

# Prevent cron jobs from editing the same JSON files at the same time.
exec 9>"$HOME/.evrenexus-update.lock"
if ! flock -n 9; then
  echo "Another Evren Nexus job is running; skipping this overlapping run."
  exit 0
fi

cd "$ROOT"
MODE="${1:-news}"
case "$MODE" in news|crypto|cars|all) ;; *) echo "Usage: $0 {news|crypto|cars|all}"; exit 2 ;; esac

run_optional() {
  echo "--- $*"
  if "$@"; then
    return 0
  else
    rc=$?
    echo "WARNING: optional step failed (exit $rc): $*"
    return 0
  fi
}

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

  # Market sources are optional for news publication; keep their previous JSON on failure.
  run_optional node market-data/fetch-tgju.js
  run_optional node market-data/fetch-nobitex.js

  # The standalone latest-news feed is mandatory and validated before copying to the website.
  node scripts/build-latest-news.mjs
  node scripts/validate-latest-news.mjs

  # These additional public/editorial builders must not block the latest-news feed.
  run_optional python3 scripts/build_public.py
  run_optional node scripts/build-featured.mjs
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

echo "--- Deploying static website files to $EVRENEXUS_WEBROOT"
python3 "$ROOT/hosting/deploy_static.py" "$EVRENEXUS_WEBROOT"
echo "SUCCESS: Evren Nexus host update finished at $(date -Is)"
