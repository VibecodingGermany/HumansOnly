import { createHash } from "crypto";
import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { getHumanRuntimeConfig } from "@/utilities/human/config";

type PolicySection = {
    id: string;
    title: string;
    bullets: string[];
};

const POLICY_LOCALE = "en-US";
const POLICY_TITLE = "Humans Only Authenticity Rules";
const POLICY_EFFECTIVE_AT = new Date("2026-03-02T00:00:00.000Z");

const POLICY_SECTIONS: PolicySection[] = [
    {
        id: "human-originality",
        title: "Human Originality Required",
        bullets: [
            "Public posts, replies, and profile text must be written by a human.",
            "Fully AI-generated text is not allowed.",
            "Prompt-to-post workflows that publish without human authorship are prohibited.",
        ],
    },
    {
        id: "media-authenticity",
        title: "Media Authenticity",
        bullets: [
            "AI-generated images or videos must not be published as human-created media.",
            "Manipulated media intended to deceive people is prohibited.",
            "We may run provenance checks and request additional verification before publication.",
        ],
    },
    {
        id: "verification-and-challenge",
        title: "Verification and Challenge",
        bullets: [
            "Before publishing, users may be required to complete a human challenge.",
            "Bypassing or automating challenge flows is prohibited.",
            "Repeated failed checks may trigger moderation review or temporary publishing limits.",
        ],
    },
    {
        id: "moderation-enforcement",
        title: "Moderation and Appeals",
        bullets: [
            "We may block, limit, or review content that appears non-human or policy-violating.",
            "Moderation decisions are logged for security and compliance.",
            "Users can request a human review through support channels.",
        ],
    },
];

const stablePolicyHashInput = (version: string) =>
    JSON.stringify({
        version,
        locale: POLICY_LOCALE,
        title: POLICY_TITLE,
        effectiveAt: POLICY_EFFECTIVE_AT.toISOString(),
        sections: POLICY_SECTIONS,
    });

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const fingerprintSalt = process.env.HUMAN_FINGERPRINT_SALT || process.env.JWT_SECRET_KEY || "humans-only";

const anonymizeFingerprint = (value: string | null) => {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    return hash(`${fingerprintSalt}:${normalized}`);
};

const readClientIp = (request: NextRequest) => {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first;
    }

    return request.headers.get("x-real-ip") || null;
};

export const getCurrentPolicyDefinition = () => {
    const { policyVersion } = getHumanRuntimeConfig();
    const checksum = hash(stablePolicyHashInput(policyVersion));

    return {
        version: policyVersion,
        locale: POLICY_LOCALE,
        title: POLICY_TITLE,
        effectiveAt: POLICY_EFFECTIVE_AT,
        sections: POLICY_SECTIONS,
        checksum,
    };
};

export const ensureCurrentPolicyDocument = async () => {
    const current = getCurrentPolicyDefinition();

    const existing = await prisma.policyDocument.findUnique({
        where: {
            version: current.version,
        },
    });

    if (existing) return existing;

    return prisma.policyDocument.create({
        data: {
            version: current.version,
            locale: current.locale,
            title: current.title,
            sections: current.sections,
            checksum: current.checksum,
            effectiveAt: current.effectiveAt,
        },
    });
};

export const getCurrentPolicyWithAcceptance = async (userId?: string | null) => {
    const policy = await ensureCurrentPolicyDocument();

    if (!userId) {
        return {
            policy,
            acceptedAt: null as Date | null,
        };
    }

    const acceptance = await prisma.policyAcceptance.findFirst({
        where: {
            userId,
            policyDocumentId: policy.id,
        },
        select: {
            acceptedAt: true,
        },
    });

    return {
        policy,
        acceptedAt: acceptance?.acceptedAt || null,
    };
};

export const hasAcceptedCurrentPolicy = async (userId: string, ruleVersion?: string | null) => {
    const policy = await ensureCurrentPolicyDocument();

    if (ruleVersion && ruleVersion !== policy.version) {
        return {
            accepted: false,
            policy,
        };
    }

    const acceptance = await prisma.policyAcceptance.findFirst({
        where: {
            userId,
            policyDocumentId: policy.id,
        },
        select: {
            id: true,
            acceptedAt: true,
        },
    });

    return {
        accepted: Boolean(acceptance),
        acceptedAt: acceptance?.acceptedAt || null,
        policy,
    };
};

export const acceptCurrentPolicy = async ({
    userId,
    version,
    checksum,
    request,
}: {
    userId: string;
    version: string;
    checksum: string;
    request: NextRequest;
}) => {
    const policy = await ensureCurrentPolicyDocument();

    if (version !== policy.version || checksum !== policy.checksum) {
        return {
            success: false as const,
            message: "Rules version or checksum mismatch.",
            policy,
        };
    }

    const ipHash = anonymizeFingerprint(readClientIp(request));
    const userAgentHash = anonymizeFingerprint(request.headers.get("user-agent"));

    const acceptance = await prisma.policyAcceptance.upsert({
        where: {
            userId_policyDocumentId: {
                userId,
                policyDocumentId: policy.id,
            },
        },
        update: {
            version: policy.version,
            checksum: policy.checksum,
            acceptedAt: new Date(),
            ipHash,
            userAgentHash,
        },
        create: {
            userId,
            policyDocumentId: policy.id,
            version: policy.version,
            checksum: policy.checksum,
            ipHash,
            userAgentHash,
        },
    });

    return {
        success: true as const,
        acceptance,
        policy,
    };
};
