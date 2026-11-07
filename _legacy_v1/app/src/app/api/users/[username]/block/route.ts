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
                username: true,
            },
        });

        if (!target) {
            return errorResponse(requestId, "User not found.", 404);
        }

        if (target.id === authUser.id) {
            return errorResponse(requestId, "You cannot block yourself.", 400);
        }

        await prisma.$transaction([
            prisma.block.upsert({
                where: {
                    blockerId_blockedId: {
                        blockerId: authUser.id,
                        blockedId: target.id,
                    },
                },
                update: {},
                create: {
                    blockerId: authUser.id,
                    blockedId: target.id,
                },
            }),
            prisma.mute.upsert({
                where: {
                    muterId_mutedId: {
                        muterId: authUser.id,
                        mutedId: target.id,
                    },
                },
                update: {},
                create: {
                    muterId: authUser.id,
                    mutedId: target.id,
                },
            }),
            prisma.user.update({
                where: {
                    id: target.id,
                },
                data: {
                    followers: {
                        disconnect: {
                            id: authUser.id,
                        },
                    },
                },
            }),
            prisma.user.update({
                where: {
                    id: authUser.id,
                },
                data: {
                    followers: {
                        disconnect: {
                            id: target.id,
                        },
                    },
                },
            }),
        ]);

        logApiEvent("info", {
            event: "user_blocked",
            requestId,
            route: "/api/users/[username]/block",
            details: {
                blockerId: authUser.id,
                blockedId: target.id,
            },
        });

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to block user.", 500, error);
    }
}
