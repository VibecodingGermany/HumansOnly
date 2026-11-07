#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"

DEPLOY_HOST="${DEPLOY_HOST:-5.182.17.148}"
DEPLOY_PORT="${DEPLOY_PORT:-2222}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/humansonly}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_vibecoding}"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

if [[ ! -f "${DEPLOY_KEY}" ]]; then
    echo "Missing SSH key at ${DEPLOY_KEY}" >&2
    exit 1
fi

echo "Deploy target: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH} (port ${DEPLOY_PORT})"
echo "Dry run: ${DRY_RUN}"

RSYNC_OPTS=(
    -az
    --delete
    --exclude ".git"
    --exclude "node_modules"
    --exclude ".next"
    --exclude ".env.local"
    --exclude ".env"
    --exclude ".env.backup*"
    --exclude "public/uploads"
)

if [[ "${DRY_RUN}" == "true" ]]; then
    RSYNC_OPTS+=(-n -v)
fi

rsync "${RSYNC_OPTS[@]}" \
    -e "ssh -i ${DEPLOY_KEY} -p ${DEPLOY_PORT} -o StrictHostKeyChecking=accept-new" \
    "${APP_DIR}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "Dry run complete."
    exit 0
fi

ssh -i "${DEPLOY_KEY}" -p "${DEPLOY_PORT}" -o StrictHostKeyChecking=accept-new \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<EOF
set -euo pipefail
cd "${DEPLOY_PATH}"
npm ci
cd src
npx prisma migrate deploy
npx prisma generate
cd ..
npm run build
NODE_ENV=production pm2 restart humansonly --update-env
pm2 save
for attempt in {1..12}; do
  HTTP_CODE=\$(curl -sS -o /tmp/humansonly_health.html -w '%{http_code}' http://127.0.0.1:3001/ || true)
  if [[ "\${HTTP_CODE}" == "200" ]]; then
    echo "Remote deployment successful (HTTP \${HTTP_CODE})."
    exit 0
  fi
  sleep 2
done
echo "Health probe failed after retries." >&2
exit 1
EOF

echo "Deployment completed successfully."
