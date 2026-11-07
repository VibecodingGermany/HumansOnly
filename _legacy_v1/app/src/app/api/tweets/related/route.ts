import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";
import { visibleAuthorWhereForViewer, visibleTweetWhereForViewer } from "@/utilities/social/access";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    const visibleAuthorWhere = visibleAuthorWhereForViewer(authUser.id);
    const visibleTweetWhere = visibleTweetWhereForViewer(authUser.id);

    try {
        const tweets = await prisma.tweet.findMany({
            where: {
                isReply: false,
                author: visibleAuthorWhere,
                AND: [
                    visibleTweetWhere,
                    {
                        OR: [
                            {
                                authorId: authUser.id,
                            },
                            {
                                author: {
                                    followers: {
                                        some: {
                                            id: authUser.id,
                                        },
                                    },
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
                                    visibilityStatus: "public",
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
                                        photoUrl: true,
                                        description: true,
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
                                photoUrl: true,
                                description: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                {
                    createdAt: "desc",
                },
            ],
        });
        return successResponse(requestId, { success: true, tweets });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load related posts.", 500, error);
    }
}
