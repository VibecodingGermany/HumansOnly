#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---dry-run}"

if [[ "${MODE}" != "--dry-run" && "${MODE}" != "--execute" ]]; then
    echo "Usage: $0 [--dry-run|--execute]" >&2
    exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL is required." >&2
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required but not installed." >&2
    exit 1
fi

DB_URL="${DATABASE_URL%%\?*}"

preview_candidates() {
    psql "${DB_URL}" <<'SQL'
DROP TABLE IF EXISTS _artifact_users;
CREATE TEMP TABLE _artifact_users AS
SELECT id, username, name, role, "clerkId", "createdAt"
FROM "User"
WHERE role = 'user'
  AND "clerkId" IS NULL
  AND username ~ '^[a-z0-9_]+[0-9]{10}$';

SELECT COUNT(*) AS candidate_users FROM _artifact_users;

SELECT
  COUNT(*) FILTER (WHERE username ~ '^smoke[0-9]{10}$') AS smoke_users,
  COUNT(*) FILTER (WHERE username ~ '^humanlayer[0-9]{10}$') AS human_layer_users,
  COUNT(*) FILTER (WHERE username ~ '^wave[0-9]+[ab][0-9]{10}$') AS wave_users,
  COUNT(*) FILTER (WHERE username ~ '^u[0-9]{10}$') AS upload_users
FROM _artifact_users;

SELECT
  (SELECT COUNT(*) FROM "Tweet" t JOIN _artifact_users a ON a.id = t."authorId") AS candidate_tweets,
  (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users a ON a.id = m."senderId") AS candidate_messages_sent,
  (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users a ON a.id = m."recipientId") AS candidate_messages_received,
  (SELECT COUNT(*) FROM "Notification" n JOIN _artifact_users a ON a.id = n."userId") AS candidate_notifications,
  (SELECT COUNT(*) FROM "ProductEvent" e JOIN _artifact_users a ON a.id = e."userId") AS candidate_product_events,
  (SELECT COUNT(*) FROM "HumanChallengeSession" h JOIN _artifact_users a ON a.id = h."userId") AS candidate_challenge_sessions,
  (SELECT COUNT(*) FROM "PolicyAcceptance" p JOIN _artifact_users a ON a.id = p."userId") AS candidate_policy_acceptances,
  (SELECT COUNT(*) FROM "MediaAsset" m JOIN _artifact_users a ON a.id = m."ownerId") AS candidate_media_assets;

SELECT
  (SELECT COUNT(*) FROM "_userFollows" f JOIN _artifact_users a ON a.id = f."A" LEFT JOIN _artifact_users b ON b.id = f."B" WHERE b.id IS NULL)
    AS follows_from_candidates_to_non_candidates,
  (SELECT COUNT(*) FROM "_userFollows" f JOIN _artifact_users a ON a.id = f."B" LEFT JOIN _artifact_users b ON b.id = f."A" WHERE b.id IS NULL)
    AS follows_from_non_candidates_to_candidates,
  (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users s ON s.id = m."senderId" LEFT JOIN _artifact_users r ON r.id = m."recipientId" WHERE r.id IS NULL)
    AS messages_from_candidates_to_non_candidates,
  (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users r ON r.id = m."recipientId" LEFT JOIN _artifact_users s ON s.id = m."senderId" WHERE s.id IS NULL)
    AS messages_from_non_candidates_to_candidates,
  (SELECT COUNT(*) FROM "_userLikes" l JOIN _artifact_users a ON a.id = l."B" JOIN "Tweet" t ON t.id = l."A" LEFT JOIN _artifact_users ta ON ta.id = t."authorId" WHERE ta.id IS NULL)
    AS likes_from_candidates_on_non_candidate_tweets,
  (SELECT COUNT(*) FROM "_userLikes" l JOIN "Tweet" t ON t.id = l."A" JOIN _artifact_users a ON a.id = t."authorId" LEFT JOIN _artifact_users lu ON lu.id = l."B" WHERE lu.id IS NULL)
    AS likes_from_non_candidates_on_candidate_tweets,
  (SELECT COUNT(*) FROM "Tweet" child JOIN "Tweet" parent ON parent.id = child."repliedToId" JOIN _artifact_users pa ON pa.id = parent."authorId" LEFT JOIN _artifact_users ca ON ca.id = child."authorId" WHERE ca.id IS NULL)
    AS replies_from_non_candidates_to_candidate_tweets,
  (SELECT COUNT(*) FROM "Tweet" child JOIN "Tweet" parent ON parent.id = child."repliedToId" JOIN _artifact_users ca ON ca.id = child."authorId" LEFT JOIN _artifact_users pa ON pa.id = parent."authorId" WHERE pa.id IS NULL)
    AS replies_from_candidates_to_non_candidate_tweets;

SELECT username, name, "createdAt"
FROM _artifact_users
ORDER BY "createdAt" DESC
LIMIT 120;
SQL
}

