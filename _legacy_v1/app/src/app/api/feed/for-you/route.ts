import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";
import { visibleAuthorWhereForViewer, visibleTweetWhereForViewer } from "@/utilities/social/access";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CANDIDATE_MULTIPLIER = 6;

const parsePositiveInt = (value: string | null, fallback: number, max: number) => {
    const parsed = Number.parseInt(value || `${fallback}`, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
};

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1, 1000);
    const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
    const candidateSize = limit * CANDIDATE_MULTIPLIER;
    const viewerId = authUser.id;
    const visibleAuthorWhere = visibleAuthorWhereForViewer(viewerId);
    const visibleTweetWhere = visibleTweetWhereForViewer(viewerId);

    try {
        const [followingRows, excludedRows] = await Promise.all([
            prisma.user.findUnique({
                where: { id: viewerId },
                select: {
                    following: {
                        select: {
                            id: true,
                        },
                    },
                },
            }),
            prisma.recommendationFeedback.findMany({
                where: {
                    userId: viewerId,
                    feedbackType: "not_interested",
                },
                select: {
                    tweetId: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 500,
            }),
        ]);

        const followingIds = new Set((followingRows?.following || []).map((user) => user.id));
        const excludedTweetIds = excludedRows.map((row) => row.tweetId);

        const candidates = await prisma.tweet.findMany({
            where: {
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
                    excludedTweetIds.length > 0
                        ? {
                              id: {
                                  notIn: excludedTweetIds,
                              },
                          }
                        : {},
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
            orderBy: [{ createdAt: "desc" }],
            take: candidateSize,
        });

        const now = Date.now();
        const ranked = candidates
            .map((tweet) => {
                const likes = tweet.likedBy.length;
                const replies = tweet.replies.length;
                const reposts = tweet.retweetedBy.length;
                const engagementScore = likes * 0.6 + replies * 1.2 + reposts * 0.9;

                const ageHours = Math.max(0, (now - new Date(tweet.createdAt).getTime()) / (1000 * 60 * 60));
                const freshnessScore = Math.max(0, 72 - ageHours) / 72;

                const followBoost = followingIds.has(tweet.authorId) ? 1.25 : 0;
                const ownBoost = tweet.authorId === viewerId ? 0.9 : 0;

                return {
                    tweet,
                    score: engagementScore + freshnessScore + followBoost + ownBoost,
                };
            })
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.tweet.createdAt).getTime() - new Date(a.tweet.createdAt).getTime();
            });

        const total = ranked.length;
        const lastPage = Math.max(1, Math.ceil(total / limit));
        const offset = (page - 1) * limit;
        const items = ranked.slice(offset, offset + limit).map((row) => row.tweet);
        const nextPage = page + 1;

        return successResponse(requestId, {
            success: true,
            source: "for_you",
            tweets: items,
            nextPage,
            lastPage,
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load for-you feed.", 500, error);
    }
}
