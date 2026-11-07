import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const target = await prisma.user.findUnique({
            where: {
                username,
            },
            select: {
                id: true,
            },
        });

        if (!target) {
            return errorResponse(requestId, "User not found.", 404);
        }

        await prisma.block.deleteMany({
            where: {
                blockerId: authUser.id,
                blockedId: target.id,
            },
        });

        logApiEvent("info", {
            event: "user_unblocked",
            requestId,
            route: "/api/users/[username]/unblock",
            details: {
                blockerId: authUser.id,
                blockedId: target.id,
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to unblock user.", 500, error);
    }
}
