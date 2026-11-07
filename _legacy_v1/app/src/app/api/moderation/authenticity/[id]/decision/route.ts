import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";
import { logSecurityEvent } from "@/utilities/security/events";
import { enforceRateLimit } from "@/utilities/security/rateLimit";

type DecisionPayload = {
    decision?: unknown;
    note?: unknown;
};

const ALLOWED_DECISIONS = new Set(["allow", "reject", "strike"]);
const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const AUTH_DECISION_LIMIT_PER_MINUTE = parsePositiveInt(process.env.RATE_LIMIT_AUTH_DECISION_PER_MINUTE, 40);

export async function POST(request: NextRequest, { params: { id } }: { params: { id: string } }) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isModerator(authUser)) {
        return NextResponse.json({ success: false, message: "Moderator access required." }, { status: 403 });
    }

    const rateLimit = enforceRateLimit({
        key: `authenticity_decision:${authUser.id}`,
        limit: AUTH_DECISION_LIMIT_PER_MINUTE,
        windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
        logSecurityEvent("authenticity_decision_rate_limited", {
            actorId: authUser.id,
            actorUsername: authUser.username,
            checkId: id,
            limit: AUTH_DECISION_LIMIT_PER_MINUTE,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
            endpoint: request.nextUrl.pathname,
        });

        return NextResponse.json(
            {
                success: false,
                code: "rate_limited",
                message: "Too many authenticity decisions in a short time. Please retry later.",
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(rateLimit.retryAfterSeconds),
                },
            }
        );
    }

    let body: DecisionPayload;
    try {
        body = (await request.json()) as DecisionPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const decision = typeof body.decision === "string" ? body.decision.trim().toLowerCase() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!ALLOWED_DECISIONS.has(decision)) {
        return NextResponse.json({ success: false, message: "Invalid decision." }, { status: 400 });
    }

    const existing = await prisma.authenticityCheck.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            tweetId: true,
            mediaAssetId: true,
        },
    });

    if (!existing) {
        return NextResponse.json({ success: false, message: "Authenticity check not found." }, { status: 404 });
    }

    const now = new Date();

    const updated = await prisma.authenticityCheck.update({
        where: {
            id,
        },
        data: {
            decision,
            status: "resolved",
            reviewerId: authUser.id,
            reviewerNote: note ? note.slice(0, 500) : null,
            reviewedAt: now,
        },
        select: {
            id: true,
            decision: true,
            status: true,
            reviewedAt: true,
        },
    });

    if (existing.tweetId) {
        await prisma.tweet.update({
            where: { id: existing.tweetId },
            data: {
                visibilityStatus: decision === "allow" ? "public" : "blocked",
                authenticityDecision: decision,
            },
        });
    }

    if (existing.mediaAssetId) {
        await prisma.mediaAsset.update({
            where: { id: existing.mediaAssetId },
            data: {
                authenticityDecision: decision,
                moderationStatus: decision === "allow" ? "approved" : "rejected",
                moderationReason: note ? note.slice(0, 160) : "authenticity_moderation",
            },
        });
    }

    console.log(
        JSON.stringify({
            event: "authenticity_decision",
            checkId: updated.id,
            reviewerId: authUser.id,
            reviewerUsername: authUser.username,
            decision,
        })
    );

    return NextResponse.json({ success: true, check: updated });
}
