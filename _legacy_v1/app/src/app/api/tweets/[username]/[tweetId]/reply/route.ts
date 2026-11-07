import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { createNotification } from "@/utilities/fetch";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { canUsersInteract, visibleAuthorWhereForViewer, visibleTweetWhereForViewer } from "@/utilities/social/access";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { runHumanGate } from "@/utilities/human/gate";
import { trackProductEventForUser } from "@/utilities/analytics/server";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

type CreateReplyPayload = {
    text?: unknown;
    photoUrl?: unknown;
    challengeSessionId?: unknown;
    ruleVersion?: unknown;
};

export async function GET(request: NextRequest, { params: { tweetId } }: { params: { tweetId: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    const viewerId = authUser?.id ?? null;
    const visibleAuthorWhere = visibleAuthorWhereForViewer(viewerId);
    const visibleTweetWhere = visibleTweetWhereForViewer(viewerId);

    try {
        const parentTweet = await prisma.tweet.findFirst({
            where: {
                id: tweetId,
                author: visibleAuthorWhere,
                AND: [visibleTweetWhere],
            },
            select: {
                id: true,
            },
        });

        if (!parentTweet) {
            return successResponse(requestId, { success: true, tweets: [] });
        }

        const tweets = await prisma.tweet.findMany({
            where: {
                isReply: true,
                repliedToId: tweetId,
                author: visibleAuthorWhere,
                AND: [visibleTweetWhere],
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        description: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                    },
                },
                likedBy: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        description: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        followers: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                photoUrl: true,
                            },
                        },
                    },
                },
                repliedTo: {
                    select: {
                        id: true,
                        author: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                isVerifiedHuman: true,
                                description: true,
                            },
                        },
                    },
                },
                replies: {
                    select: {
                        authorId: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return successResponse(requestId, { success: true, tweets });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load replies.", 500, error);
    }
}

export async function POST(
    request: NextRequest,
    { params: { tweetId, username } }: { params: { tweetId: string; username: string } }
) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse("Unauthorized");

    const secret = process.env.CREATION_SECRET_KEY;

    if (!secret) {
        return errorResponse(requestId, "Secret key not found.", 500);
    }

    let body: CreateReplyPayload;
    try {
        body = (await request.json()) as CreateReplyPayload;
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

    try {
        const targetTweet = await prisma.tweet.findUnique({
            where: {
                id: tweetId,
            },
            select: {
                id: true,
                authorId: true,
                visibilityStatus: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        isPrivate: true,
                        followers: {
                            where: {
                                id: authUser.id,
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        if (!targetTweet || targetTweet.author.username !== username) {
            return NextResponse.json({ success: false, message: "Target post not found." }, { status: 404 });
        }
        if (targetTweet.visibilityStatus !== "public" && targetTweet.authorId !== authUser.id) {
            return NextResponse.json({ success: false, message: "This post is not publicly available." }, { status: 403 });
        }

        const relation = await canUsersInteract(authUser.id, targetTweet.authorId);
        if (relation.blocked) {
            return NextResponse.json(
                { success: false, message: "You cannot reply to this user due to account restrictions." },
                { status: 403 }
            );
        }

        if (
            targetTweet.author.isPrivate &&
            targetTweet.authorId !== authUser.id &&
            targetTweet.author.followers.length === 0
        ) {
            return NextResponse.json(
                { success: false, message: "This account is private. Follow first to reply." },
                { status: 403 }
            );
        }

        const challengeSessionId = typeof body.challengeSessionId === "string" ? body.challengeSessionId.trim() : null;
        const ruleVersion = typeof body.ruleVersion === "string" ? body.ruleVersion.trim() : null;

        const gate = await runHumanGate({
            authUser,
            action: "reply_create",
            text: normalizedText,
            hasMedia: Boolean(sanitizedPhotoUrl),
            challengeSessionId,
            ruleVersion,
            metadata: {
                route: "/api/tweets/[username]/[tweetId]/reply",
                targetTweetId: tweetId,
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
                    message: "Reply submitted for authenticity review before publication.",
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
                    message: "Reply blocked by authenticity policy. Please contact moderation for review.",
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

        const created = await prisma.tweet.create({
            data: {
                isReply: true,
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
                repliedTo: {
                    connect: {
                        id: tweetId,
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
            eventName: "reply_created",
            surface: "reply_composer",
            sessionId: requestId,
            payload: {
                replyId: created.id,
                targetTweetId: tweetId,
                targetAuthorUsername: username,
                hasMedia: Boolean(sanitizedPhotoUrl),
                textLength: normalizedText.length,
            },
        });

        if (username !== authUser.username) {
            const notificationContent = {
                sender: {
                    username: authUser.username,
                    name: authUser.name || "",
                    photoUrl: authUser.photoUrl || "",
                },
                content: {
                    id: tweetId,
                },
            };

            await createNotification(username, "reply", secret, notificationContent);
        }

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to create reply.", 500, error);
    }
}
