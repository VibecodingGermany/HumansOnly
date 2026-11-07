import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: { messagedUsername?: unknown };
    try {
        body = (await request.json()) as { messagedUsername?: unknown };
    } catch {
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }
    const messagedUsername = typeof body?.messagedUsername === "string" ? body.messagedUsername.trim() : "";

    if (!messagedUsername) {
        return errorResponse(requestId, "Invalid request body.", 400);
    }

    try {
        const updated = await prisma.message.updateMany({
            where: {
                sender: {
                    username: messagedUsername,
                },
                recipient: {
                    username: authUser.username,
                },
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return successResponse(requestId, { success: true, marked: updated.count });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to mark messages as read.", 500, error);
    }
}
