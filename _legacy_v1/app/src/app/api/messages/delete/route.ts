import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse("Unauthorized");

    let participants: string[] = [];
    try {
        const body = (await request.json()) as { participants?: unknown };
        participants = Array.isArray(body.participants) ? (body.participants as string[]) : [];
    } catch {
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }

    // Validate participants
    if (!Array.isArray(participants) || participants.length !== 2) {
        return errorResponse(requestId, "Invalid participants.", 400);
    }

    // Verify token owner is one of the participants
    if (!participants.includes(authUser.username)) {
        return errorResponse(requestId, "You are not authorized to delete these messages.", 403);
    }

    try {
        await prisma.message.deleteMany({
            where: {
                OR: [
                    {
                        sender: {
                            username: participants[0],
                        },
                        recipient: {
                            username: participants[1],
                        },
                    },
                    {
                        sender: {
                            username: participants[1],
                        },
                        recipient: {
                            username: participants[0],
                        },
                    },
                ],
            },
        });
        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to delete conversation.", 500, error);
    }
}
