import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { runHumanGate } from "@/utilities/human/gate";
import { trackProductEventForUser } from "@/utilities/analytics/server";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

type CreateTweetPayload = {
    text?: unknown;
    photoUrl?: unknown;
    challengeSessionId?: unknown;
    ruleVersion?: unknown;
};

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse("Unauthorized");

    let body: CreateTweetPayload;
    try {
        body = (await request.json()) as CreateTweetPayload;
    } catch {
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }

    const { text, photoUrl } = body;
    const normalizedText = typeof text === "string" ? text.trim() : "";

    // Validate input
    if (!normalizedText) {
        return errorResponse(requestId, "Text is required.", 400);
    }

    if (normalizedText.length > 280) {
        return errorResponse(requestId, "Text must be 1-280 characters.", 400);
    }

    const hasPhotoUrl = photoUrl !== undefined && photoUrl !== null && !(typeof photoUrl === "string" && photoUrl.trim() === "");
    const sanitizedPhotoUrl = hasPhotoUrl ? sanitizeMediaUrl(photoUrl) : null;
    if (hasPhotoUrl && !sanitizedPhotoUrl) {
        return errorResponse(requestId, "photoUrl must be a valid upload URL.", 400);
    }

    const challengeSessionId = typeof body.challengeSessionId === "string" ? body.challengeSessionId.trim() : null;
    const ruleVersion = typeof body.ruleVersion === "string" ? body.ruleVersion.trim() : null;

    const gate = await runHumanGate({
        authUser,
        action: "post_create",
        text: normalizedText,
        hasMedia: Boolean(sanitizedPhotoUrl),
        challengeSessionId,
        ruleVersion,
        metadata: {
            route: "/api/tweets/create",
        },
    });

    if (!gate.ok) {
        const statusByCode = {
            rules_not_accepted: 409,
            challenge_required: 403,
            challenge_invalid: 403,
            challenge_misconfigured: 500,
        } as const;

        const status = gate.code ? statusByCode[gate.code] : 400;
        return NextResponse.json(
            {
                success: false,
                code: gate.code,
                message: gate.message,
                policyVersion: gate.policyVersion,
                requestId,
            },
            {
                status,
                headers: {
                    "x-request-id": requestId,
                },
            }
        );
    }

    if (gate.decision === "pending_review") {
        return successResponse(
            requestId,
            {
                success: true,
                pendingReview: true,
                message: "Post submitted for authenticity review before publication.",
                checkId: gate.authenticityCheckId,
                riskScore: gate.risk.score,
                suggestedDecision: gate.suggestedDecision,
            },
            202
        );
    }
    if (gate.decision === "block") {
        return NextResponse.json(
            {
                success: false,
                code: "authenticity_blocked",
                message: "Post blocked by authenticity policy. Please contact moderation for review.",
                checkId: gate.authenticityCheckId,
                riskScore: gate.risk.score,
                suggestedDecision: gate.suggestedDecision,
                requestId,
            },
            {
                status: 403,
                headers: {
                    "x-request-id": requestId,
                },
            }
        );
    }

    try {
        const created = await prisma.tweet.create({
            data: {
                text: normalizedText,
                photoUrl: sanitizedPhotoUrl,
                visibilityStatus: "public",
                authenticityScore: gate.risk.score,
                authenticityDecision: gate.suggestedDecision,
                author: {
                    connect: {
                        id: authUser.id,
                    },
                },
            },
        });

        if (gate.authenticityCheckId) {
            await prisma.authenticityCheck.update({
                where: {
                    id: gate.authenticityCheckId,
                },
                data: {
                    tweetId: created.id,
                },
            });
        }

        await trackProductEventForUser({
            userId: authUser.id,
            eventName: "post_created",
            surface: "composer",
            sessionId: requestId,
            payload: {
                tweetId: created.id,
                hasMedia: Boolean(sanitizedPhotoUrl),
                textLength: normalizedText.length,
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to create post.", 500, error);
    }
}
