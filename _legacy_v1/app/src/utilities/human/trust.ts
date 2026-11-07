import { subDays } from "date-fns";

import { prisma } from "@/prisma/client";

export type TrustTier = "new" | "standard" | "trusted" | "high_trust";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const resolveTier = (score: number): TrustTier => {
    if (score >= 0.8) return "high_trust";
    if (score >= 0.6) return "trusted";
    if (score >= 0.35) return "standard";
    return "new";
};

export const computeTrustScore = ({
    accountAgeDays,
    isVerifiedHuman,
    passkeyEnrolled,
    recentChallengeFailures,
    strikes,
}: {
    accountAgeDays: number;
    isVerifiedHuman: boolean;
    passkeyEnrolled: boolean;
    recentChallengeFailures: number;
    strikes: number;
}) => {
    let score = 0.3;

    if (accountAgeDays >= 7) score += 0.1;
    if (accountAgeDays >= 30) score += 0.1;
    if (accountAgeDays >= 180) score += 0.1;

    if (isVerifiedHuman) score += 0.15;
    if (passkeyEnrolled) score += 0.15;

    score -= Math.min(0.2, recentChallengeFailures * 0.05);
    score -= Math.min(0.4, strikes * 0.15);

    return clamp(score);
};

export const getUserTrustSnapshot = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            createdAt: true,
            isVerifiedHuman: true,
        },
    });

    if (!user) return null;

    const recentWindow = subDays(new Date(), 7);

    const [recentChallengeFailures, recentChallengeCount, strikeCount] = await prisma.$transaction([
        prisma.humanChallengeSession.count({
            where: {
                userId,
                createdAt: {
                    gte: recentWindow,
                },
                status: {
                    in: ["failed", "expired"],
                },
            },
        }),
        prisma.humanChallengeSession.count({
            where: {
                userId,
                createdAt: {
                    gte: recentWindow,
                },
            },
        }),
        prisma.authenticityCheck.count({
            where: {
                actorId: userId,
                decision: {
                    in: ["strike", "reject", "block"],
                },
            },
        }),
    ]);

    // Clerk passkey signal is introduced in wave 8.1. For now keep explicit false.
    const passkeyEnrolled = false;

    const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const score = computeTrustScore({
        accountAgeDays,
        isVerifiedHuman: user.isVerifiedHuman,
        passkeyEnrolled,
        recentChallengeFailures,
        strikes: strikeCount,
    });

    return {
        userId: user.id,
        score,
        tier: resolveTier(score),
        passkeyEnrolled,
        recentChallenges: recentChallengeCount,
        recentChallengeFailures,
        strikes: strikeCount,
    };
};
