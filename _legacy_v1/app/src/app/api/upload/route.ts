import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { getAuthenticatedUser } from "@/utilities/auth/session";
import { prisma } from "@/prisma/client";
import { storeMediaBuffer, type ServerUploadType } from "@/utilities/storage/server";
import { InvalidUploadImageError, optimizeUploadImage } from "@/utilities/media/optimizeUploadImage";
import { runHumanGate } from "@/utilities/human/gate";
import { extractProvenanceSignals } from "@/utilities/media/provenance";

const IMAGE_UPLOAD_TYPES = new Set<ServerUploadType>(["post", "profile", "header", "creator_image"]);
const AUDIO_UPLOAD_TYPES = new Set<ServerUploadType>(["creator_audio"]);
const ALLOWED_UPLOAD_TYPES: ServerUploadType[] = ["post", "profile", "header", "creator_image", "creator_audio"];

const ALLOWED_IMAGE_DECLARED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
]);

const ALLOWED_AUDIO_DECLARED_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
    "audio/ogg",
]);

const ALLOWED_IMAGE_DETECTED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/heif"]);

const AUDIO_MIME_EXTENSION: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
};

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_AUDIO_SIZE = 30 * 1024 * 1024;
const MAX_REQUEST_SIZE = Number.parseInt(process.env.UPLOAD_MAX_REQUEST_BYTES || `${MAX_IMAGE_SIZE + 2 * 1024 * 1024}`, 10);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DAILY_UPLOAD_LIMIT = Number.parseInt(process.env.UPLOAD_MAX_FILES_PER_DAY || "40", 10);
const DAILY_BYTE_LIMIT = Number.parseInt(process.env.UPLOAD_MAX_BYTES_PER_DAY || `${250 * 1024 * 1024}`, 10);

const mimeTypeMatches = (declaredMimeType: string, detectedMimeType: string) => {
    if (!declaredMimeType) return true;
    if (declaredMimeType === detectedMimeType) return true;
    if (declaredMimeType === "image/heic" && detectedMimeType === "image/heif") return true;
    return false;
};

const extensionFromName = (filename: string) => {
    const candidate = filename.split(".").pop()?.toLowerCase() || "";
    if (!candidate) return null;
    return candidate.replace(/[^a-z0-9]/g, "") || null;
};

