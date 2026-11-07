import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/prisma/client";
import { getHumanRuntimeConfig, HumanAction } from "@/utilities/human/config";

type TurnstileResponse = {
    success?: boolean;
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    score?: number;
    "error-codes"?: string[];
};

export type ChallengeGateResult = {
    ok: boolean;
    code?: "challenge_required" | "challenge_invalid" | "challenge_misconfigured";
    message?: string;
    sessionId?: string;
    sessionScore?: number | null;
};

const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

const verifyTurnstileToken = async ({
    token,
    requestIp,
}: {
    token: string;
    requestIp?: string | null;
}) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        return {
            ok: false,
            errorCode: "secret_missing",
            response: {
                success: false,
                "error-codes": ["secret-missing"],
            } as TurnstileResponse,
        };
    }

    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (requestIp) body.set("remoteip", requestIp);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
        cache: "no-store",
    });

    const json = (await response.json()) as TurnstileResponse;

    if (!response.ok || !json.success) {
        return {
            ok: false,
            errorCode: json["error-codes"]?.[0] || "verification_failed",
            response: json,
        };
    }

    return {
        ok: true,
        errorCode: null,
        response: json,
    };
};

export const verifyAndCreateChallengeSession = async ({
    userId,
    action,
    token,
    ruleVersion,
    requestHostname,
    requestIp,
}: {
    userId: string;
    action: HumanAction;
    token?: string | null;
    ruleVersion?: string | null;
    requestHostname?: string | null;
    requestIp?: string | null;
}) => {
    const { dryRun, challengeProvider, challengeTtlSeconds } = getHumanRuntimeConfig();

    const normalizedToken = typeof token === "string" ? token.trim() : "";
    if (!normalizedToken && !dryRun) {
        return {
            ok: false,
            code: "challenge_required",
            message: "Human challenge token is required.",
        } satisfies ChallengeGateResult;
    }

    const tokenHashSource = normalizedToken || `dry-run:${userId}:${action}:${Date.now()}:${Math.random()}`;
    const tokenHash = hashToken(tokenHashSource);

    if (normalizedToken) {
        const replay = await prisma.humanChallengeSession.findFirst({
            where: {
                tokenHash,
                status: {
                    in: ["verified", "used"],
                },
            },
            select: {
                id: true,
            },
        });

        if (replay && !dryRun) {
            return {
                ok: false,
                code: "challenge_invalid",
                message: "Challenge token has already been used.",
            } satisfies ChallengeGateResult;
        }
    }

    let providerResponse: TurnstileResponse | null = null;
    let status: "verified" | "failed" = "verified";
    let errorCode: string | null = null;
    let challengeScore: number | null = null;

    if (challengeProvider === "turnstile" && normalizedToken) {
        const verification = await verifyTurnstileToken({
            token: normalizedToken,
            requestIp,
        });

        providerResponse = verification.response;

        const hostnameMismatch = Boolean(
            verification.response?.hostname && requestHostname && verification.response.hostname !== requestHostname
        );
        const actionMismatch = Boolean(verification.response?.action && verification.response.action !== action);

        if (!verification.ok || hostnameMismatch || actionMismatch) {
            status = "failed";
            errorCode = hostnameMismatch ? "hostname_mismatch" : actionMismatch ? "action_mismatch" : verification.errorCode;
        } else {
            challengeScore =
                typeof verification.response.score === "number" ? Number(verification.response.score.toFixed(3)) : null;
        }
    } else if (!dryRun) {
        status = "failed";
        errorCode = "provider_unavailable";
    } else {
        challengeScore = 0.5;
        providerResponse = {
            success: true,
            action,
            hostname: requestHostname || undefined,
            score: challengeScore,
        };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + challengeTtlSeconds * 1000);

    const session = await prisma.humanChallengeSession.create({
        data: {
            userId,
            action,
            provider: challengeProvider,
            tokenHash,
            status,
            challengeScore,
            hostname: providerResponse?.hostname || requestHostname || null,
            ruleVersion: ruleVersion || null,
            errorCode,
            responseJson: providerResponse ?? Prisma.JsonNull,
            verifiedAt: status === "verified" ? now : null,
            expiresAt,
        },
    });

    if (status !== "verified" && !dryRun) {
        return {
            ok: false,
            code: errorCode === "provider_unavailable" ? "challenge_misconfigured" : "challenge_invalid",
            message: "Human challenge verification failed.",
        } satisfies ChallengeGateResult;
    }

    return {
        ok: true,
        sessionId: session.id,
        sessionScore: session.challengeScore,
    } satisfies ChallengeGateResult;
};

export const consumeChallengeSession = async ({
    userId,
    action,
    challengeSessionId,
}: {
    userId: string;
    action: HumanAction;
    challengeSessionId?: string | null;
}) => {
    const { dryRun } = getHumanRuntimeConfig();

    const normalizedSessionId = typeof challengeSessionId === "string" ? challengeSessionId.trim() : "";
    if (!normalizedSessionId) {
        if (dryRun) {
            return {
                ok: true,
                session: null,
                missingSession: true,
            };
        }

        return {
            ok: false,
            code: "challenge_required" as const,
            message: "Challenge session is required.",
        };
    }

    const existing = await prisma.humanChallengeSession.findFirst({
        where: {
            id: normalizedSessionId,
            userId,
        },
    });

    if (!existing) {
        if (dryRun) {
            return {
                ok: true,
                session: null,
                missingSession: true,
            };
        }

        return {
            ok: false,
            code: "challenge_invalid" as const,
            message: "Challenge session not found.",
        };
    }

    if (existing.action !== action || existing.status !== "verified") {
        if (dryRun) {
            return {
                ok: true,
                session: existing,
                bypassed: true,
            };
        }

        return {
            ok: false,
            code: "challenge_invalid" as const,
            message: "Challenge session is not valid for this action.",
        };
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
        await prisma.humanChallengeSession.update({
            where: {
                id: existing.id,
            },
            data: {
                status: "expired",
            },
        });

        if (dryRun) {
            return {
                ok: true,
                session: existing,
                bypassed: true,
            };
        }

        return {
            ok: false,
            code: "challenge_invalid" as const,
            message: "Challenge session has expired.",
        };
    }

    const consumed = await prisma.humanChallengeSession.update({
        where: {
            id: existing.id,
        },
        data: {
            status: "used",
            usedAt: new Date(),
        },
    });

    return {
        ok: true,
        session: consumed,
    };
};
