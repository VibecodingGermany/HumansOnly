import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

export async function GET(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (authUser.username !== username) return unauthorizedResponse();

    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)));
    const start = (page - 1) * limit;
    const end = start + limit;

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    {
                        sender: {
                            username: username,
                        },
                    },
                    {
                        recipient: {
                            username: username,
                        },
                    },
                ],
            },
            include: {
                sender: {
                    select: {
                        name: true,
                        username: true,
                        photoUrl: true,
                        isVerifiedHuman: true,
                    },
                },
                recipient: {
                    select: {
                        name: true,
                        username: true,
                        photoUrl: true,
                        isVerifiedHuman: true,
                    },
                },
            },
            orderBy: [
                {
                    createdAt: "desc",
                },
            ],
        });

        const conversations: any = {};

        messages.forEach((message: any) => {
            const sender = message.sender.username;
            const recipient = message.recipient.username;
            const conversationKey = [sender, recipient].sort().join("-");

            if (!conversations.hasOwnProperty(conversationKey)) {
                conversations[conversationKey] = {
                    participants: [sender, recipient],
                    messages: [],
                };
            }

            conversations[conversationKey].messages.push(message);
        });

        const formattedConversations = Object.values(conversations) as Array<{
            participants: string[];
            messages: any[];
            unreadCount?: number;
        }>;

        formattedConversations.sort((a: any, b: any) => {
            const lastMessageA = a.messages[a.messages.length - 1];
            const lastMessageB = b.messages[b.messages.length - 1];

            if (lastMessageA.createdAt > lastMessageB.createdAt) {
                return -1;
            } else if (lastMessageA.createdAt < lastMessageB.createdAt) {
                return 1;
            } else {
                return 0;
            }
        });

        for (const conversation of formattedConversations) {
            const unreadCount = conversation.messages.filter(
                (message: any) => message.recipient.username === username && message.isRead === false
            ).length;
            conversation.unreadCount = unreadCount;
            conversation.messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        const paginatedConversations = formattedConversations.slice(start, end);
        const totalConversations = formattedConversations.length;
        const totalUnread = formattedConversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);

        return successResponse(requestId, {
            success: true,
            formattedConversations: paginatedConversations,
            totalUnread,
            pagination: {
                page,
                limit,
                totalConversations,
                totalPages: Math.max(1, Math.ceil(totalConversations / limit)),
                hasMore: end < totalConversations,
            },
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load conversations.", 500, error);
    }
}
