import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { createNotification } from "@/utilities/fetch";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { canUsersInteract } from "@/utilities/social/access";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function POST(
    request: NextRequest,
    { params: { tweetId, username } }: { params: { tweetId: string; username: string } }
) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const secret = process.env.CREATION_SECRET_KEY;

    if (!secret) {
        return errorResponse(requestId, "Secret key not found.", 500);
    }

    try {
        const targetTweet = await prisma.tweet.findUnique({
            where: {
                id: tweetId,
            },
            select: {
                id: true,
                authorId: true,
                visibilityStatus: true,
                author: {
                    select: {
                        username: true,
                        isPrivate: true,
                        followers: {
                            where: {
                                id: authUser.id,
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        if (!targetTweet || targetTweet.author.username !== username) {
            return NextResponse.json({ success: false, message: "Target post not found." }, { status: 404 });
        }
        if (targetTweet.visibilityStatus !== "public" && targetTweet.authorId !== authUser.id) {
            return NextResponse.json({ success: false, message: "This post is not publicly available." }, { status: 403 });
        }

        const relation = await canUsersInteract(authUser.id, targetTweet.authorId);
        if (relation.blocked) {
            return NextResponse.json(
                { success: false, message: "You cannot interact with this user due to account restrictions." },
                { status: 403 }
            );
        }

        if (targetTweet.author.isPrivate && targetTweet.authorId !== authUser.id && targetTweet.author.followers.length === 0) {
            return NextResponse.json(
                { success: false, message: "This account is private. Follow first to interact." },
                { status: 403 }
            );
        }

        await prisma.tweet.update({
            where: {
                id: tweetId,
            },
            data: {
                retweetedBy: {
                    connect: {
                        id: authUser.id,
                    },
                },
            },
        });
        await prisma.tweet.create({
            data: {
                isRetweet: true,
                text: "",
                visibilityStatus: "public",
                authenticityDecision: "allow",
                author: {
                    connect: {
                        id: authUser.id,
                    },
                },
                retweetOf: {
                    connect: {
                        id: tweetId,
                    },
                },
            },
        });

        if (username !== authUser.username) {
            const notificationContent = {
                sender: {
                    username: authUser.username,
                    name: authUser.name || "",
                    photoUrl: authUser.photoUrl || "",
                },
                content: {
                    id: tweetId,
                },
            };

            await createNotification(username, "retweet", secret, notificationContent);
        }

        return successResponse(requestId, { success: true });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return errorResponse(requestId, "Target post not found.", 404);
        }

        return errorResponse(requestId, "Failed to repost.", 500, error);
    }
}
