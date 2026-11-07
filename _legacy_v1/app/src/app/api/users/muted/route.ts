import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, logApiEvent, successResponse } from "@/utilities/observability";

export async function GET() {
    const requestId = crypto.randomUUID();
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const muted = await prisma.mute.findMany({
            where: {
                muterId: authUser.id,
            },
            include: {
                muted: {
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
            event: "muted_users_listed",
            requestId,
            route: "/api/users/muted",
            details: {
                userId: authUser.id,
                count: muted.length,
            },
        });

        return successResponse(requestId, { success: true, users: muted.map((entry) => entry.muted) });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load muted users.", 500, error);
    }
}
