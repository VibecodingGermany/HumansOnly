#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"

configure_prisma_env() {
    local original_node_env="${NODE_ENV-}"
    if [[ -f "${APP_DIR}/.env" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "${APP_DIR}/.env"
        set +a
    fi
    if [[ -n "${original_node_env}" ]]; then
        export NODE_ENV="${original_node_env}"
    else
        unset NODE_ENV
    fi
    if [[ -z "${DATABASE_URL:-}" ]]; then
        export DATABASE_URL="postgresql://ci:ci@127.0.0.1:5432/humansonly_ci?schema=public"
    fi
    if [[ -z "${DIRECT_DATABASE_URL:-}" && -n "${DATABASE_URL:-}" ]]; then
        export DIRECT_DATABASE_URL="${DATABASE_URL}"
    fi
}

configure_prisma_env

echo "[1/4] Install dependencies"
cd "${APP_DIR}"
npm ci

echo "[2/4] Lint"
npm run lint

echo "[3/4] Build"
npm run build

echo "[4/4] Prisma schema validate"
cd "${APP_DIR}/src"
npx prisma validate

echo "CI quality checks passed."
