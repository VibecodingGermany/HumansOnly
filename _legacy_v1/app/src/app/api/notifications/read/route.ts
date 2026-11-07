import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { trackProductEventForUser } from "@/utilities/analytics/server";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const result = await prisma.notification.updateMany({
            where: {
                userId: authUser.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        if (result.count > 0) {
            await trackProductEventForUser({
                userId: authUser.id,
                eventName: "notifications_marked_read",
                surface: "notifications",
                sessionId: requestId,
                payload: {
                    markedCount: result.count,
                },
            });
        }

        logApiEvent("info", {
            event: "notifications_marked_read",
            requestId,
            route: "/api/notifications/read",
            details: {
                userId: authUser.id,
                markedCount: result.count,
            },
        });

        return successResponse(requestId, { success: true, marked: result.count });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to mark notifications as read.", 500, error);
    }
}
