#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage: scripts/setup-local.sh [options]

Bootstraps the local development environment by installing dependencies,
ensuring environment files exist, and (optionally) bringing up the Supabase
stack with the latest migrations and seed data.

Options:
  --no-install        Skip running pnpm install.
  --no-supabase       Skip Supabase startup, migrations, and seed data.
  --no-seed           Skip loading seed data (still starts Supabase unless
                      --no-supabase is also provided).
  -h, --help          Show this help message and exit.
USAGE
}

info() { printf '\033[1;34m[info]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[err]\033[0m %s\n' "$*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Required command '$1' is not available."
    return 1
  fi
}

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

run_install=1
run_supabase=1
run_seed=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install)
      run_install=0
      shift
      ;;
    --no-supabase)
      run_supabase=0
      shift
      ;;
    --no-seed)
      run_seed=0
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

need_cmd pnpm || {
  error "Install pnpm (https://pnpm.io/installation) before running this script."
  exit 1
}

if (( run_supabase )); then
  missing=()
  for cmd in supabase docker make; do
    if ! need_cmd "$cmd"; then
      missing+=("$cmd")
    fi
  done
  if (( ${#missing[@]} > 0 )); then
    error "Supabase setup requested but missing commands: ${missing[*]}"
    warn "Re-run with --no-supabase to skip Supabase bootstrap."
    exit 1
  fi
fi

if [[ ! -f .env ]]; then
  info "Creating .env from .env.example"
  cp .env.example .env
  warn "Review .env and update credentials before running the services."
fi

if (( run_install )); then
  info "Installing workspace dependencies with pnpm"
  pnpm install
else
  info "Skipping pnpm install (per flag)"
fi

if (( run_supabase )); then
  info "Starting Supabase containers"
  make supabase.up

  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    source .env >/dev/null 2>&1 || true
  fi

  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    warn "SUPABASE_DB_URL is not set; migrations may fail. Set it in .env."
  fi

  info "Applying Supabase migrations"
  make supabase.mig

  if (( run_seed )); then
    info "Loading seed data"
    make seed
  else
    info "Skipping seed data load (per flag)"
  fi
else
  info "Skipping Supabase bootstrap (per flag)"
fi

info "Local environment is ready. Use 'make dev' to start the services."
