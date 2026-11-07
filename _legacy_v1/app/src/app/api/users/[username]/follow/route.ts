import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { createNotification } from "@/utilities/fetch";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { canUsersInteract } from "@/utilities/social/access";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";
import { trackProductEventForUser } from "@/utilities/analytics/server";

export async function POST(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const targetUser = await prisma.user.findUnique({
        where: {
            username,
        },
        select: {
            id: true,
        },
    });

    if (!targetUser) {
        return errorResponse(requestId, "User not found.", 404);
    }

    if (targetUser.id === authUser.id) {
        return errorResponse(requestId, "You cannot follow yourself.", 400);
    }

    const relation = await canUsersInteract(authUser.id, targetUser.id);
    if (relation.blocked) {
        return errorResponse(requestId, "Follow is not allowed due to account restrictions.", 403);
    }

    const secret = process.env.CREATION_SECRET_KEY;

    if (!secret) {
        return errorResponse(requestId, "Secret key not found.", 500);
    }

    try {
        await prisma.user.update({
            where: {
                id: targetUser.id,
            },
            data: {
                followers: {
                    connect: {
                        id: authUser.id,
                    },
                },
            },
        });

        const notificationContent = {
            sender: {
                username: authUser.username,
                name: authUser.name || "",
                photoUrl: authUser.photoUrl || "",
            },
            content: null,
        };

        await createNotification(username, "follow", secret, notificationContent);

        await trackProductEventForUser({
            userId: authUser.id,
            eventName: "user_followed",
            surface: "profile",
            sessionId: requestId,
            payload: {
                followedUserId: targetUser.id,
                followedUsername: username,
            },
        });

        logApiEvent("info", {
            event: "user_followed",
            requestId,
            route: "/api/users/[username]/follow",
            details: {
                followerId: authUser.id,
                followedId: targetUser.id,
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to follow user.", 500, error);
    }
}
