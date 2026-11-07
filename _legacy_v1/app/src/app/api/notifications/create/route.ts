import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { NotificationProps } from "@/types/NotificationProps";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    let payload: NotificationProps;

    try {
        payload = (await request.json()) as NotificationProps;
    } catch {
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }

    const { recipient, type, secret, notificationContent } = payload;

    if (secret !== process.env.CREATION_SECRET_KEY) {
        return errorResponse(requestId, "Invalid secret.", 401);
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                username: recipient,
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            return errorResponse(requestId, "Recipient not found.", 404);
        }

        const preferences = await prisma.notificationPreference.findUnique({
            where: {
                userId: user.id,
            },
        });

        const preferenceKeyByType: Record<string, "like" | "reply" | "follow" | "retweet" | "message"> = {
            like: "like",
            reply: "reply",
            follow: "follow",
            retweet: "retweet",
            message: "message",
        };

        const preferenceKey = preferenceKeyByType[type];
        if (preferenceKey && preferences && preferences[preferenceKey] === false) {
            return successResponse(requestId, { success: true, skipped: true });
        }

        await prisma.notification.create({
            data: {
                user: {
                    connect: {
                        id: user.id,
                    },
                },
                type: type,
                content: JSON.stringify(notificationContent),
            },
        });
        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to create notification.", 500, error);
    }
}
