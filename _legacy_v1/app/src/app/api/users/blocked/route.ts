import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, logApiEvent, successResponse } from "@/utilities/observability";

export async function GET() {
    const requestId = crypto.randomUUID();
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const blocked = await prisma.block.findMany({
            where: {
                blockerId: authUser.id,
            },
            include: {
                blocked: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        photoUrl: true,
                        isVerifiedHuman: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        logApiEvent("info", {
            event: "blocked_users_listed",
            requestId,
            route: "/api/users/blocked",
            details: {
                userId: authUser.id,
                count: blocked.length,
            },
        });

        return successResponse(requestId, { success: true, users: blocked.map((entry) => entry.blocked) });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load blocked users.", 500, error);
    }
}
