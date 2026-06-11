#!/usr/bin/env bash
#
# dev.sh — start the LeadMax stack (Postgres + FastAPI API + Next.js web)
# with one command. Ctrl-C stops everything.
#
# Usage:
#   ./dev.sh            # start db (if needed) + api + web
#   ./dev.sh --no-db    # skip the Postgres/docker step
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

API_HOST="0.0.0.0"
API_PORT="8000"
WEB_PORT="3000"

START_DB=1
[[ "${1:-}" == "--no-db" ]] && START_DB=0

# ── Pretty logging ────────────────────────────────────────────────────────────
c_api="\033[36m"; c_web="\033[35m"; c_sys="\033[33m"; c_off="\033[0m"
log()    { printf "${c_sys}[dev]${c_off} %s\n" "$*"; }
prefix() { sed -u "s/^/$(printf "$1")/"; }   # GNU sed -u = line-buffered

# Kill the whole process group (api, web, and their child workers) on exit.
cleanup() { trap - EXIT INT TERM; log "shutting down…"; kill 0 2>/dev/null; }
trap cleanup EXIT INT TERM

# ── 1. Postgres (Docker) ───────────────────────────────────────────────────────
if [[ "$START_DB" == "1" ]]; then
  if command -v docker >/dev/null 2>&1; then
    log "ensuring Postgres is up (docker compose)…"
    if (cd "$ROOT" && docker compose up -d postgres >/dev/null 2>&1); then
      log "Postgres ready on :5433"
    else
      log "could not start Postgres via docker — continuing (use --no-db to silence)"
    fi
  else
    log "docker not found — skipping Postgres (assuming it's already running)"
  fi
fi

# ── 2. Backend (FastAPI / uvicorn) ──────────────────────────────────────────────
if [[ ! -x "$API_DIR/.venv/bin/uvicorn" ]]; then
  log "ERROR: $API_DIR/.venv/bin/uvicorn not found. Create the venv and install deps first."
  exit 1
fi
log "starting API → http://localhost:$API_PORT  (docs: /docs)"
( cd "$API_DIR" && exec .venv/bin/uvicorn app.main:app --reload --host "$API_HOST" --port "$API_PORT" ) \
  2>&1 | prefix "${c_api}[api]${c_off} " &

# ── 3. Frontend (Next.js) ───────────────────────────────────────────────────────
if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  log "web dependencies missing — running npm install…"
  ( cd "$WEB_DIR" && npm install )
fi
log "starting web → http://localhost:$WEB_PORT"
( cd "$WEB_DIR" && exec npm run dev ) \
  2>&1 | prefix "${c_web}[web]${c_off} " &

log "stack is up — API:$API_PORT  WEB:$WEB_PORT   (press Ctrl-C to stop)"
wait
