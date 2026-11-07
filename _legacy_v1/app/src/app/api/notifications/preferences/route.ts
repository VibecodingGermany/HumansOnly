import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const ensurePreferences = async (userId: string) =>
    prisma.notificationPreference.upsert({
        where: {
            userId,
        },
        update: {},
        create: {
            userId,
        },
    });

export async function GET(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const preferences = await ensurePreferences(authUser.id);
        return successResponse(requestId, { success: true, preferences });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load notification preferences.", 500, error);
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
        return errorResponse(requestId, "Invalid JSON payload.", 400);
    }
    const updates = Object.fromEntries(
        ["like", "reply", "follow", "retweet", "message"]
            .filter((key) => typeof body?.[key] === "boolean")
            .map((key) => [key, body[key]])
    );

    if (Object.keys(updates).length === 0) {
        return errorResponse(requestId, "No valid preference fields provided.", 400);
    }

    try {
        const preferences = await prisma.notificationPreference.upsert({
            where: {
                userId: authUser.id,
            },
            update: updates,
            create: {
                userId: authUser.id,
                ...updates,
            },
        });

        return successResponse(requestId, { success: true, preferences });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to update notification preferences.", 500, error);
    }
}
