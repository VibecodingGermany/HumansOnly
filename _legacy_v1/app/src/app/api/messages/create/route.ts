import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { createNotification } from "@/utilities/fetch";
import { shouldCreateNotification } from "@/utilities/misc/shouldCreateNotification";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { canUsersInteract } from "@/utilities/social/access";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { trackProductEventForUser } from "@/utilities/analytics/server";

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse("Unauthorized");

    const secret = process.env.CREATION_SECRET_KEY;

    if (!secret) {
        return errorResponse(requestId, "Secret key not found.", 500);
    }

    // Parse request body
    const { recipient, text, photoUrl } = await request.json();
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const normalizedRecipient = typeof recipient === "string" ? recipient.trim() : "";

    // Validate input
    if (!normalizedText) {
        return errorResponse(requestId, "Text is required", 400);
    }

    if (normalizedText.length > 280) {
        return errorResponse(requestId, "Text must be 1-280 characters", 400);
    }

    if (!normalizedRecipient) {
        return errorResponse(requestId, "Recipient is required", 400);
    }

    const hasPhotoUrl = photoUrl !== undefined && photoUrl !== null && !(typeof photoUrl === "string" && photoUrl.trim() === "");
    const sanitizedPhotoUrl = hasPhotoUrl ? sanitizeMediaUrl(photoUrl) : null;
    if (hasPhotoUrl && !sanitizedPhotoUrl) {
        return errorResponse(requestId, "photoUrl must be a valid upload URL", 400);
    }

    try {
        const recipientUser = await prisma.user.findUnique({
            where: {
                username: normalizedRecipient,
            },
            select: {
                id: true,
                username: true,
                messagePrivacy: true,
                followers: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!recipientUser) {
            return errorResponse(requestId, "Recipient does not exist.", 404);
        }

        const relation = await canUsersInteract(authUser.id, recipientUser.id);
        if (relation.blocked) {
            return errorResponse(requestId, "Messaging is not allowed due to account restrictions.", 403);
        }

        if (
            recipientUser.messagePrivacy === "followers" &&
            recipientUser.username !== authUser.username &&
            !recipientUser.followers.some((follower) => follower.id === authUser.id)
        ) {
            return errorResponse(requestId, "This user only accepts messages from followers.", 403);
        }

        await prisma.message.create({
            data: {
                text: normalizedText,
                photoUrl: sanitizedPhotoUrl,
                isRead: false,
                sender: {
                    connect: {
                        username: authUser.username,
                    },
                },
                recipient: {
                    connect: {
                        username: normalizedRecipient,
                    },
                },
            },
        });

        await trackProductEventForUser({
            userId: authUser.id,
            eventName: "message_created",
            surface: "messages",
            sessionId: requestId,
            payload: {
                recipientId: recipientUser.id,
                recipientUsername: recipientUser.username,
                textLength: normalizedText.length,
                hasPhoto: Boolean(sanitizedPhotoUrl),
            },
        });

        if (normalizedRecipient !== authUser.username && (await shouldCreateNotification(authUser.username, normalizedRecipient))) {
            const notificationContent = {
                sender: {
                    username: authUser.username,
                    name: authUser.name || "",
                    photoUrl: authUser.photoUrl || "",
                },
                content: null,
            };

            await createNotification(normalizedRecipient, "message", secret, notificationContent);
        }

        logApiEvent("info", {
            event: "message_created",
            requestId,
            route: "/api/messages/create",
            details: {
                senderId: authUser.id,
                recipientId: recipientUser.id,
                hasPhoto: Boolean(sanitizedPhotoUrl),
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to create message.", 500, error);
    }
}
