import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { errorResponse, getRequestId, logApiEvent, successResponse } from "@/utilities/observability";

const MESSAGE_PRIVACY_OPTIONS = new Set(["everyone", "followers"]);

export async function GET() {
    const requestId = crypto.randomUUID();
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: authUser.id,
            },
            select: {
                isPrivate: true,
                messagePrivacy: true,
            },
        });

        if (!user) {
            return unauthorizedResponse("Your account could not be found. Please sign in again.");
        }

        return successResponse(requestId, { success: true, preferences: user });
    } catch (error: unknown) {
        return errorResponse(requestId, "Failed to load user preferences.", 500, error);
    }
}

export async function POST(request: NextRequest) {
    const requestId = getRequestId(request);
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body?.isPrivate === "boolean") {
        updates.isPrivate = body.isPrivate;
    }

    if (typeof body?.messagePrivacy === "string") {
        if (!MESSAGE_PRIVACY_OPTIONS.has(body.messagePrivacy)) {
            return errorResponse(requestId, "Invalid message privacy value.", 400);
        }
        updates.messagePrivacy = body.messagePrivacy;
    }

    if (Object.keys(updates).length === 0) {
        return errorResponse(requestId, "No valid preference fields provided.", 400);
    }

    try {
        const user = await prisma.user.update({
            where: {
                id: authUser.id,
            },
            data: updates,
            select: {
                isPrivate: true,
                messagePrivacy: true,
            },
        });

        logApiEvent("info", {
            event: "user_preferences_updated",
            requestId,
            route: "/api/users/preferences",
            details: {
                userId: authUser.id,
                fields: Object.keys(updates),
            },
        });

        return successResponse(requestId, { success: true, preferences: user });
    } catch (error: unknown) {
        if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2025") {
            return unauthorizedResponse("Your account could not be found. Please sign in again.");
        }

        return errorResponse(requestId, "Failed to update user preferences.", 500, error);
    }
}
