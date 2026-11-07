import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { runHumanGate } from "@/utilities/human/gate";

type EditTweetPayload = {
    text?: unknown;
    photoUrl?: unknown;
    challengeSessionId?: unknown;
    ruleVersion?: unknown;
};

export async function POST(
    request: NextRequest,
    { params: { tweetId, username } }: { params: { tweetId: string; username: string } }
) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: EditTweetPayload;
    try {
        body = (await request.json()) as EditTweetPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 280) {
        return NextResponse.json({ success: false, message: "Text must be between 1 and 280 characters." }, { status: 400 });
    }

    const hasPhotoUrl = Object.prototype.hasOwnProperty.call(body, "photoUrl");
    let nextPhotoUrl: string | null | undefined;
    if (hasPhotoUrl) {
        if (body.photoUrl === null) {
            nextPhotoUrl = null;
        } else if (typeof body.photoUrl === "string" && body.photoUrl.trim() === "") {
            nextPhotoUrl = null;
        } else {
            const sanitized = sanitizeMediaUrl(body.photoUrl);
            if (!sanitized) {
                return NextResponse.json({ success: false, message: "photoUrl must be a valid upload URL." }, { status: 400 });
            }
            nextPhotoUrl = sanitized;
        }
    }

    const challengeSessionId = typeof body.challengeSessionId === "string" ? body.challengeSessionId.trim() : null;
    const ruleVersion = typeof body.ruleVersion === "string" ? body.ruleVersion.trim() : null;

    const target = await prisma.tweet.findUnique({
        where: { id: tweetId },
        select: {
            id: true,
            authorId: true,
            author: { select: { username: true } },
            isRetweet: true,
            photoUrl: true,
        },
    });

    if (!target || target.author.username !== username) {
        return NextResponse.json({ success: false, message: "Post not found." }, { status: 404 });
    }
    if (target.isRetweet) {
        return NextResponse.json({ success: false, message: "Reposts cannot be edited." }, { status: 400 });
    }
    if (target.authorId !== authUser.id) {
        return unauthorizedResponse();
    }

    const gate = await runHumanGate({
        authUser,
        action: "post_edit",
        text,
        hasMedia: hasPhotoUrl ? Boolean(nextPhotoUrl) : Boolean(target.photoUrl),
        challengeSessionId,
        ruleVersion,
        tweetId,
        metadata: {
            route: "/api/tweets/[username]/[tweetId]/edit",
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
            },
            { status }
        );
    }

    if (gate.decision === "pending_review") {
        return NextResponse.json(
            {
                success: true,
                pendingReview: true,
                message: "Post edit submitted for authenticity review before publication.",
                checkId: gate.authenticityCheckId,
                riskScore: gate.risk.score,
                suggestedDecision: gate.suggestedDecision,
            },
            { status: 202 }
        );
    }
    if (gate.decision === "block") {
        return NextResponse.json(
            {
                success: false,
                code: "authenticity_blocked",
                message: "Post edit blocked by authenticity policy. Please contact moderation for review.",
                checkId: gate.authenticityCheckId,
                riskScore: gate.risk.score,
                suggestedDecision: gate.suggestedDecision,
            },
            { status: 403 }
        );
    }

    const updated = await prisma.tweet.update({
        where: { id: tweetId },
        data: {
            text,
            editedAt: new Date(),
            authenticityScore: gate.risk.score,
            authenticityDecision: gate.suggestedDecision,
            visibilityStatus: "public",
            ...(hasPhotoUrl ? { photoUrl: nextPhotoUrl ?? null } : {}),
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
            retweetedBy: {
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
            replies: {
                select: {
                    authorId: true,
                },
            },
            retweetOf: {
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
                    retweetedBy: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            description: true,
                            isVerifiedHuman: true,
                            photoUrl: true,
                        },
                    },
                    replies: {
                        select: {
                            authorId: true,
                        },
                    },
                },
            },
        },
    });

    return NextResponse.json({ success: true, tweet: updated });
}
