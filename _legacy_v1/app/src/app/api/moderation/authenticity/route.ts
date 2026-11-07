import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";

const ALLOWED_STATUS = new Set(["open", "reviewing", "resolved"]);

export async function GET(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isModerator(authUser)) {
        return NextResponse.json({ success: false, message: "Moderator access required." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || "open").trim();
    const cursor = (searchParams.get("cursor") || "").trim();
    const limitRaw = Number.parseInt(searchParams.get("limit") || "30", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const where = status === "all" ? undefined : { status: ALLOWED_STATUS.has(status) ? status : "open" };

    const checks = await prisma.authenticityCheck.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor
            ? {
                  cursor: {
                      id: cursor,
                  },
                  skip: 1,
              }
            : {}),
        include: {
            actor: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    photoUrl: true,
                },
            },
            reviewer: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
            tweet: {
                select: {
                    id: true,
                    text: true,
                    visibilityStatus: true,
                    author: {
                        select: {
                            username: true,
                        },
                    },
                },
            },
            mediaAsset: {
                select: {
                    id: true,
                    url: true,
                    provenanceStatus: true,
                    syntheticRiskScore: true,
                    authenticityDecision: true,
                },
            },
            challengeSession: {
                select: {
                    id: true,
                    action: true,
                    provider: true,
                    status: true,
                    challengeScore: true,
                    createdAt: true,
                },
            },
        },
    });

    const hasMore = checks.length > limit;
    const items = hasMore ? checks.slice(0, limit) : checks;
    const nextCursor = hasMore ? items[items.length - 1]?.id || null : null;

    return NextResponse.json({
        success: true,
        checks: items,
        nextCursor,
        hasMore,
    });
}
