import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";

const ALLOWED_STATUS = new Set(["open", "reviewing", "resolved", "rejected"]);
const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const APPEAL_SLA_HOURS = parsePositiveInt(process.env.APPEAL_SLA_HOURS, 24);
const APPEAL_SLA_SOON_MINUTES = parsePositiveInt(process.env.APPEAL_SLA_SOON_MINUTES, 120);

const getAppealSla = (createdAt: Date, status: string, nowMs: number) => {
    if (status === "resolved" || status === "rejected") {
        return {
            slaDueAt: null,
            slaRemainingMinutes: null,
            slaState: "resolved",
        } as const;
    }

    const dueAtMs = createdAt.getTime() + APPEAL_SLA_HOURS * 60 * 60 * 1000;
    const remainingMinutes = Math.ceil((dueAtMs - nowMs) / (60 * 1000));
    const slaState = remainingMinutes < 0 ? "overdue" : remainingMinutes <= APPEAL_SLA_SOON_MINUTES ? "due_soon" : "on_track";

    return {
        slaDueAt: new Date(dueAtMs).toISOString(),
        slaRemainingMinutes: remainingMinutes,
        slaState,
    } as const;
};

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
    const prioritizeSla = status === "all" || status === "open" || status === "reviewing";

    const appeals = await prisma.authenticityAppeal.findMany({
        where,
        orderBy: prioritizeSla ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor
            ? {
                  cursor: {
                      id: cursor,
                  },
                  skip: 1,
              }
            : {}),
        select: {
            id: true,
            status: true,
            decision: true,
            reason: true,
            reviewerNote: true,
            createdAt: true,
            reviewedAt: true,
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
            check: {
                select: {
                    id: true,
                    action: true,
                    status: true,
                    decision: true,
                    score: true,
                    trustedTier: true,
                    contentText: true,
                    tweet: {
                        select: {
                            id: true,
                            visibilityStatus: true,
                            author: {
                                select: {
                                    username: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    const hasMore = appeals.length > limit;
    const items = hasMore ? appeals.slice(0, limit) : appeals;
    const nowMs = Date.now();
    const itemsWithSla = items.map((appeal) => ({
        ...appeal,
        ...getAppealSla(appeal.createdAt, appeal.status, nowMs),
    }));
    const nextCursor = hasMore ? items[items.length - 1]?.id || null : null;

    return NextResponse.json({
        success: true,
        appeals: itemsWithSla,
        hasMore,
        nextCursor,
        slaConfig: {
            hours: APPEAL_SLA_HOURS,
            dueSoonMinutes: APPEAL_SLA_SOON_MINUTES,
        },
    });
}
