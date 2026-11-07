import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse("You are not logged in.");

    const username = authUser.username;

    const usersCount = await prisma.user.count({
        where: {
            isVerifiedHuman: true,
            NOT: [
                {
                    username: username,
                },
                {
                    followers: {
                        some: {
                            username: username,
                        },
                    },
                },
                {
                    blocksInitiated: {
                        some: {
                            blockedId: authUser.id,
                        },
                    },
                },
                {
                    blocksReceived: {
                        some: {
                            blockerId: authUser.id,
                        },
                    },
                },
                {
                    mutesReceived: {
                        some: {
                            muterId: authUser.id,
                        },
                    },
                },
            ],
        },
    });

    let skip = Math.floor(Math.random() * (usersCount - 3));

    if (skip < 0) skip = 0;

    try {
        const users = await prisma.user.findMany({
            where: {
                NOT: [
                    {
                        photoUrl: null,
                    },
                    {
                        username: username,
                    },
                    {
                        followers: {
                            some: {
                                username: username,
                            },
                        },
                    },
                    {
                        blocksInitiated: {
                            some: {
                                blockedId: authUser.id,
                            },
                        },
                    },
                    {
                        blocksReceived: {
                            some: {
                                blockerId: authUser.id,
                            },
                        },
                    },
                    {
                        mutesReceived: {
                            some: {
                                muterId: authUser.id,
                            },
                        },
                    },
                ],
                photoUrl: {
                    not: "",
                },
            },
            select: {
                id: true,
                name: true,
                username: true,
                createdAt: true,
                updatedAt: true,
                description: true,
                location: true,
                website: true,
                photoUrl: true,
                isVerifiedHuman: true,
                headerUrl: true,
                followers: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        description: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        followers: {
                            select: {
                                id: true,
                            },
                        },
                        following: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
                following: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        description: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        followers: {
                            select: {
                                id: true,
                            },
                        },
                        following: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
            skip: skip,
            take: 3,
            orderBy: {
                createdAt: "desc",
            },
        });
        return successResponse(requestId, { success: true, users });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load user recommendations.", 500, error);
    }
}
