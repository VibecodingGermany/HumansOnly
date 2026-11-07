export const HUMAN_ACTIONS = ["post_create", "post_edit", "reply_create", "upload_post"] as const;

export type HumanAction = (typeof HUMAN_ACTIONS)[number];

const parseBoolean = (value: string | undefined, fallback: boolean) => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
};

const parseNumber = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseFloat(value || "");
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const getHumanRuntimeConfig = () => {
    const enforcementMode = process.env.HUMAN_ENFORCEMENT_MODE || "adaptive";
    const challengeProvider = process.env.HUMAN_CHALLENGE_PROVIDER || "turnstile";
    const challengeTtlSeconds = parseInteger(process.env.HUMAN_CHALLENGE_TTL_SECONDS, 300);
    const reviewThreshold = parseNumber(process.env.HUMAN_REVIEW_THRESHOLD, 0.72);
    const blockThreshold = parseNumber(process.env.HUMAN_BLOCK_THRESHOLD, 0.9);
    const policyVersion = process.env.HUMAN_RULES_VERSION || "2026-03-02.1";
    const dryRun = parseBoolean(process.env.HUMAN_DRY_RUN, true);

    return {
        enforcementMode,
        challengeProvider,
        challengeTtlSeconds,
        reviewThreshold,
        blockThreshold,
        policyVersion,
        dryRun,
    };
};

export const isKnownHumanAction = (value: unknown): value is HumanAction =>
    typeof value === "string" && (HUMAN_ACTIONS as readonly string[]).includes(value);

export const isHumanEnforcementEnabled = () => {
    const { enforcementMode } = getHumanRuntimeConfig();
    return enforcementMode !== "off";
};
