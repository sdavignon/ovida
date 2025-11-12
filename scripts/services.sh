#!/usr/bin/env bash
# Service management script for Ovida API and WebSocket services
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

show_help() {
  cat <<'USAGE'
Usage: scripts/services.sh <command>

Manage Ovida API and WebSocket services with PM2.

Commands:
  start       Start all services
  stop        Stop all services
  restart     Restart all services
  reload      Reload services (zero-downtime)
  status      Show service status
  logs        Show service logs (follow mode)
  logs:api    Show API service logs only
  logs:ws     Show WebSocket service logs only
  monit       Open PM2 monitoring dashboard
  delete      Stop and delete all services from PM2
  startup     Configure services to start on system boot
  save        Save current PM2 process list

Examples:
  scripts/services.sh start       # Start all services
  scripts/services.sh logs        # View all logs
  scripts/services.sh restart     # Restart all services

Prerequisites:
  - PM2 installed: npm install -g pm2
  - Services built: pnpm build
  - .env file configured

For production deployment, use: scripts/deploy/services.sh
USAGE
}

info() { printf '\033[1;34m[info]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[err]\033[0m %s\n' "$*"; }

check_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    error "PM2 is not installed. Install it with:"
    error "  npm install -g pm2"
    exit 1
  fi
}

check_builds() {
  if [[ ! -f apps/api/dist/index.js ]]; then
    error "API build not found. Run: pnpm --filter @ovida/api build"
    exit 1
  fi
  if [[ ! -f apps/ws/dist/index.js ]]; then
    error "WebSocket build not found. Run: pnpm --filter @ovida/ws build"
    exit 1
  fi
}

COMMAND="${1:-}"

case "$COMMAND" in
  start)
    check_pm2
    check_builds
    info "Starting services..."
    mkdir -p logs
    pm2 start ecosystem.config.cjs
    info "Services started!"
    pm2 list
    ;;

  stop)
    check_pm2
    info "Stopping services..."
    pm2 stop ecosystem.config.cjs
    info "Services stopped"
    ;;

  restart)
    check_pm2
    info "Restarting services..."
    pm2 restart ecosystem.config.cjs
    info "Services restarted!"
    pm2 list
    ;;

  reload)
    check_pm2
    info "Reloading services (zero-downtime)..."
    pm2 reload ecosystem.config.cjs
    info "Services reloaded!"
    pm2 list
    ;;

  status)
    check_pm2
    pm2 list
    ;;

  logs)
    check_pm2
    pm2 logs
    ;;

  logs:api)
    check_pm2
    pm2 logs ovida-api
    ;;

  logs:ws)
    check_pm2
    pm2 logs ovida-ws
    ;;

  monit)
    check_pm2
    pm2 monit
    ;;

  delete)
    check_pm2
    info "Stopping and deleting all services..."
    pm2 delete ecosystem.config.cjs || true
    info "Services deleted from PM2"
    ;;

  startup)
    check_pm2
    info "Configuring PM2 to start on system boot..."
    pm2 startup
    info ""
    info "After running the command above, save the process list with:"
    info "  scripts/services.sh save"
    ;;

  save)
    check_pm2
    info "Saving PM2 process list..."
    pm2 save
    info "Process list saved!"
    ;;

  -h|--help|help|"")
    show_help
    exit 0
    ;;

  *)
    error "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac
