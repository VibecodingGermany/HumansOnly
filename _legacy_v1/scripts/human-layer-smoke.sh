#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
USERNAME="humanlayer$(date +%s)"
PASSWORD="HumanLayerPass123!"
COOKIE_FILE="$(mktemp)"
SMOKE_POST_PREFIX="human-layer-smoke-"
USER_CREATED="0"

extract_json_string() {
    local json="$1"
    local key="$2"
    echo "${json}" | rg -o "\"${key}\":\"[^\"]+\"" | head -n1 | sed "s/\"${key}\":\"//;s/\"$//"
}

request_with_status() {
    local method="$1"
    local url="$2"
    local body="${3:-}"

    if [[ "${method}" == "GET" ]]; then
        curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" -w '\n%{http_code}' "${url}"
        return
    fi

    curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" \
        -X "${method}" \
        -H "Content-Type: application/json" \
        -d "${body}" \
        -w '\n%{http_code}' \
        "${url}"
}

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
    delete_response="$(request_with_status POST "${BASE_URL}/api/users/me/delete" "${delete_payload}")"
    delete_status="$(extract_status "${delete_response}")"
    delete_body="$(extract_body "${delete_response}")"

    if [[ "${delete_status}" != "200" || "${delete_body}" != *'"success":true'* ]]; then
        echo "Cleanup user failed for ${USERNAME}: HTTP ${delete_status}: ${delete_body}" >&2
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

cleanup_smoke_posts() {
    local tweets_json ids delete_response delete_status delete_body
    tweets_json="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" "${BASE_URL}/api/tweets/${USERNAME}")"
    ids="$(printf '%s' "${tweets_json}" | node -e '
let s = "";
const prefix = process.argv[1] || "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(s);
    const tweets = Array.isArray(json.tweets) ? json.tweets : [];
    for (const tweet of tweets) {
      if (
        typeof tweet?.id === "string" &&
        typeof tweet?.text === "string" &&
        tweet.text.startsWith(prefix)
      ) {
        process.stdout.write(`${tweet.id}\n`);
      }
    }
  } catch {
    // best effort cleanup only
  }
});
' "${SMOKE_POST_PREFIX}")"

    if [[ -z "${ids}" ]]; then
        echo "No smoke posts to clean up."
        return 0
    fi

    while IFS= read -r tweet_id; do
        [[ -z "${tweet_id}" ]] && continue
        delete_response="$(request_with_status POST "${BASE_URL}/api/tweets/${USERNAME}/${tweet_id}/delete" '{}')"
        delete_status="$(extract_status "${delete_response}")"
        delete_body="$(extract_body "${delete_response}")"
        if [[ "${delete_status}" != "200" || "${delete_body}" != *'"success":true'* ]]; then
            echo "Warning: cleanup delete failed for ${tweet_id}: HTTP ${delete_status}: ${delete_body}" >&2
        fi
    done <<< "${ids}"
}

echo "[1/10] Create and login smoke user (${USERNAME})"
create_payload=$(printf '{"username":"%s","password":"%s","name":"Human Layer Smoke"}' "${USERNAME}" "${PASSWORD}")
login_payload=$(printf '{"username":"%s","password":"%s"}' "${USERNAME}" "${PASSWORD}")

create_response="$(curl -sS -c "${COOKIE_FILE}" -H 'Content-Type: application/json' -d "${create_payload}" "${BASE_URL}/api/users/create")"
if [[ "${create_response}" != *'"success":true'* ]]; then
    echo "Create user failed: ${create_response}" >&2
    exit 1
fi
USER_CREATED="1"

login_response="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" -H 'Content-Type: application/json' -d "${login_payload}" "${BASE_URL}/api/auth/login")"
if [[ "${login_response}" != *'"success":true'* ]]; then
    echo "Login failed: ${login_response}" >&2
    exit 1
fi

echo "[2/10] Rules endpoint: current policy metadata"
rules_current="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" "${BASE_URL}/api/rules/current")"
if [[ "${rules_current}" != *'"success":true'* ]]; then
    echo "Rules current failed: ${rules_current}" >&2
    exit 1
fi

version="$(extract_json_string "${rules_current}" "version")"
checksum="$(extract_json_string "${rules_current}" "checksum")"
if [[ -z "${version}" || -z "${checksum}" ]]; then
    echo "Could not parse rules version/checksum: ${rules_current}" >&2
    exit 1
fi

