type SecurityEventPayload = Record<string, unknown>;

export const logSecurityEvent = (event: string, payload: SecurityEventPayload) => {
    try {
        console.warn(
            JSON.stringify({
                event,
                ts: new Date().toISOString(),
                ...payload,
            })
        );
    } catch {
        console.warn(
            JSON.stringify({
                event: "security_event_logging_failed",
                originalEvent: event,
                ts: new Date().toISOString(),
            })
        );
    }
};
