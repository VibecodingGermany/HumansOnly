import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { logSecurityEvent } from "@/utilities/security/events";
import { enforceRateLimit } from "@/utilities/security/rateLimit";

type AppealPayload = {
    checkId?: unknown;
    reason?: unknown;
};

const MAX_REASON_LENGTH = 500;
const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const APPEAL_SUBMIT_LIMIT_PER_DAY = parsePositiveInt(process.env.RATE_LIMIT_APPEAL_SUBMIT_PER_DAY, 12);
const APPEAL_SUBMIT_LIMIT_PER_10_MIN = parsePositiveInt(process.env.RATE_LIMIT_APPEAL_SUBMIT_PER_10_MIN, 3);

export async function GET() {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const appeals = await prisma.authenticityAppeal.findMany({
        where: {
            actorId: authUser.id,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
        select: {
            id: true,
            status: true,
            decision: true,
            reason: true,
            reviewerNote: true,
            createdAt: true,
            reviewedAt: true,
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
                            text: true,
                            visibilityStatus: true,
                        },
                    },
                },
            },
        },
    });

    return NextResponse.json({ success: true, appeals });
}

export async function POST(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const burstRateLimit = enforceRateLimit({
        key: `authenticity_appeal_submit_burst:${authUser.id}`,
        limit: APPEAL_SUBMIT_LIMIT_PER_10_MIN,
        windowMs: 10 * 60 * 1000,
    });

    if (!burstRateLimit.allowed) {
        logSecurityEvent("authenticity_appeal_submit_rate_limited", {
            actorId: authUser.id,
            actorUsername: authUser.username,
            scope: "10_min_window",
            limit: APPEAL_SUBMIT_LIMIT_PER_10_MIN,
            retryAfterSeconds: burstRateLimit.retryAfterSeconds,
            endpoint: request.nextUrl.pathname,
        });

        return NextResponse.json(
            {
                success: false,
                code: "rate_limited",
                message: "Too many appeals submitted in a short time. Please retry later.",
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(burstRateLimit.retryAfterSeconds),
                },
            }
        );
    }

    const dailyRateLimit = enforceRateLimit({
        key: `authenticity_appeal_submit:${authUser.id}`,
        limit: APPEAL_SUBMIT_LIMIT_PER_DAY,
        windowMs: 24 * 60 * 60 * 1000,
    });

    if (!dailyRateLimit.allowed) {
        logSecurityEvent("authenticity_appeal_submit_rate_limited", {
            actorId: authUser.id,
            actorUsername: authUser.username,
            scope: "24h_window",
            limit: APPEAL_SUBMIT_LIMIT_PER_DAY,
            retryAfterSeconds: dailyRateLimit.retryAfterSeconds,
            endpoint: request.nextUrl.pathname,
        });

        return NextResponse.json(
            {
                success: false,
                code: "rate_limited",
                message: "Too many appeals submitted. Please retry later.",
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(dailyRateLimit.retryAfterSeconds),
                },
            }
        );
    }

    let body: AppealPayload;
    try {
        body = (await request.json()) as AppealPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const checkId = typeof body.checkId === "string" ? body.checkId.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!checkId) {
        return NextResponse.json({ success: false, message: "checkId is required." }, { status: 400 });
    }

    if (reason.length > MAX_REASON_LENGTH) {
        return NextResponse.json({ success: false, message: "Reason must be at most 500 characters." }, { status: 400 });
    }

    const check = await prisma.authenticityCheck.findUnique({
        where: {
            id: checkId,
        },
        select: {
            id: true,
            actorId: true,
            status: true,
            decision: true,
        },
    });

    if (!check) {
        return NextResponse.json({ success: false, message: "Authenticity check not found." }, { status: 404 });
    }

    if (check.actorId !== authUser.id) {
        return NextResponse.json({ success: false, message: "You can only appeal your own checks." }, { status: 403 });
    }

    if (check.decision === "allow") {
        return NextResponse.json({ success: false, message: "Allowed checks cannot be appealed." }, { status: 409 });
    }

    if (check.status !== "resolved") {
        return NextResponse.json(
            {
                success: false,
                message: "This authenticity check is still in moderation. Appeal is available after a final decision.",
            },
            { status: 409 }
        );
    }

    const existingAppeal = await prisma.authenticityAppeal.findUnique({
        where: {
            checkId_actorId: {
                checkId: check.id,
                actorId: authUser.id,
            },
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (existingAppeal) {
        logSecurityEvent("authenticity_appeal_duplicate_submission", {
            actorId: authUser.id,
            actorUsername: authUser.username,
            checkId: check.id,
            appealId: existingAppeal.id,
            existingStatus: existingAppeal.status,
        });

        return NextResponse.json(
            {
                success: false,
                message: "An appeal already exists for this check.",
                appealId: existingAppeal.id,
                appealStatus: existingAppeal.status,
            },
            { status: 409 }
        );
    }

    const appeal = await prisma.authenticityAppeal.create({
        data: {
            checkId: check.id,
            actorId: authUser.id,
            status: "open",
            reason: reason ? reason.slice(0, MAX_REASON_LENGTH) : null,
        },
        select: {
            id: true,
            checkId: true,
            status: true,
            reason: true,
            createdAt: true,
        },
    });

    console.log(
        JSON.stringify({
            event: "authenticity_appeal_submitted",
            appealId: appeal.id,
            checkId: appeal.checkId,
            actorId: authUser.id,
            actorUsername: authUser.username,
        })
    );

    return NextResponse.json({ success: true, appeal }, { status: 201 });
}
