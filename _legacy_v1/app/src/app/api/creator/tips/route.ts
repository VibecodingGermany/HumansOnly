import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const ALLOWED_CURRENCIES = new Set(["EUR", "USD", "GBP"]);

const normalizeCurrency = (value: unknown, fallback = "EUR") => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toUpperCase();
    return ALLOWED_CURRENCIES.has(normalized) ? normalized : fallback;
};

const normalizeAmount = (value: unknown) => {
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    return Math.min(Math.max(value, 100), 100000);
};

const normalizeMessage = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 160);
};

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return errorResponse(requestId, "Invalid JSON body.", 400);
    }

    const creatorUsername = typeof body.creatorUsername === "string" ? body.creatorUsername.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : null;
    const amountCents = normalizeAmount(body.amountCents);
    const message = normalizeMessage(body.message);

    if (!creatorUsername) {
        return errorResponse(requestId, "creatorUsername is required.", 400);
    }

    if (!amountCents) {
        return errorResponse(requestId, "amountCents must be an integer between 100 and 100000.", 400);
    }

    try {
        const creator = await prisma.user.findUnique({
            where: {
                username: creatorUsername,
            },
            select: {
                id: true,
                username: true,
                creatorProfile: true,
            },
        });

        if (!creator || !creator.creatorProfile) {
            return errorResponse(requestId, "Creator profile not found.", 404);
        }

        if (!creator.creatorProfile.supportEnabled) {
            return errorResponse(requestId, "This creator has not enabled supporter payments yet.", 400);
        }

        if (creator.id === authUser.id) {
            return errorResponse(requestId, "You cannot tip your own creator profile.", 400);
        }

        if (amountCents < creator.creatorProfile.tipMinCents) {
            return errorResponse(
                requestId,
                `Minimum support amount is ${creator.creatorProfile.tipMinCents} ${creator.creatorProfile.currency} cents.`,
                400
            );
        }

        let linkedItemId: string | null = null;
        if (itemId) {
            const item = await prisma.creatorPortfolioItem.findFirst({
                where: {
                    id: itemId,
                    creatorProfileId: creator.creatorProfile.id,
                    isPublished: true,
                },
                select: {
                    id: true,
                },
            });
            linkedItemId = item?.id || null;
        }

        const tip = await prisma.creatorTip.create({
            data: {
                creatorProfileId: creator.creatorProfile.id,
                senderId: authUser.id,
                itemId: linkedItemId,
                amountCents,
                currency: normalizeCurrency(body.currency, creator.creatorProfile.currency),
                status: "recorded",
                provider: "manual",
                message,
            },
        });

        return successResponse(requestId, {
            success: true,
            tip,
            checkoutUrl: null,
            mode: "recorded_support",
            message:
                "Support intent recorded. Configure Stripe Connect to activate direct card payments and automatic creator payouts.",
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not create support payment.", 500, error);
    }
}
