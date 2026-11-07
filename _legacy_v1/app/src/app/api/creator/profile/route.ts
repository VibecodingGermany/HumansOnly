import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const ALLOWED_CURRENCIES = new Set(["EUR", "USD", "GBP"]);
const ALLOWED_PAYOUT_PROVIDERS = new Set(["none", "manual", "stripe"]);
const ALLOWED_PAYOUT_STATUS = new Set(["not_connected", "pending", "active", "restricted"]);

const normalizeOptionalText = (value: unknown, maxLength: number) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
};

const normalizeGenres = (value: unknown) => {
    if (!Array.isArray(value)) return [];

    return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.slice(0, 24))
        .slice(0, 8);
};

const normalizeCurrency = (value: unknown, fallback = "EUR") => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toUpperCase();
    return ALLOWED_CURRENCIES.has(normalized) ? normalized : fallback;
};

const normalizeTipMinCents = (value: unknown, fallback = 200) => {
    if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
    return Math.min(Math.max(value, 100), 20000);
};

const normalizeBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const creatorProfile = await prisma.creatorProfile.findUnique({
            where: {
                userId: authUser.id,
            },
            include: {
                _count: {
                    select: {
                        items: true,
                        tipsReceived: true,
                    },
                },
            },
        });

        return successResponse(requestId, {
            success: true,
            profile: creatorProfile,
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not load creator profile.", 500, error);
    }
}

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

    try {
        const stageName = normalizeOptionalText(body.stageName, 60);
        const bio = normalizeOptionalText(body.bio, 500);
        const primaryDiscipline = normalizeOptionalText(body.primaryDiscipline, 30);
        const genres = normalizeGenres(body.genres);
        const supportEnabled = normalizeBoolean(body.supportEnabled, false);
        const shopEnabled = normalizeBoolean(body.shopEnabled, false);
        const tipMinCents = normalizeTipMinCents(body.tipMinCents, 200);
        const currency = normalizeCurrency(body.currency, "EUR");

        const payoutProviderRaw = typeof body.payoutProvider === "string" ? body.payoutProvider.trim().toLowerCase() : "none";
        const payoutProvider = ALLOWED_PAYOUT_PROVIDERS.has(payoutProviderRaw) ? payoutProviderRaw : "none";

        const payoutStatusRaw = typeof body.payoutStatus === "string" ? body.payoutStatus.trim().toLowerCase() : "not_connected";
        const payoutStatus = ALLOWED_PAYOUT_STATUS.has(payoutStatusRaw) ? payoutStatusRaw : "not_connected";
        const payoutAccountId = normalizeOptionalText(body.payoutAccountId, 120);

        const profile = await prisma.creatorProfile.upsert({
            where: {
                userId: authUser.id,
            },
            create: {
                userId: authUser.id,
                stageName,
                bio,
                primaryDiscipline,
                genres,
                supportEnabled,
                shopEnabled,
                tipMinCents,
                currency,
                payoutProvider,
                payoutStatus,
                payoutAccountId,
            },
            update: {
                stageName,
                bio,
                primaryDiscipline,
                genres,
                supportEnabled,
                shopEnabled,
                tipMinCents,
                currency,
                payoutProvider,
                payoutStatus,
                payoutAccountId,
            },
        });

        return successResponse(requestId, {
            success: true,
            profile,
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not save creator profile.", 500, error);
    }
}
