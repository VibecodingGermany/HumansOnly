import { AuthenticatedUser } from "@/utilities/auth/session";
import { consumeChallengeSession } from "@/utilities/human/challenge";
import { getHumanRuntimeConfig, HumanAction, isHumanEnforcementEnabled } from "@/utilities/human/config";
import { hasAcceptedCurrentPolicy } from "@/utilities/human/policy";
import { AuthenticityDecision, evaluateAuthenticityRisk, persistAuthenticityCheck } from "@/utilities/human/risk";
import { getUserTrustSnapshot } from "@/utilities/human/trust";

type GatePayload = {
    authUser: AuthenticatedUser;
    action: HumanAction;
    text?: string | null;
    hasMedia?: boolean;
    challengeSessionId?: string | null;
    ruleVersion?: string | null;
    tweetId?: string | null;
    mediaAssetId?: string | null;
    metadata?: Record<string, unknown>;
};

export type HumanGateFailureCode = "rules_not_accepted" | "challenge_required" | "challenge_invalid" | "challenge_misconfigured";

export const runHumanGate = async ({
    authUser,
    action,
    text,
    hasMedia = false,
    challengeSessionId,
    ruleVersion,
    tweetId,
    mediaAssetId,
    metadata,
}: GatePayload) => {
    const runtime = getHumanRuntimeConfig();
    if (!isHumanEnforcementEnabled()) {
        return {
            ok: true as const,
            policyVersion: runtime.policyVersion,
            policyAccepted: true,
            challengeSessionId: null,
            challengeScore: null,
            trust: { score: 1, tier: "high_trust", passkeyEnrolled: false, recentChallenges: 0, recentChallengeFailures: 0, strikes: 0 },
            risk: {
                score: 0,
                reasons: [],
                suggestedDecision: "allow" as const,
            },
            decision: "allow" as const,
            suggestedDecision: "allow" as const,
            authenticityCheckId: null as string | null,
            dryRun: runtime.dryRun,
        };
    }

    const policyState = await hasAcceptedCurrentPolicy(authUser.id, ruleVersion);
    if (!policyState.accepted && !runtime.dryRun) {
        return {
            ok: false as const,
            code: "rules_not_accepted" as HumanGateFailureCode,
            message: "Please accept the latest rules before posting.",
            policyVersion: policyState.policy.version,
        };
    }

    const trustSnapshot = await getUserTrustSnapshot(authUser.id);
    if (!trustSnapshot) {
        return {
            ok: false as const,
            code: "challenge_invalid" as HumanGateFailureCode,
            message: "Trust profile could not be loaded.",
            policyVersion: policyState.policy.version,
        };
    }

    const challengeResult = await consumeChallengeSession({
        userId: authUser.id,
        action,
        challengeSessionId,
    });

    let challengeSession = challengeResult.ok ? challengeResult.session ?? null : null;
    let challengeFallback: "none" | "trusted_fail_open" = "none";
    let challengeFailureCode: HumanGateFailureCode | null = null;

    if (!challengeResult.ok) {
        challengeFailureCode = challengeResult.code || "challenge_invalid";
        const trustedFailOpenEligible =
            !runtime.dryRun &&
            ["trusted", "high_trust"].includes(trustSnapshot.tier) &&
            ["challenge_required", "challenge_invalid"].includes(challengeFailureCode);

        if (!trustedFailOpenEligible) {
            return {
                ok: false as const,
                code: challengeResult.code,
                message: challengeResult.message,
                policyVersion: policyState.policy.version,
            };
        }

        challengeFallback = "trusted_fail_open";
        challengeSession = null;
    }

    const risk = evaluateAuthenticityRisk({
        text,
        hasMedia,
        challengePresent: Boolean(challengeSession),
        challengeScore: challengeSession?.challengeScore,
        trustScore: trustSnapshot.score,
        trustTier: trustSnapshot.tier,
    });

    let enforcedDecision: AuthenticityDecision = risk.suggestedDecision;
    if (!runtime.dryRun && challengeFallback === "trusted_fail_open" && risk.suggestedDecision === "allow") {
        enforcedDecision = "pending_review";
    }

    const check = await persistAuthenticityCheck({
        actorId: authUser.id,
        action,
        text,
        hasMedia,
        challengeSessionId: challengeSession?.id || null,
        challengeScore: challengeSession?.challengeScore ?? null,
        riskScore: risk.score,
        trustTier: trustSnapshot.tier,
        trustScore: trustSnapshot.score,
        suggestedDecision: enforcedDecision,
        ruleVersion: policyState.policy.version,
        tweetId,
        mediaAssetId,
        metadata: {
            ...(metadata || {}),
            reasons: risk.reasons,
            modelSuggestedDecision: risk.suggestedDecision,
            enforcedDecision,
            challengeFallback,
            challengeFailureCode,
        },
    });

    const effectiveDecision = runtime.dryRun ? "allow" : enforcedDecision;

    return {
        ok: true as const,
        policyVersion: policyState.policy.version,
        policyAccepted: policyState.accepted,
        challengeSessionId: challengeSession?.id || null,
        challengeScore: challengeSession?.challengeScore ?? null,
        trust: trustSnapshot,
        risk,
        decision: effectiveDecision,
        suggestedDecision: enforcedDecision,
        challengeFallback,
        authenticityCheckId: check.id,
        dryRun: runtime.dryRun,
    };
};