echo "[3/10] Rules endpoint: reject bad checksum"
accept_bad_raw="$(request_with_status POST "${BASE_URL}/api/rules/accept" "{\"version\":\"${version}\",\"checksum\":\"deadbeef\"}")"
accept_bad_status="$(extract_status "${accept_bad_raw}")"
accept_bad_body="$(extract_body "${accept_bad_raw}")"
if [[ "${accept_bad_status}" != "409" || "${accept_bad_body}" != *'"success":false'* ]]; then
    echo "Expected 409 on bad rules checksum, got ${accept_bad_status}: ${accept_bad_body}" >&2
    exit 1
fi

echo "[4/10] Rules endpoint: accept current policy"
accept_good_raw="$(request_with_status POST "${BASE_URL}/api/rules/accept" "{\"version\":\"${version}\",\"checksum\":\"${checksum}\"}")"
accept_good_status="$(extract_status "${accept_good_raw}")"
accept_good_body="$(extract_body "${accept_good_raw}")"
if [[ "${accept_good_status}" != "200" || "${accept_good_body}" != *'"success":true'* || "${accept_good_body}" != *'"accepted":true'* ]]; then
    echo "Rules accept failed: HTTP ${accept_good_status}: ${accept_good_body}" >&2
    exit 1
fi

rules_current_after="$(curl -sS -b "${COOKIE_FILE}" -c "${COOKIE_FILE}" "${BASE_URL}/api/rules/current")"
if [[ "${rules_current_after}" != *'"accepted":true'* ]]; then
    echo "Rules acceptance state not persisted: ${rules_current_after}" >&2
    exit 1
fi

echo "[5/10] Trust + self-authenticity endpoints"
trust_raw="$(request_with_status GET "${BASE_URL}/api/me/trust")"
trust_status="$(extract_status "${trust_raw}")"
trust_body="$(extract_body "${trust_raw}")"
if [[ "${trust_status}" != "200" || "${trust_body}" != *'"success":true'* || "${trust_body}" != *'"tier":"'* ]]; then
    echo "Trust endpoint failed: HTTP ${trust_status}: ${trust_body}" >&2
    exit 1
fi

moderation_raw="$(request_with_status GET "${BASE_URL}/api/moderation/authenticity?status=open&limit=1")"
moderation_status="$(extract_status "${moderation_raw}")"
moderation_body="$(extract_body "${moderation_raw}")"
if [[ "${moderation_status}" != "403" || "${moderation_body}" != *'"success":false'* ]]; then
    echo "Expected moderator guard on authenticity queue, got ${moderation_status}: ${moderation_body}" >&2
    exit 1
fi

my_authenticity_raw="$(request_with_status GET "${BASE_URL}/api/me/authenticity?status=all&limit=5")"
my_authenticity_status="$(extract_status "${my_authenticity_raw}")"
my_authenticity_body="$(extract_body "${my_authenticity_raw}")"
if [[ "${my_authenticity_status}" != "200" || "${my_authenticity_body}" != *'"success":true'* || "${my_authenticity_body}" != *'"checks":'* ]]; then
    echo "My authenticity endpoint failed: HTTP ${my_authenticity_status}: ${my_authenticity_body}" >&2
    exit 1
fi

echo "[6/10] Appeals endpoint basic validation + moderation guards"
my_appeals_raw="$(request_with_status GET "${BASE_URL}/api/authenticity/appeals")"
my_appeals_status="$(extract_status "${my_appeals_raw}")"
my_appeals_body="$(extract_body "${my_appeals_raw}")"
if [[ "${my_appeals_status}" != "200" || "${my_appeals_body}" != *'"success":true'* || "${my_appeals_body}" != *'"appeals":'* ]]; then
    echo "My appeals endpoint failed: HTTP ${my_appeals_status}: ${my_appeals_body}" >&2
    exit 1
fi

submit_appeal_bad_raw="$(request_with_status POST "${BASE_URL}/api/authenticity/appeals" '{"reason":"test"}')"
submit_appeal_bad_status="$(extract_status "${submit_appeal_bad_raw}")"
submit_appeal_bad_body="$(extract_body "${submit_appeal_bad_raw}")"
if [[ "${submit_appeal_bad_status}" != "400" || "${submit_appeal_bad_body}" != *'"success":false'* ]]; then
    echo "Expected 400 on missing checkId for appeal, got ${submit_appeal_bad_status}: ${submit_appeal_bad_body}" >&2
    exit 1
fi

