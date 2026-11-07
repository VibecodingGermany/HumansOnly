#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://humans-only.de}"

check_contains() {
    local value="$1" expected="$2" label="$3"
    if [[ "${value}" != *"${expected}"* ]]; then
        echo "${label} failed. Expected to find '${expected}', got: ${value}" >&2
        exit 1
    fi
}

echo "[1/6] Public availability"
http_code="$(curl -sS -o /tmp/wave6_home.html -w '%{http_code}' "${BASE_URL}/")"
if [[ "${http_code}" != "200" ]]; then
    echo "Home page health failed: HTTP ${http_code}" >&2
    exit 1
fi

echo "[2/6] Health + request-id"
health_headers="$(curl -sSI "${BASE_URL}/api/health")"
health_body="$(curl -sS "${BASE_URL}/api/health")"
check_contains "${health_headers}" "x-request-id:" "x-request-id header"
check_contains "${health_body}" '"success":true' "health response"
check_contains "${health_body}" '"status":"ok"' "health status"

echo "[3/6] Unauthorized protection"
preferences_body="$(curl -sS "${BASE_URL}/api/users/preferences")"
messages_body="$(curl -sS -X POST -H 'Content-Type: application/json' -d '{"recipient":"nobody","text":"test"}' "${BASE_URL}/api/messages/create")"
upload_body="$(curl -sS -X POST "${BASE_URL}/api/upload")"
check_contains "${preferences_body}" '"success":false' "preferences unauthorized"
check_contains "${messages_body}" '"success":false' "messages unauthorized"
check_contains "${upload_body}" '"success":false' "upload unauthorized"

echo "[4/6] Feed/search regression sanity"
feed_body="$(curl -sS "${BASE_URL}/api/tweets/all?page=1")"
search_body="$(curl -sS "${BASE_URL}/api/search?q=wave5%20private%20post")"
check_contains "${feed_body}" '"success":true' "feed response"
check_contains "${search_body}" '"success":true' "search response"

echo "[5/6] Full social smoke"
"$(dirname "$0")/live-social-smoke.sh" "${BASE_URL}" >/tmp/wave6_social_smoke.log

echo "[6/6] Response-time spot checks"
health_time="$(curl -sS -o /dev/null -w '%{time_total}' "${BASE_URL}/api/health")"
feed_time="$(curl -sS -o /dev/null -w '%{time_total}' "${BASE_URL}/api/tweets/all?page=1")"
echo "health_time=${health_time}s"
echo "feed_time=${feed_time}s"

echo "Wave 6 live validation passed for ${BASE_URL}."
