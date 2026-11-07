import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { isProductEventName } from "@/utilities/analytics/events";
import type { ProductEventName } from "@/utilities/analytics/events";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const MAX_PAYLOAD_BYTES = 4 * 1024;
const MAX_SESSION_ID_LENGTH = 64;
const MAX_SURFACE_LENGTH = 40;

type ProductEventPayload = {
    eventName?: unknown;
    surface?: unknown;
    sessionId?: unknown;
    payload?: unknown;
};

const toSafeJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const normalizeSurface = (value: unknown) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (normalized.length > MAX_SURFACE_LENGTH) return null;
    return normalized;
};

const normalizeSessionId = (value: unknown) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (normalized.length > MAX_SESSION_ID_LENGTH) return null;
    return normalized;
};

const normalizePayload = (value: unknown) => {
    if (value === undefined || value === null) {
        return { payload: undefined };
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    let payloadString = "";
    try {
        payloadString = JSON.stringify(value);
    } catch {
        return null;
    }
    if (!payloadString) return { payload: undefined };

    const byteSize = new TextEncoder().encode(payloadString).length;
    if (byteSize > MAX_PAYLOAD_BYTES) return null;

    return {
        payload: toSafeJson(value),
    };
};

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: ProductEventPayload;
    try {
        body = (await request.json()) as ProductEventPayload;
    } catch {
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }

    const eventNameCandidate = typeof body.eventName === "string" ? body.eventName.trim().toLowerCase() : "";
    if (!isProductEventName(eventNameCandidate)) {
        return errorResponse(requestId, "Invalid eventName.", 400);
    }

    const sessionId = normalizeSessionId(body.sessionId);
    if (body.sessionId !== undefined && !sessionId) {
        return errorResponse(requestId, "Invalid sessionId.", 400);
    }

    const surface = normalizeSurface(body.surface);
    if (body.surface !== undefined && !surface) {
        return errorResponse(requestId, "Invalid surface.", 400);
    }

    const payloadCandidate = normalizePayload(body.payload);
    if (!payloadCandidate) {
        return errorResponse(requestId, "Invalid payload. Use an object with a maximum of 4KB.", 400);
    }

    try {
        const event = await prisma.productEvent.create({
            data: {
                userId: authUser.id,
                eventName: eventNameCandidate as ProductEventName,
                eventVersion: "1.0",
                surface,
                sessionId,
                payloadJson: payloadCandidate.payload,
            },
            select: {
                id: true,
                eventName: true,
                createdAt: true,
            },
        });

        return successResponse(requestId, { success: true, event }, 201);
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to persist product event.", 500, error);
    }
}