execute_cleanup() {
    psql "${DB_URL}" <<'SQL'
BEGIN;

DROP TABLE IF EXISTS _artifact_users;
CREATE TEMP TABLE _artifact_users AS
SELECT id, username, name, role, "clerkId", "createdAt"
FROM "User"
WHERE role = 'user'
  AND "clerkId" IS NULL
  AND username ~ '^[a-z0-9_]+[0-9]{10}$';

DO $$
DECLARE
    cross_messages integer;
    cross_likes integer;
    cross_replies integer;
BEGIN
    SELECT
        (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users s ON s.id = m."senderId" LEFT JOIN _artifact_users r ON r.id = m."recipientId" WHERE r.id IS NULL)
      + (SELECT COUNT(*) FROM "Message" m JOIN _artifact_users r ON r.id = m."recipientId" LEFT JOIN _artifact_users s ON s.id = m."senderId" WHERE s.id IS NULL)
    INTO cross_messages;

    SELECT
        (SELECT COUNT(*) FROM "_userLikes" l JOIN _artifact_users a ON a.id = l."B" JOIN "Tweet" t ON t.id = l."A" LEFT JOIN _artifact_users ta ON ta.id = t."authorId" WHERE ta.id IS NULL)
      + (SELECT COUNT(*) FROM "_userLikes" l JOIN "Tweet" t ON t.id = l."A" JOIN _artifact_users a ON a.id = t."authorId" LEFT JOIN _artifact_users lu ON lu.id = l."B" WHERE lu.id IS NULL)
    INTO cross_likes;

    SELECT
        (SELECT COUNT(*) FROM "Tweet" child JOIN "Tweet" parent ON parent.id = child."repliedToId" JOIN _artifact_users pa ON pa.id = parent."authorId" LEFT JOIN _artifact_users ca ON ca.id = child."authorId" WHERE ca.id IS NULL)
      + (SELECT COUNT(*) FROM "Tweet" child JOIN "Tweet" parent ON parent.id = child."repliedToId" JOIN _artifact_users ca ON ca.id = child."authorId" LEFT JOIN _artifact_users pa ON pa.id = parent."authorId" WHERE pa.id IS NULL)
    INTO cross_replies;

    IF cross_messages > 0 OR cross_likes > 0 OR cross_replies > 0 THEN
        RAISE EXCEPTION
            'Abort cleanup: cross-scope interactions found (messages %, likes %, replies %).',
            cross_messages,
            cross_likes,
            cross_replies;
    END IF;
END $$;

WITH
deleted_product_events AS (
    DELETE FROM "ProductEvent"
    WHERE "userId" IN (SELECT id FROM _artifact_users)
    RETURNING 1
),
deleted_messages AS (
    DELETE FROM "Message"
    WHERE "senderId" IN (SELECT id FROM _artifact_users)
       OR "recipientId" IN (SELECT id FROM _artifact_users)
    RETURNING 1
),
deleted_notifications AS (
    DELETE FROM "Notification"
    WHERE "userId" IN (SELECT id FROM _artifact_users)
    RETURNING 1
),
deleted_tweets AS (
    DELETE FROM "Tweet"
    WHERE "authorId" IN (SELECT id FROM _artifact_users)
    RETURNING 1
),
deleted_users AS (
    DELETE FROM "User"
    WHERE id IN (SELECT id FROM _artifact_users)
    RETURNING 1
)
SELECT
    (SELECT COUNT(*) FROM _artifact_users) AS candidate_users,
    (SELECT COUNT(*) FROM deleted_users) AS deleted_users,
    (SELECT COUNT(*) FROM deleted_tweets) AS deleted_tweets,
    (SELECT COUNT(*) FROM deleted_messages) AS deleted_messages,
    (SELECT COUNT(*) FROM deleted_notifications) AS deleted_notifications,
    (SELECT COUNT(*) FROM deleted_product_events) AS deleted_product_events;

COMMIT;
SQL
}

echo "== Artifact user cleanup ${MODE} =="
preview_candidates

if [[ "${MODE}" == "--execute" ]]; then
    echo "== Executing cleanup =="
    execute_cleanup
    echo "== Remaining candidates =="
    preview_candidates
fi
