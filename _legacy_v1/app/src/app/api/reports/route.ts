import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";

type ReportPayload = {
    targetType?: "user" | "tweet";
    targetUsername?: string;
    targetTweetId?: string;
    reason?: string;
    details?: string;
};

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const body = (await request.json()) as ReportPayload;
    const targetType = body.targetType;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const details = typeof body.details === "string" ? body.details.trim() : "";

    if (!targetType || (targetType !== "user" && targetType !== "tweet")) {
        return errorResponse(requestId, "Invalid target type.", 400);
    }

    if (!reason || reason.length > 80) {
        return errorResponse(requestId, "Invalid reason.", 400);
    }

    if (details.length > 500) {
        return errorResponse(requestId, "Report details are too long.", 400);
    }

    try {
        let targetUserId: string | null = null;
        let targetTweetId: string | null = null;

        if (targetType === "user") {
            const targetUsername = typeof body.targetUsername === "string" ? body.targetUsername.trim() : "";
            if (!targetUsername) {
                return errorResponse(requestId, "Missing target username.", 400);
            }

            const targetUser = await prisma.user.findUnique({
                where: {
                    username: targetUsername,
                },
                select: {
                    id: true,
                },
            });

            if (!targetUser) {
                return errorResponse(requestId, "User not found.", 404);
            }
            targetUserId = targetUser.id;
        }

        if (targetType === "tweet") {
            const candidateTweetId = typeof body.targetTweetId === "string" ? body.targetTweetId.trim() : "";
            if (!candidateTweetId) {
                return errorResponse(requestId, "Missing target tweet.", 400);
            }

            const targetTweet = await prisma.tweet.findUnique({
                where: {
                    id: candidateTweetId,
                },
                select: {
                    id: true,
                },
            });

            if (!targetTweet) {
                return errorResponse(requestId, "Tweet not found.", 404);
            }
            targetTweetId = targetTweet.id;
        }

        await prisma.report.create({
            data: {
                reporterId: authUser.id,
                targetUserId,
                targetTweetId,
                reason,
                details: details || null,
                status: "open",
            },
        });

        logApiEvent("warn", {
            event: "report_created",
            requestId,
            route: "/api/reports",
            details: {
                reporterId: authUser.id,
                targetType,
                targetUserId,
                targetTweetId,
                reason,
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to create report.", 500, error);
    }
}
