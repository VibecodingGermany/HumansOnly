import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import type { ProductEventName } from "@/utilities/analytics/events";

type TrackProductEventArgs = {
    userId: string;
    eventName: ProductEventName;
    surface?: string;
    sessionId?: string;
    payload?: Record<string, unknown>;
};

const toSafeJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
    JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export const trackProductEventForUser = async ({
    userId,
    eventName,
    surface,
    sessionId,
    payload,
}: TrackProductEventArgs) => {
    try {
        await prisma.productEvent.create({
            data: {
                userId,
                eventName,
                eventVersion: "1.0",
                surface: surface || null,
                sessionId: sessionId || null,
                payloadJson: payload ? toSafeJson(payload) : undefined,
            },
            select: {
                id: true,
            },
        });
    } catch (error: unknown) {
        console.warn(
            JSON.stringify({
                event: "product_event_write_failed",
                userId,
                eventName,
                surface: surface || null,
                sessionId: sessionId || null,
                error: error instanceof Error ? error.message : String(error),
                at: new Date().toISOString(),
            })
        );
    }
};

