import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";

const REPORT_STATUSES = new Set(["open", "reviewing", "resolved", "rejected"]);

export async function GET(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isModerator(authUser)) {
        return NextResponse.json({ success: false, message: "Moderator access required." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = (searchParams.get("status") || "open").trim().toLowerCase();
    const status = REPORT_STATUSES.has(statusParam) ? statusParam : "open";
    const limitRaw = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const reports = await prisma.report.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            status: true,
            reason: true,
            details: true,
            createdAt: true,
            updatedAt: true,
            reporter: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    photoUrl: true,
                },
            },
            targetUser: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    photoUrl: true,
                },
            },
            targetTweet: {
                select: {
                    id: true,
                    text: true,
                    author: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            photoUrl: true,
                        },
                    },
                },
            },
        },
    });

    return NextResponse.json({ success: true, reports });
}
