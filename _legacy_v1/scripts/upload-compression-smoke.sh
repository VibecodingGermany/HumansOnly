#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://humans-only.de}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"

TMP_DIR="$(mktemp -d)"
COOKIE_FILE="${TMP_DIR}/cookie.txt"
USERNAME=""
PASSWORD=""
USER_CREATED="0"

json_field() {
    local json="$1"
    local key="$2"
    node -e 'const data = JSON.parse(process.argv[1]); const key = process.argv[2]; const value = data[key]; process.stdout.write(String(value ?? ""));' "$json" "$key"
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
    if [[ "${USER_CREATED}" != "1" || -z "${USERNAME}" || -z "${PASSWORD}" ]]; then
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

    rm -rf "${TMP_DIR}"

    if [[ "${exit_code}" == "0" && "${cleanup_failed}" == "1" ]]; then
        exit 1
    fi

    exit "${exit_code}"
}
trap on_exit EXIT

echo "[1/7] Generate large synthetic images"
(cd "${APP_DIR}" && node - "${TMP_DIR}" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outputDir = process.argv[2];

const fixtures = [
  { filename: "profile.png", width: 2200, height: 2200 },
  { filename: "header.png", width: 3600, height: 1200 },
  { filename: "post.png", width: 3840, height: 2160 },
];

const createNoiseImage = async ({ filename, width, height }) => {
  const channels = 3;
  const raw = crypto.randomBytes(width * height * channels);
  const filePath = path.join(outputDir, filename);
  await sharp(raw, { raw: { width, height, channels } })
    .png({ compressionLevel: 0 })
    .toFile(filePath);
  const stats = fs.statSync(filePath);
  console.log(`${filename}:${stats.size}`);
};

(async () => {
  for (const fixture of fixtures) {
    await createNoiseImage(fixture);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
)

echo "[2/7] Create user session"
USERNAME="u$(date +%s)"
PASSWORD="UploadSmokePass123!"

for attempt in {1..15}; do
    HEALTH_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${BASE_URL}/api/health" || true)"
    if [[ "${HEALTH_CODE}" == "200" ]]; then
        break
    fi
    sleep 1
done

post_with_retry() {
    local url="$1"
    local payload="$2"
    local cookie_read="$3"
    local cookie_write="$4"
    local response=""

    for _attempt in {1..5}; do
        if [[ -n "${cookie_read}" ]]; then
            response="$(curl -sS -b "${cookie_read}" -c "${cookie_write}" -H 'Content-Type: application/json' -d "${payload}" "${url}" || true)"
        else
            response="$(curl -sS -c "${cookie_write}" -H 'Content-Type: application/json' -d "${payload}" "${url}" || true)"
        fi
        if [[ "${response}" == *'"success":'* ]]; then
            echo "${response}"
            return 0
        fi
        sleep 1
    done

    echo "${response}"
    return 0
}

CREATE_RESPONSE="$(post_with_retry "${BASE_URL}/api/users/create" "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"name\":\"${USERNAME}\"}" "" "${COOKIE_FILE}")"
LOGIN_RESPONSE="$(post_with_retry "${BASE_URL}/api/auth/login" "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" "${COOKIE_FILE}" "${COOKIE_FILE}")"

if [[ "${CREATE_RESPONSE}" != *'"success":true'* ]]; then
    echo "Create user failed: ${CREATE_RESPONSE}" >&2
    exit 1
fi
USER_CREATED="1"
if [[ "${LOGIN_RESPONSE}" != *'"success":true'* ]]; then
    echo "Login failed: ${LOGIN_RESPONSE}" >&2
    exit 1
fi

upload_and_assert() {
    local fixture_path="$1"
    local upload_type="$2"
    local max_bytes="$3"
    local max_width="$4"
    local max_height="$5"

    local response
    response="$(curl -sS -b "${COOKIE_FILE}" \
        -F "file=@${fixture_path};type=image/png" \
        -F "type=${upload_type}" \
        "${BASE_URL}/api/upload")"

    if [[ "${response}" != *'"success":true'* ]]; then
        echo "Upload failed for ${upload_type}: ${response}" >&2
        exit 1
    fi

    local path format compressed output_width output_height
    path="$(json_field "${response}" "path")"
    format="$(json_field "${response}" "outputFormat")"
    compressed="$(json_field "${response}" "compressedSize")"
    output_width="$(json_field "${response}" "outputWidth")"
    output_height="$(json_field "${response}" "outputHeight")"

    local asset_url=""
    if [[ "${path}" == /uploads/* ]]; then
        asset_url="${BASE_URL}${path}"
    elif [[ "${path}" == http://* || "${path}" == https://* ]]; then
        asset_url="${path}"
    else
        echo "Unexpected upload path for ${upload_type}: ${path}" >&2
        exit 1
    fi
    if [[ "${format}" != "image/webp" && "${format}" != "image/jpeg" ]]; then
        echo "Unexpected output format for ${upload_type}: ${format}" >&2
        exit 1
    fi
    if [[ "${compressed}" -gt "${max_bytes}" ]]; then
        echo "Compression budget exceeded for ${upload_type}: ${compressed} > ${max_bytes}" >&2
        exit 1
    fi
    if [[ "${output_width}" -gt "${max_width}" || "${output_height}" -gt "${max_height}" ]]; then
        echo "Dimensions exceeded for ${upload_type}: ${output_width}x${output_height}" >&2
        exit 1
    fi

    local image_code
    image_code="$(curl -sS -o /dev/null -w '%{http_code}' "${asset_url}")"
    if [[ "${image_code}" != "200" ]]; then
        echo "Uploaded asset not reachable for ${upload_type}: HTTP ${image_code}" >&2
        exit 1
    fi
}

echo "[3/7] Validate profile compression budget"
upload_and_assert "${TMP_DIR}/profile.png" "profile" 286720 400 400

echo "[4/7] Validate header compression budget"
upload_and_assert "${TMP_DIR}/header.png" "header" 614400 1500 500

echo "[5/7] Validate post compression budget"
upload_and_assert "${TMP_DIR}/post.png" "post" 1536000 1920 1080

echo "[6/7] Validate invalid-image rejection"
printf 'this-is-not-an-image' > "${TMP_DIR}/invalid.heic"
INVALID_RESPONSE="$(curl -sS -b "${COOKIE_FILE}" \
    -F "file=@${TMP_DIR}/invalid.heic;type=image/heic" \
    -F "type=profile" \
    "${BASE_URL}/api/upload")"

if [[ "${INVALID_RESPONSE}" != *'"success":false'* ]]; then
    echo "Invalid upload should fail: ${INVALID_RESPONSE}" >&2
    exit 1
fi
if [[ "${INVALID_RESPONSE}" != *"valid or supported image"* ]]; then
    echo "Unexpected invalid upload response: ${INVALID_RESPONSE}" >&2
    exit 1
fi

echo "[7/7] Validate declared mime-type enforcement"
MISMATCH_RESPONSE="$(curl -sS -b "${COOKIE_FILE}" \
    -F "file=@${TMP_DIR}/profile.png;type=text/plain" \
    -F "type=profile" \
    "${BASE_URL}/api/upload")"

if [[ "${MISMATCH_RESPONSE}" != *'"success":false'* ]]; then
    echo "Declared mime-type mismatch should fail: ${MISMATCH_RESPONSE}" >&2
    exit 1
fi
if [[ "${MISMATCH_RESPONSE}" != *"Invalid file type"* && "${MISMATCH_RESPONSE}" != *"does not match file content"* && "${MISMATCH_RESPONSE}" != *"Invalid image type"* ]]; then
    echo "Unexpected mime mismatch response: ${MISMATCH_RESPONSE}" >&2
    exit 1
fi

echo "Upload compression smoke passed for ${BASE_URL}."
