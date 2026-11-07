import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";
import { visibleAuthorWhereForViewer, visibleTweetWhereForViewer } from "@/utilities/social/access";

export async function GET(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    const viewerId = authUser?.id ?? null;
    const visibleAuthorWhere = visibleAuthorWhereForViewer(viewerId);
    const visibleTweetWhere = visibleTweetWhereForViewer(viewerId);

    try {
        const tweets = await prisma.tweet.findMany({
            where: {
                author: {
                    username: username,
                    ...visibleAuthorWhere,
                },
                isReply: true,
                AND: [
                    visibleTweetWhere,
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
        return errorResponse(requestId, "Failed to load replies.", 500, error);
    }
}
