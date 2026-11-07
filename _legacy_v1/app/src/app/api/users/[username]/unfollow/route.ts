import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        await prisma.user.update({
            where: {
                username: username,
            },
            data: {
                followers: {
                    disconnect: {
                        id: authUser.id,
                    },
                },
            },
        });
        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return errorResponse(requestId, "User not found.", 404);
        }

        return errorResponse(requestId, "Failed to unfollow user.", 500, error);
    }
}
