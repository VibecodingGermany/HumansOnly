#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
USERNAME="smoke$(date +%s)"
PASSWORD="SmokePass123!"
COOKIE_FILE="$(mktemp)"
USER_CREATED="0"

extract_status() {
    local response="$1"
    printf '%s' "${response##*$'\n'}"
}

extract_body() {
    local response="$1"
    printf '%s' "${response%$'\n'*}"
}

cleanup_smoke_user() {
    if [[ "${USER_CREATED}" != "1" ]]; then
        return 0
    fi

    local delete_payload delete_response delete_status delete_body
    echo "[cleanup] Delete smoke user: ${USERNAME}"

    delete_payload=$(printf '{"password":"%s","confirmUsername":"%s"}' "${PASSWORD}" "${USERNAME}")
    delete_response="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" -H 'Content-Type: application/json' -d "${delete_payload}" -w '\n%{http_code}' "${BASE_URL}/api/users/me/delete")"
    delete_status="$(extract_status "${delete_response}")"
    delete_body="$(extract_body "${delete_response}")"

    if [[ "${delete_status}" != "200" || "${delete_body}" != *'"success":true'* ]]; then
        echo "Cleanup failed for ${USERNAME}: HTTP ${delete_status}: ${delete_body}" >&2
        return 1
    fi

    USER_CREATED="0"
    return 0
}

on_exit() {
    local exit_code="$?"
    local cleanup_failed="0"

    trap - EXIT

    if ! cleanup_smoke_user; then
        cleanup_failed="1"
    fi

    rm -f "${COOKIE_FILE}"

    if [[ "${exit_code}" == "0" && "${cleanup_failed}" == "1" ]]; then
        exit 1
    fi

    exit "${exit_code}"
}
trap on_exit EXIT

create_payload=$(printf '{"username":"%s","password":"%s","name":"Smoke User","description":"auth smoke"}' "${USERNAME}" "${PASSWORD}")
login_payload=$(printf '{"username":"%s","password":"%s"}' "${USERNAME}" "${PASSWORD}")

echo "[1/3] Create user: ${USERNAME}"
create_response="$(curl -sS -c "${COOKIE_FILE}" -H 'Content-Type: application/json' -d "${create_payload}" "${BASE_URL}/api/users/create")"
if [[ "${create_response}" != *"\"success\":true"* ]]; then
    echo "Create failed: ${create_response}" >&2
    exit 1
fi
USER_CREATED="1"

echo "[2/3] Login user: ${USERNAME}"
login_response="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" -H 'Content-Type: application/json' -d "${login_payload}" "${BASE_URL}/api/auth/login")"
if [[ "${login_response}" != *"\"success\":true"* ]]; then
    echo "Login failed: ${login_response}" >&2
    exit 1
fi

token="$(awk '$6=="token"{print $7}' "${COOKIE_FILE}" | tail -n1)"
if [[ -z "${token}" ]]; then
    echo "Verify failed: no token cookie set." >&2
    exit 1
fi

echo "[3/3] Verify token payload"
verify_response="$(curl -sS -H 'Content-Type: application/json' -d "{\"token\":\"${token}\"}" "${BASE_URL}/api/auth/verify")"
if [[ "${verify_response}" != *"\"username\":\"${USERNAME}\""* ]]; then
    echo "Verify failed: ${verify_response}" >&2
    exit 1
fi

echo "Auth smoke passed."
