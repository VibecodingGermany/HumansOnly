import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { comparePasswords } from "@/utilities/bcrypt";
import { buildClearedAuthCookie } from "@/utilities/auth/cookies";
import { isSuperAdminIdentity } from "@/utilities/auth/roles";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";

type DeleteAccountPayload = {
    password: string;
    confirmUsername: string;
};

const parseDeletePayload = async (request: NextRequest): Promise<DeleteAccountPayload | null> => {
    try {
        const body = await request.json();
        const password = typeof body?.password === "string" ? body.password : "";
        const confirmUsername = typeof body?.confirmUsername === "string" ? body.confirmUsername.trim() : "";

        if (!password || password.length > 128 || !confirmUsername || confirmUsername.length > 20) {
            return null;
        }

        return {
            password,
            confirmUsername,
        };
    } catch {
        return null;
    }
};

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const payload = await parseDeletePayload(request);
    if (!payload) {
        return errorResponse(requestId, "Invalid request body.", 400);
    }
    if (payload.confirmUsername !== authUser.username) {
        return errorResponse(requestId, "Username confirmation mismatch.", 400);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                username: true,
                password: true,
                role: true,
                clerkId: true,
            },
        });

        if (!user) {
            return unauthorizedResponse("Your account could not be found. Please sign in again.");
        }

        const isSuperAdmin = isSuperAdminIdentity({
            username: user.username,
            clerkId: user.clerkId,
        });
        if (isSuperAdmin || user.role === "admin") {
            return errorResponse(requestId, "Admin accounts cannot be deleted from this endpoint.", 403);
        }
        if (user.clerkId) {
            return errorResponse(requestId, "Clerk-linked account deletion is not supported on this endpoint.", 400);
        }

        const passwordIsValid = await comparePasswords(payload.password, user.password);
        if (!passwordIsValid) {
            return errorResponse(requestId, "Password is not correct.", 401);
        }

        const deletionStats = await prisma.$transaction(async (tx) => {
            const userId = user.id;

            const [deletedMessages, deletedNotifications, deletedProductEvents, deletedTweets] = await Promise.all([
                tx.message.deleteMany({
                    where: {
                        OR: [{ senderId: userId }, { recipientId: userId }],
                    },
                }),
                tx.notification.deleteMany({
                    where: { userId },
                }),
                tx.productEvent.deleteMany({
                    where: { userId },
                }),
                tx.tweet.deleteMany({
                    where: { authorId: userId },
                }),
            ]);

            await tx.user.delete({
                where: { id: userId },
            });

            return {
                messages: deletedMessages.count,
                notifications: deletedNotifications.count,
                productEvents: deletedProductEvents.count,
                tweets: deletedTweets.count,
            };
        });

        logApiEvent("info", {
            event: "user_self_delete_success",
            requestId,
            route: "/api/users/me/delete",
            details: {
                userId: authUser.id,
                username: authUser.username,
                ...deletionStats,
            },
        });

        const response = successResponse(requestId, { success: true, deleted: true, deletionStats });
        response.cookies.set(buildClearedAuthCookie());
        return response;
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return unauthorizedResponse("Your account could not be found. Please sign in again.");
        }

        return errorResponse(requestId, "Failed to delete account.", 500, error);
    }
}
