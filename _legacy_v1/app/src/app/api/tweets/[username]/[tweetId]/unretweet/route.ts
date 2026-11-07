import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(request: NextRequest, { params: { tweetId } }: { params: { tweetId: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const originalTweet = await prisma.tweet.findFirst({
            where: {
                id: tweetId,
            },
            select: {
                id: true,
                retweets: {
                    select: {
                        id: true,
                        authorId: true,
                    },
                },
            },
        });

        if (!originalTweet) {
            return errorResponse(requestId, "Post not found.", 404);
        }

        await prisma.tweet.update({
            where: {
                id: tweetId,
            },
            data: {
                retweetedBy: {
                    disconnect: {
                        id: authUser.id,
                    },
                },
            },
        });

        const retweetId = originalTweet.retweets.find((retweet) => retweet.authorId === authUser.id)?.id;

        if (retweetId) {
            await prisma.tweet.delete({
                where: {
                    id: retweetId,
                },
            });
        }

        return successResponse(requestId, {
            success: true,
            removedRetweet: Boolean(retweetId),
        });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return errorResponse(requestId, "Post not found.", 404);
        }

        return errorResponse(requestId, "Failed to undo repost.", 500, error);
    }
}
