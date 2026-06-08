#!/usr/bin/env bash
set -euo pipefail

API_NAME="ovida-api"
API_DIR="apps/api"
API_PORT="${PORT:-4000}"
PID_DIR=".pids"
LOG_DIR="logs"

printf '🚀 OVIDA service build/start\n'
printf '===========================\n'

printf '📦 Installing workspace dependencies...\n'
pnpm install --frozen-lockfile

printf '🏗️ Building web static export...\n'
pnpm --filter @ovida/web build

printf '🏗️ Building API service...\n'
pnpm --filter @ovida/schemas build
pnpm --filter @ovida/api build

if [ ! -f "${API_DIR}/.env" ]; then
  cat <<MSG
❌ Missing ${API_DIR}/.env.
Create it before starting the VPS API service. Required values include:
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  VIDEO_API_KEY
  APP_ORIGIN=https://ovida.1976.cloud
  API_ORIGIN=https://ovida.1976.cloud
  PORT=${API_PORT}
MSG
  exit 1
fi

mkdir -p "${PID_DIR}" "${LOG_DIR}"

printf '🚀 Starting Fastify API on 127.0.0.1:%s...\n' "${API_PORT}"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${API_NAME}" >/dev/null 2>&1; then
    (cd "${API_DIR}" && pm2 restart "${API_NAME}" --update-env)
  else
    (cd "${API_DIR}" && pm2 start dist/index.js --name "${API_NAME}" --update-env)
  fi
  pm2 save || true
else
  if [ -f "${PID_DIR}/api.pid" ]; then
    old_pid="$(cat "${PID_DIR}/api.pid")"
    if [ -n "${old_pid}" ]; then
      kill "${old_pid}" 2>/dev/null || true
    fi
  fi
  (cd "${API_DIR}" && nohup node dist/index.js > "../../${LOG_DIR}/api.log" 2>&1 & echo $! > "../../${PID_DIR}/api.pid")
fi

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  status="$(curl -s -o /tmp/ovida-api-health.txt -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/v1/jobs/deploy-smoke" || true)"
  if [ "${status}" = "401" ] || [ "${status}" = "404" ]; then
    printf '✅ API service is reachable on http://127.0.0.1:%s (HTTP %s).\n' "${API_PORT}" "${status}"
    printf '✅ Static web output is in apps/web/out.\n'
    exit 0
  fi
  printf 'Waiting for API service (attempt %s, HTTP %s)...\n' "${attempt}" "${status}"
  sleep 2
done

printf '❌ API service did not become reachable on http://127.0.0.1:%s.\n' "${API_PORT}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 logs "${API_NAME}" --lines 80 --nostream || true
else
  tail -n 80 "${LOG_DIR}/api.log" || true
fi
exit 1