moderation_appeals_raw="$(request_with_status GET "${BASE_URL}/api/moderation/authenticity/appeals?status=open&limit=1")"
moderation_appeals_status="$(extract_status "${moderation_appeals_raw}")"
moderation_appeals_body="$(extract_body "${moderation_appeals_raw}")"
if [[ "${moderation_appeals_status}" != "403" || "${moderation_appeals_body}" != *'"success":false'* ]]; then
    echo "Expected moderator guard on appeals queue, got ${moderation_appeals_status}: ${moderation_appeals_body}" >&2
    exit 1
fi

echo "[7/10] Challenge endpoint input validation"
challenge_invalid_raw="$(request_with_status POST "${BASE_URL}/api/human/challenge/verify" '{"action":"invalid_action"}')"
challenge_invalid_status="$(extract_status "${challenge_invalid_raw}")"
challenge_invalid_body="$(extract_body "${challenge_invalid_raw}")"
if [[ "${challenge_invalid_status}" != "400" || "${challenge_invalid_body}" != *'"success":false'* ]]; then
    echo "Expected invalid action rejection, got ${challenge_invalid_status}: ${challenge_invalid_body}" >&2
    exit 1
fi

echo "[8/10] Challenge + post gating behavior (adaptive to dry-run/strict)"
challenge_probe_raw="$(request_with_status POST "${BASE_URL}/api/human/challenge/verify" "{\"action\":\"post_create\",\"ruleVersion\":\"${version}\"}")"
challenge_probe_status="$(extract_status "${challenge_probe_raw}")"
challenge_probe_body="$(extract_body "${challenge_probe_raw}")"

tweet_text="${SMOKE_POST_PREFIX}$(date +%s)"

if [[ "${challenge_probe_status}" == "200" && "${challenge_probe_body}" == *'"success":true'* ]]; then
    challenge_session_id="$(extract_json_string "${challenge_probe_body}" "challengeSessionId")"
    if [[ -z "${challenge_session_id}" ]]; then
        echo "Challenge verification returned success without session id: ${challenge_probe_body}" >&2
        exit 1
    fi

    create_once_raw="$(request_with_status POST "${BASE_URL}/api/tweets/create" "{\"text\":\"${tweet_text}\",\"challengeSessionId\":\"${challenge_session_id}\",\"ruleVersion\":\"${version}\"}")"
    create_once_status="$(extract_status "${create_once_raw}")"
    create_once_body="$(extract_body "${create_once_raw}")"
    if [[ "${create_once_status}" != "200" && "${create_once_status}" != "202" ]]; then
        echo "Post create with challenge session failed: HTTP ${create_once_status}: ${create_once_body}" >&2
        exit 1
    fi

    create_replay_raw="$(request_with_status POST "${BASE_URL}/api/tweets/create" "{\"text\":\"${tweet_text}-replay\",\"challengeSessionId\":\"${challenge_session_id}\",\"ruleVersion\":\"${version}\"}")"
    create_replay_status="$(extract_status "${create_replay_raw}")"
    create_replay_body="$(extract_body "${create_replay_raw}")"

    if [[ "${create_replay_status}" == "403" && "${create_replay_body}" == *'"code":"challenge_invalid"'* ]]; then
        echo "Detected strict replay protection."
    elif [[ "${create_replay_status}" == "200" || "${create_replay_status}" == "202" ]]; then
        echo "Detected dry-run challenge bypass path (expected while HUMAN_DRY_RUN=true)."
    else
        echo "Unexpected replay behavior: HTTP ${create_replay_status}: ${create_replay_body}" >&2
        exit 1
    fi
elif [[ "${challenge_probe_status}" == "403" && "${challenge_probe_body}" == *'"code":"challenge_required"'* ]]; then
    create_without_session_raw="$(request_with_status POST "${BASE_URL}/api/tweets/create" "{\"text\":\"${tweet_text}\"}")"
    create_without_session_status="$(extract_status "${create_without_session_raw}")"
    create_without_session_body="$(extract_body "${create_without_session_raw}")"
    if [[ "${create_without_session_status}" != "403" || "${create_without_session_body}" != *'"code":"challenge_required"'* ]]; then
        echo "Strict mode expected challenge_required on post create, got ${create_without_session_status}: ${create_without_session_body}" >&2
        exit 1
    fi
    echo "Detected strict mode challenge enforcement."
else
    echo "Unexpected challenge probe response: HTTP ${challenge_probe_status}: ${challenge_probe_body}" >&2
    exit 1
fi

echo "[9/10] Cleanup smoke posts"
cleanup_smoke_posts

echo "[10/10] Human layer smoke complete"
echo "Human layer smoke passed for ${BASE_URL}."