export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const contentTypeHeader = (request.headers.get("content-type") || "").toLowerCase();
        if (!contentTypeHeader.includes("multipart/form-data")) {
            return NextResponse.json({ success: false, error: "Content-Type must be multipart/form-data." }, { status: 415 });
        }

        const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
        if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Request too large. Maximum ${Math.round(MAX_REQUEST_SIZE / 1024 / 1024)}MB allowed.`,
                },
                { status: 413 }
            );
        }

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid multipart payload." }, { status: 400 });
        }

        const formFile = formData.get("file");
        if (!(formFile instanceof File)) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        const file = formFile;
        const rawType = formData.get("type");
        if (rawType !== null && (typeof rawType !== "string" || !ALLOWED_UPLOAD_TYPES.includes(rawType as ServerUploadType))) {
            return NextResponse.json({ success: false, error: "Invalid upload type." }, { status: 400 });
        }

        const type = (typeof rawType === "string" ? rawType : "post") as ServerUploadType;
        const isImageUpload = IMAGE_UPLOAD_TYPES.has(type);
        const isAudioUpload = AUDIO_UPLOAD_TYPES.has(type);

        if (!isImageUpload && !isAudioUpload) {
            return NextResponse.json({ success: false, error: "Unsupported upload type." }, { status: 400 });
        }

        const challengeSessionId =
            typeof formData.get("challengeSessionId") === "string"
                ? String(formData.get("challengeSessionId")).trim()
                : null;
        const ruleVersion = typeof formData.get("ruleVersion") === "string" ? String(formData.get("ruleVersion")).trim() : null;

        if (file.size <= 0) {
            return NextResponse.json({ success: false, error: "File is empty." }, { status: 400 });
        }

        const declaredMimeType = (file.type || "").toLowerCase();
        if (isImageUpload && declaredMimeType && !ALLOWED_IMAGE_DECLARED_TYPES.has(declaredMimeType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid image type. Allowed: ${Array.from(ALLOWED_IMAGE_DECLARED_TYPES).join(", ")}`,
                },
                { status: 400 }
            );
        }

        if (isAudioUpload && declaredMimeType && !ALLOWED_AUDIO_DECLARED_TYPES.has(declaredMimeType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid audio type. Allowed: ${Array.from(ALLOWED_AUDIO_DECLARED_TYPES).join(", ")}`,
                },
                { status: 400 }
            );
        }

        const uploadSizeLimit = isAudioUpload ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > uploadSizeLimit) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File too large. Maximum ${Math.round(uploadSizeLimit / 1024 / 1024)}MB allowed`,
                },
                { status: 400 }
            );
        }

        let uploadGate: Awaited<ReturnType<typeof runHumanGate>> | null = null;
        if (type === "post" && challengeSessionId) {
            uploadGate = await runHumanGate({
                authUser,
                action: "upload_post",
                hasMedia: true,
                challengeSessionId,
                ruleVersion,
                metadata: {
                    route: "/api/upload",
                    uploadType: type,
                },
            });

            if (!uploadGate.ok) {
                const statusByCode = {
                    rules_not_accepted: 409,
                    challenge_required: 403,
                    challenge_invalid: 403,
                    challenge_misconfigured: 500,
                } as const;

                const status = uploadGate.code ? statusByCode[uploadGate.code] : 400;
                return NextResponse.json(
                    {
                        success: false,
                        code: uploadGate.code,
                        error: uploadGate.message || "Upload blocked by human verification policy.",
                        policyVersion: uploadGate.policyVersion,
                    },
                    { status }
                );
            }

            if (uploadGate.decision === "pending_review") {
                return NextResponse.json(
                    {
                        success: true,
                        pendingReview: true,
                        message: "Upload submitted for authenticity review before publication.",
                        checkId: uploadGate.authenticityCheckId,
                        riskScore: uploadGate.risk.score,
                        suggestedDecision: uploadGate.suggestedDecision,
                    },
                    { status: 202 }
                );
            }

            if (uploadGate.decision === "block") {
                return NextResponse.json(
                    {
                        success: false,
                        code: "authenticity_blocked",
                        error: "Upload blocked by authenticity policy. Please contact moderation for review.",
                        checkId: uploadGate.authenticityCheckId,
                        riskScore: uploadGate.risk.score,
                        suggestedDecision: uploadGate.suggestedDecision,
                    },
                    { status: 403 }
                );
            }
        }

        const since = new Date(Date.now() - ONE_DAY_MS);
        const usage = await prisma.mediaAsset.aggregate({
            where: {
                ownerId: authUser.id,
                createdAt: {
                    gte: since,
                },
            },
            _count: {
                _all: true,
            },
            _sum: {
                compressedSize: true,
            },
        });

        const uploadsInWindow = usage._count._all ?? 0;
        if (uploadsInWindow >= DAILY_UPLOAD_LIMIT) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Daily upload limit reached. Please try again later.",
                },
                { status: 429 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const checksum = createHash("sha256").update(buffer).digest("hex");

        const duplicate = await prisma.mediaAsset.findFirst({
            where: {
                ownerId: authUser.id,
                checksum,
                uploadType: type,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (duplicate) {
            if (uploadGate?.ok && uploadGate.authenticityCheckId) {
                await prisma.authenticityCheck.update({
                    where: {
                        id: uploadGate.authenticityCheckId,
                    },
                    data: {
                        mediaAssetId: duplicate.id,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                path: duplicate.url,
                originalSize: duplicate.originalSize,
                compressedSize: duplicate.compressedSize,
                savings: `${Math.max(0, Math.round((1 - duplicate.compressedSize / Math.max(1, duplicate.originalSize)) * 100))}%`,
                assetId: duplicate.id,
                provider: duplicate.provider,
                moderationStatus: duplicate.moderationStatus,
                reused: true,
            });
        }

        const uploadedBytesInWindow = usage._sum.compressedSize ?? 0;

        if (isAudioUpload) {
            const extension = AUDIO_MIME_EXTENSION[declaredMimeType] || extensionFromName(file.name) || "bin";
            const mimeType = declaredMimeType || "audio/mpeg";
            const compressedSize = file.size;

            if (uploadedBytesInWindow + compressedSize > DAILY_BYTE_LIMIT) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Daily upload bandwidth limit reached. Please try again later.",
                    },
                    { status: 429 }
                );
            }

            const stored = await storeMediaBuffer({
                buffer,
                extension,
                mimeType,
                uploadType: type,
                userId: authUser.id,
            });

            const asset = await prisma.mediaAsset.create({
                data: {
                    ownerId: authUser.id,
                    provider: stored.provider,
                    storageKey: stored.storageKey,
                    url: stored.publicUrl,
                    uploadType: type,
                    mimeType,
                    originalSize: file.size,
                    compressedSize,
                    checksum,
                    authenticityDecision: null,
                    provenanceStatus: "unknown",
                },
            });

            return NextResponse.json({
                success: true,
                path: stored.publicUrl,
                originalSize: file.size,
                compressedSize,
                savings: "0%",
                assetId: asset.id,
                provider: asset.provider,
                moderationStatus: asset.moderationStatus,
                outputFormat: mimeType,
                reused: false,
            });
        }

        let optimized: Awaited<ReturnType<typeof optimizeUploadImage>>;
        try {
            optimized = await optimizeUploadImage({
                inputBuffer: buffer,
                uploadType: type as "post" | "profile" | "header" | "creator_image",
            });
        } catch (error) {
            if (error instanceof InvalidUploadImageError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: error.message,
                    },
                    { status: 400 }
                );
            }

            throw error;
        }

        if (!ALLOWED_IMAGE_DETECTED_TYPES.has(optimized.inputMimeType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unsupported image format after validation.",
                },
                { status: 400 }
            );
        }

        if (!mimeTypeMatches(declaredMimeType, optimized.inputMimeType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Declared file type does not match file content.",
                },
                { status: 400 }
            );
        }

        if (optimized.outputBytes > optimized.hardMaxBytes) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Image exceeds optimized hard limit. Please upload a smaller image.",
                },
                { status: 400 }
            );
        }

        const originalSize = file.size;
        const compressedSize = optimized.outputBytes;
        if (uploadedBytesInWindow + compressedSize > DAILY_BYTE_LIMIT) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Daily upload bandwidth limit reached. Please try again later.",
                },
                { status: 429 }
            );
        }

        const stored = await storeMediaBuffer({
            buffer: optimized.buffer,
            extension: optimized.extension,
            mimeType: optimized.mimeType,
            uploadType: type,
            userId: authUser.id,
        });

        const provenance = extractProvenanceSignals({
            buffer: optimized.buffer,
            filename: file.name,
        });

        const asset = await prisma.mediaAsset.create({
            data: {
                ownerId: authUser.id,
                provider: stored.provider,
                storageKey: stored.storageKey,
                url: stored.publicUrl,
                uploadType: type,
                mimeType: optimized.mimeType,
                originalSize,
                compressedSize,
                checksum,
                width: optimized.width,
                height: optimized.height,
                provenanceStatus: provenance.provenanceStatus,
                provenanceSigner: provenance.provenanceSigner,
                provenanceDataJson: provenance.data,
                syntheticRiskScore: provenance.syntheticRiskScore,
                authenticityDecision: uploadGate?.ok ? uploadGate.suggestedDecision : null,
            },
        });

        if (uploadGate?.ok && uploadGate.authenticityCheckId) {
            await prisma.authenticityCheck.update({
                where: {
                    id: uploadGate.authenticityCheckId,
                },
                data: {
                    mediaAssetId: asset.id,
                },
            });
        }

        const savings = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100));

        return NextResponse.json({
            success: true,
            path: stored.publicUrl,
            originalSize,
            compressedSize,
            savings: `${savings}%`,
            assetId: asset.id,
            provider: asset.provider,
            moderationStatus: asset.moderationStatus,
            provenanceStatus: asset.provenanceStatus,
            syntheticRiskScore: asset.syntheticRiskScore,
            outputFormat: optimized.mimeType,
            outputWidth: optimized.width,
            outputHeight: optimized.height,
            targetBytes: optimized.targetBytes,
            hardMaxBytes: optimized.hardMaxBytes,
            attempts: optimized.attempts,
            wasAnimated: optimized.wasAnimated,
            reused: false,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Upload failed. Please try again.",
            },
            { status: 500 }
        );
    }
}
