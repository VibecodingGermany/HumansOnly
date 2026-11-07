import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(
    request: NextRequest,
    { params: { tweetId, username } }: { params: { tweetId: string; username: string } }
) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const tweet = await prisma.tweet.findUnique({
            where: {
                id: tweetId,
            },
            select: {
                authorId: true,
                author: {
                    select: {
                        username: true,
                    },
                },
            },
        });

        if (!tweet) {
            return errorResponse(requestId, "Post not found.", 404);
        }

        if (tweet.authorId !== authUser.id && !isModerator(authUser)) {
            return unauthorizedResponse();
        }

        await prisma.tweet.delete({
            where: {
                id: tweetId,
            },
        });

        return successResponse(requestId, {
            success: true,
            deletedTweetId: tweetId,
            canonicalUsername: tweet.author.username,
            slugMismatch: tweet.author.username !== username,
        });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return errorResponse(requestId, "Post not found.", 404);
        }

        return errorResponse(requestId, "Failed to delete post.", 500, error);
    }
}
