import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";
import { visibleAuthorWhereForViewer, visibleTweetWhereForViewer } from "@/utilities/social/access";

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    let page = request.nextUrl.searchParams.get("page");
    const limit = "10";
    const authUser = await getAuthenticatedUser();
    const viewerId = authUser?.id ?? null;
    const visibleAuthorWhere = visibleAuthorWhereForViewer(viewerId);
    const visibleTweetWhere = visibleTweetWhereForViewer(viewerId);

    if (!page) {
        page = "1";
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const nextPage = parsedPage + 1;

    try {
        const baseWhere = {
            isReply: false,
            author: visibleAuthorWhere,
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
        };

        const tweets = await prisma.tweet.findMany({
            where: baseWhere,
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
            skip: (parsedPage - 1) * parsedLimit,
            take: parsedLimit,
        });

        const totalTweets = await prisma.tweet.count({ where: baseWhere });
        const lastPage = Math.ceil(totalTweets / parsedLimit);

        return successResponse(requestId, { success: true, tweets, nextPage, lastPage });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load feed posts.", 500, error);
    }
}
