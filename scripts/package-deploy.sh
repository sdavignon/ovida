#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage: scripts/package-deploy.sh [options]

Builds the monorepo, verifies quality gates, and prepares a deployable bundle
in the ./deploy directory (matching the GitHub Actions workflow output).

Options:
  --skip-install   Do not run pnpm install before building.
  --skip-lint      Do not run pnpm lint before building.
  --skip-tests     Do not run pnpm test before building.
  --output DIR     Override the deploy output directory (default: deploy).
  -h, --help       Show this message and exit.
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
run_lint=1
run_tests=1
output_dir="deploy"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      run_install=0
      shift
      ;;
    --skip-lint)
      run_lint=0
      shift
      ;;
    --skip-tests)
      run_tests=0
      shift
      ;;
    --output)
      if [[ $# -lt 2 ]]; then
        error "--output requires a directory argument"
        exit 1
      fi
      output_dir="$2"
      shift 2
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

need_cmd rsync || {
  error "Install rsync to prepare the deployment package."
  exit 1
}

if (( run_install )); then
  info "Installing workspace dependencies"
  pnpm install
else
  info "Skipping dependency installation (per flag)"
fi

if (( run_lint )); then
  info "Running lint checks"
  pnpm lint
else
  info "Skipping lint checks (per flag)"
fi

if (( run_tests )); then
  info "Running test suite"
  pnpm test
else
  info "Skipping tests (per flag)"
fi

info "Building workspaces"
pnpm build

info "Preparing deployment directory at '$output_dir'"
rm -rf "$output_dir"
mkdir -p "$output_dir"

rsync -a --delete \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='node_modules/' \
  --exclude="$output_dir/" \
  --exclude='supabase/.branches/' \
  ./ "$output_dir"/

bundle_name="$(basename "$output_dir").tar.gz"
info "Creating archive $bundle_name"
rm -f "$bundle_name"
tar -czf "$bundle_name" -C "$output_dir" .

info "Deployment bundle ready: $bundle_name (contents in '$output_dir/')"
info "Upload the archive via the existing SFTP workflow or preferred channel."
