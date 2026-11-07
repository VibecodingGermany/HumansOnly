#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"

echo "[1/3] Lint"
cd "${APP_DIR}"
npm run lint

echo "[2/3] Build"
npm run build

echo "[3/3] Prisma migration status"
cd "${APP_DIR}/src"
if [[ -f "${APP_DIR}/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${APP_DIR}/.env"
    set +a
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
    export DATABASE_URL="postgresql://ci:ci@127.0.0.1:5432/humansonly_ci?schema=public"
fi
if [[ -z "${DIRECT_DATABASE_URL:-}" && -n "${DATABASE_URL:-}" ]]; then
    export DIRECT_DATABASE_URL="${DATABASE_URL}"
fi
npx prisma migrate status

echo
echo "Baseline checks passed."
