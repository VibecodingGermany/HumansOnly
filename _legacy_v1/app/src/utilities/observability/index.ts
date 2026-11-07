import { NextRequest, NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error";

type LogPayload = {
    event: string;
    requestId: string;
    route?: string;
    details?: Record<string, unknown>;
};

const serializeError = (error: unknown) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return {
        value: String(error),
    };
};

export const getRequestId = (request: NextRequest) => request.headers.get("x-request-id") || crypto.randomUUID();

export const logApiEvent = (level: LogLevel, payload: LogPayload) => {
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        ...payload,
    });

    if (level === "error") {
        console.error(line);
        return;
    }

    if (level === "warn") {
        console.warn(line);
        return;
    }

    console.log(line);
};

export const errorResponse = (
    requestId: string,
    message = "Something went wrong.",
    status = 500,
    error?: unknown
) => {
    if (error) {
        logApiEvent("error", {
            event: "api_error",
            requestId,
            details: {
                message,
                error: serializeError(error),
            },
        });
    }

    return NextResponse.json(
        {
            success: false,
            message,
            requestId,
        },
        {
            status,
            headers: {
                "x-request-id": requestId,
            },
        }
    );
};

export const successResponse = (requestId: string, body: Record<string, unknown>, status = 200) =>
    NextResponse.json(
        {
            ...body,
            requestId,
        },
        {
            status,
            headers: {
                "x-request-id": requestId,
            },
        }
    );
