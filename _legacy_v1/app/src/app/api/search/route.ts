import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";
import { visibleAuthorWhereForViewer } from "@/utilities/social/access";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const query = request.nextUrl.searchParams.get("q");
    const authUser = await getAuthenticatedUser();
    const visibleAuthorWhere = visibleAuthorWhereForViewer(authUser?.id ?? null);

    if (!query) return errorResponse(requestId, "Missing query.", 400);

    try {
        const tweets = await prisma.tweet.findMany({
            where: {
                author: visibleAuthorWhere,
                AND: [
                    {
                        OR: [
                            {
                                text: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                            {
                                author: {
                                    OR: [
                                        {
                                            name: {
                                                contains: query,
                                                mode: "insensitive",
                                            },
                                        },
                                        {
                                            username: {
                                                contains: query,
                                                mode: "insensitive",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    {
                        OR: [
                            {
                                isRetweet: false,
                            },
                            {
                                retweetOf: {
                                    author: visibleAuthorWhere,
                                },
                            },
                        ],
                    },
                ],
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        description: true,
                    },
                },
                likedBy: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        description: true,
                    },
                },
                retweetedBy: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        isVerifiedHuman: true,
                        photoUrl: true,
                        description: true,
                    },
                },
                retweetOf: {
                    select: {
                        id: true,
                        author: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                isVerifiedHuman: true,
                                photoUrl: true,
                                description: true,
                            },
                        },
                        authorId: true,
                        createdAt: true,
                        likedBy: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                isVerifiedHuman: true,
                                photoUrl: true,
                                description: true,
                            },
                        },
                        retweetedBy: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                isVerifiedHuman: true,
                                photoUrl: true,
                                description: true,
                            },
                        },
                        photoUrl: true,
                        text: true,
                        isReply: true,
                        repliedTo: {
                            select: {
                                id: true,
                                author: {
                                    select: {
                                        id: true,
                                        username: true,
                                        name: true,
                                        isVerifiedHuman: true,
                                        description: true,
                                        photoUrl: true,
                                    },
                                },
                            },
                        },
                        replies: {
                            select: {
                                authorId: true,
                            },
                        },
                    },
                },
                replies: {
                    select: {
                        id: true,
                    },
                },
                repliedTo: {
                    select: {
                        id: true,
                        author: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                isVerifiedHuman: true,
                                description: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return successResponse(requestId, { success: true, tweets });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to run search.", 500, error);
    }
}
