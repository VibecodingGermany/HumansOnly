import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { trackProductEventForUser } from "@/utilities/analytics/server";

type FeedFeedbackPayload = {
    tweetId?: unknown;
    feedbackType?: unknown;
};

const FEEDBACK_TYPES = new Set(["not_interested"]);

export async function POST(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: FeedFeedbackPayload;
    try {
        body = (await request.json()) as FeedFeedbackPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const tweetId = typeof body.tweetId === "string" ? body.tweetId.trim() : "";
    const feedbackType = typeof body.feedbackType === "string" ? body.feedbackType.trim().toLowerCase() : "";

    if (!tweetId) {
        return NextResponse.json({ success: false, message: "tweetId is required." }, { status: 400 });
    }
    if (!FEEDBACK_TYPES.has(feedbackType)) {
        return NextResponse.json({ success: false, message: "Invalid feedbackType." }, { status: 400 });
    }

    const targetTweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        select: { id: true, authorId: true },
    });

    if (!targetTweet) {
        return NextResponse.json({ success: false, message: "Tweet not found." }, { status: 404 });
    }

    await prisma.recommendationFeedback.upsert({
        where: {
            userId_tweetId_feedbackType: {
                userId: authUser.id,
                tweetId: targetTweet.id,
                feedbackType,
            },
        },
        update: {
            updatedAt: new Date(),
        },
        create: {
            userId: authUser.id,
            tweetId: targetTweet.id,
            feedbackType,
        },
    });

    await trackProductEventForUser({
        userId: authUser.id,
        eventName: "feed_not_interested",
        surface: "home_feed",
        sessionId: request.headers.get("x-request-id") || undefined,
        payload: {
            tweetId: targetTweet.id,
            tweetAuthorId: targetTweet.authorId,
            feedbackType,
        },
    });

    return NextResponse.json({ success: true });
}

