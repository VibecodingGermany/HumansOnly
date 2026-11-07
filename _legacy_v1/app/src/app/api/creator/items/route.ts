import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const ALLOWED_MEDIA_TYPES = new Set(["image", "audio"]);
const ALLOWED_CURRENCIES = new Set(["EUR", "USD", "GBP"]);
const ALLOWED_LICENSING_TYPES = new Set(["personal", "commercial", "exclusive"]);

const normalizeOptionalText = (value: unknown, maxLength: number) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
};

const normalizeCurrency = (value: unknown, fallback = "EUR") => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toUpperCase();
    return ALLOWED_CURRENCIES.has(normalized) ? normalized : fallback;
};

const normalizePrice = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    return Math.min(Math.max(value, 100), 500000);
};

const normalizeBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

const sanitizeRequiredMediaUrl = (value: unknown) => {
    const sanitized = sanitizeMediaUrl(value);
    return sanitized || null;
};

const sanitizeOptionalMediaUrl = (value: unknown) => {
    if (value === null || value === undefined) return null;
    return sanitizeMediaUrl(value);
};

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
                items: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

        return successResponse(requestId, {
            success: true,
            profile: creatorProfile,
            items: creatorProfile?.items || [],
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not load creator items.", 500, error);
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

    const title = normalizeOptionalText(body.title, 120);
    if (!title) {
        return errorResponse(requestId, "title is required.", 400);
    }

    const mediaTypeRaw = typeof body.mediaType === "string" ? body.mediaType.trim().toLowerCase() : "image";
    if (!ALLOWED_MEDIA_TYPES.has(mediaTypeRaw)) {
        return errorResponse(requestId, "mediaType must be image or audio.", 400);
    }

    const mediaUrl = sanitizeRequiredMediaUrl(body.mediaUrl);
    if (!mediaUrl) {
        return errorResponse(requestId, "mediaUrl must be a valid uploaded media URL.", 400);
    }

    const description = normalizeOptionalText(body.description, 500);
    const previewUrl = sanitizeOptionalMediaUrl(body.previewUrl);
    const thumbnailUrl = sanitizeOptionalMediaUrl(body.thumbnailUrl);
    const priceCents = normalizePrice(body.priceCents);
    const currency = normalizeCurrency(body.currency, "EUR");
    const licensingTypeRaw = typeof body.licensingType === "string" ? body.licensingType.trim().toLowerCase() : "personal";
    const licensingType = ALLOWED_LICENSING_TYPES.has(licensingTypeRaw) ? licensingTypeRaw : "personal";
    const isPublished = normalizeBoolean(body.isPublished, false);

    try {
        const profile = await prisma.creatorProfile.upsert({
            where: {
                userId: authUser.id,
            },
            create: {
                userId: authUser.id,
                stageName: authUser.name || authUser.username,
            },
            update: {},
            select: {
                id: true,
            },
        });

        const item = await prisma.creatorPortfolioItem.create({
            data: {
                creatorProfileId: profile.id,
                ownerId: authUser.id,
                title,
                description,
                mediaType: mediaTypeRaw,
                mediaUrl,
                previewUrl,
                thumbnailUrl,
                priceCents,
                currency,
                licensingType,
                isPublished,
                publishedAt: isPublished ? new Date() : null,
            },
        });

        return successResponse(requestId, {
            success: true,
            item,
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not create creator item.", 500, error);
    }
}
