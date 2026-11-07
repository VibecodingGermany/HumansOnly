import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    try {
        const [notifications, total, unreadCount] = await prisma.$transaction([
            prisma.notification.findMany({
                where: {
                    userId: authUser.id,
                },
                include: {
                    user: {
                        select: {
                            username: true,
                            name: true,
                            photoUrl: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.notification.count({
                where: {
                    userId: authUser.id,
                },
            }),
            prisma.notification.count({
                where: {
                    userId: authUser.id,
                    isRead: false,
                },
            }),
        ]);

        return successResponse(requestId, {
            success: true,
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                hasMore: skip + notifications.length < total,
            },
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load notifications.", 500, error);
    }
}
