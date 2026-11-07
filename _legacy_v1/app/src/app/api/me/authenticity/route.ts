import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";

const ALLOWED_STATUS = new Set(["open", "reviewing", "resolved"]);

export async function GET(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || "all").trim();
    const limitRaw = Number.parseInt(searchParams.get("limit") || "30", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const where =
        status === "all"
            ? {
                  actorId: authUser.id,
              }
            : {
                  actorId: authUser.id,
                  status: ALLOWED_STATUS.has(status) ? status : "open",
              };

    const checks = await prisma.authenticityCheck.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: {
            id: true,
            action: true,
            status: true,
            decision: true,
            score: true,
            trustedTier: true,
            contentText: true,
            createdAt: true,
            reviewedAt: true,
            tweet: {
                select: {
                    id: true,
                    text: true,
                    visibilityStatus: true,
                },
            },
            appeals: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
                select: {
                    id: true,
                    status: true,
                    decision: true,
                    reason: true,
                    reviewerNote: true,
                    createdAt: true,
                    reviewedAt: true,
                },
            },
        },
    });

    return NextResponse.json({
        success: true,
        checks,
    });
}
