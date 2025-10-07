#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == "" ]]; then
  echo "Usage: $0 <ssh-user>@ovida.1976.cloud [site-root] [checkout-dir]" >&2
  echo "Example: $0 deployer@ovida.1976.cloud ~/ovida.1976.cloud ~/ovida-deploy" >&2
  exit 1
fi

TARGET="$1"
SITE_ROOT="${2:-~/ovida.1976.cloud}"
CHECKOUT_DIR="${3:-~/ovida-deploy}"
REPO_URL="${REPO_URL:-https://github.com/ovida/ovida.git}"
BRANCH="${BRANCH:-main}"

ssh "$TARGET" "bash -se" <<EOF_REMOTE
set -euo pipefail
REPO_URL="$REPO_URL"
BRANCH="$BRANCH"
CHECKOUT_DIR="$CHECKOUT_DIR"
SITE_ROOT="$SITE_ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo 'git is required on the remote host' >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack prepare pnpm@8 --activate
  else
    npm install -g pnpm
  fi
fi

if [[ ! -d "$CHECKOUT_DIR" ]]; then
  git clone "$REPO_URL" "$CHECKOUT_DIR"
fi

cd "$CHECKOUT_DIR"

git fetch origin
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi
git reset --hard "origin/$BRANCH"

pnpm install --frozen-lockfile
pnpm --filter @ovida/web build

mkdir -p "$SITE_ROOT" "$SITE_ROOT/.next/static" "$SITE_ROOT/public"
rsync -a --delete apps/web/.next/standalone/ "$SITE_ROOT/"
rsync -a --delete apps/web/.next/static/ "$SITE_ROOT/.next/static/"
rsync -a --delete apps/web/public/ "$SITE_ROOT/public/"

cat > "$SITE_ROOT/README_DEPLOY.txt" <<'INFO'
This directory contains the production build of the Ovida web console.

To start the server:

  cd <site-root>
  NODE_ENV=production PORT=3000 node server.js

Adjust PORT as needed (defaults to 3000).
INFO
EOF_REMOTE
