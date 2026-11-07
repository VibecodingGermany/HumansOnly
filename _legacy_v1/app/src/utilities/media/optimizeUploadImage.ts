import sharp from "sharp";

import type { ServerUploadType } from "@/utilities/storage/server";

type ImageUploadType = Extract<ServerUploadType, "post" | "profile" | "header" | "creator_image">;

const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_SCALE_STEPS = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44];
const WEBP_QUALITY_STEPS = [84, 76, 68, 60, 52, 44, 36, 28, 22];
const JPEG_QUALITY_STEPS = [72, 62, 52, 42, 34];
const SUPPORTED_INPUT_FORMAT_TO_MIME: Record<string, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heif: "image/heif",
    avif: "image/avif",
};

type CompressionProfile = {
    maxWidth: number;
    maxHeight: number;
    targetBytes: number;
    hardMaxBytes: number;
    minEdge: number;
};

const UPLOAD_COMPRESSION_PROFILES: Record<ImageUploadType, CompressionProfile> = {
    profile: {
        maxWidth: 400,
        maxHeight: 400,
        targetBytes: 180 * 1024,
        hardMaxBytes: 280 * 1024,
        minEdge: 120,
    },
    header: {
        maxWidth: 1500,
        maxHeight: 500,
        targetBytes: 350 * 1024,
        hardMaxBytes: 600 * 1024,
        minEdge: 180,
    },
    post: {
        maxWidth: 1920,
        maxHeight: 1080,
        targetBytes: 900 * 1024,
        hardMaxBytes: 1500 * 1024,
        minEdge: 320,
    },
    creator_image: {
        maxWidth: 2400,
        maxHeight: 2400,
        targetBytes: 1200 * 1024,
        hardMaxBytes: 2000 * 1024,
        minEdge: 320,
    },
};

type Candidate = {
    buffer: Buffer;
    mimeType: "image/webp" | "image/jpeg";
    extension: "webp" | "jpg";
    width: number;
    height: number;
    size: number;
};

export class InvalidUploadImageError extends Error {
    constructor(message = "The uploaded file is not a valid or supported image.") {
        super(message);
        this.name = "InvalidUploadImageError";
    }
}

export type OptimizedUploadImage = {
    buffer: Buffer;
    mimeType: "image/webp" | "image/jpeg";
    extension: "webp" | "jpg";
    inputMimeType: string;
    width: number;
    height: number;
    outputBytes: number;
    targetBytes: number;
    hardMaxBytes: number;
    attempts: number;
    wasAnimated: boolean;
};

const calculateBaseDimensions = (inputWidth: number, inputHeight: number, profile: CompressionProfile) => {
    const fitScale = Math.min(1, profile.maxWidth / inputWidth, profile.maxHeight / inputHeight);
    return {
        width: Math.max(1, Math.round(inputWidth * fitScale)),
        height: Math.max(1, Math.round(inputHeight * fitScale)),
    };
};

const calculateAttemptDimensions = (
    baseWidth: number,
    baseHeight: number,
    scaleStep: number,
    minEdge: number
) => {
    const scaledWidth = Math.max(minEdge, Math.round(baseWidth * scaleStep));
    const scaledHeight = Math.max(minEdge, Math.round(baseHeight * scaleStep));

    return {
        width: Math.max(1, scaledWidth),
        height: Math.max(1, scaledHeight),
    };
};

const encodeCandidate = async ({
    inputBuffer,
    width,
    height,
    quality,
    animated,
    format,
}: {
    inputBuffer: Buffer;
    width: number;
    height: number;
    quality: number;
    animated: boolean;
    format: "webp" | "jpeg";
}): Promise<Candidate> => {
    const pipeline = sharp(inputBuffer, {
        animated,
        limitInputPixels: MAX_INPUT_PIXELS,
    })
        .rotate()
        .resize(width, height, {
            fit: "inside",
            withoutEnlargement: true,
        });

    const buffer =
        format === "webp"
            ? await pipeline
                  .webp({
                      quality,
                      effort: animated ? 4 : 6,
                      smartSubsample: true,
                      alphaQuality: 70,
                  })
                  .toBuffer()
            : await pipeline
                  .jpeg({
                      quality,
                      progressive: true,
                  })
                  .toBuffer();

    return {
        buffer,
        size: buffer.length,
        width,
        height,
        mimeType: format === "webp" ? "image/webp" : "image/jpeg",
        extension: format === "webp" ? "webp" : "jpg",
    };
};

export const optimizeUploadImage = async ({
    inputBuffer,
    uploadType,
}: {
    inputBuffer: Buffer;
    uploadType: ImageUploadType;
}): Promise<OptimizedUploadImage> => {
    const profile = UPLOAD_COMPRESSION_PROFILES[uploadType];

    let metadata: sharp.Metadata;
    try {
        metadata = await sharp(inputBuffer, {
            animated: true,
            limitInputPixels: MAX_INPUT_PIXELS,
        }).metadata();
    } catch {
        throw new InvalidUploadImageError();
    }

    const inputWidth = metadata.width ?? 0;
    const inputHeight = metadata.height ?? 0;
    if (inputWidth <= 0 || inputHeight <= 0) {
        throw new InvalidUploadImageError("Unable to read image dimensions.");
    }
    const detectedFormat = (metadata.format ?? "").toLowerCase();
    const inputMimeType = SUPPORTED_INPUT_FORMAT_TO_MIME[detectedFormat];
    if (!inputMimeType) {
        throw new InvalidUploadImageError("Unsupported image format. Allowed: JPEG, PNG, GIF, WEBP, HEIF, AVIF.");
    }

    const wasAnimated = (metadata.pages ?? 1) > 1;
    const { width: baseWidth, height: baseHeight } = calculateBaseDimensions(inputWidth, inputHeight, profile);
    const effectiveMinEdge = Math.min(profile.minEdge, Math.min(baseWidth, baseHeight));

    let bestCandidate: Candidate | null = null;
    let attempts = 0;

    for (const scaleStep of WEBP_SCALE_STEPS) {
        const { width, height } = calculateAttemptDimensions(baseWidth, baseHeight, scaleStep, effectiveMinEdge);

        for (const quality of WEBP_QUALITY_STEPS) {
            const candidate = await encodeCandidate({
                inputBuffer,
                width,
                height,
                quality,
                animated: wasAnimated,
                format: "webp",
            });
            attempts += 1;

            if (!bestCandidate || candidate.size < bestCandidate.size) {
                bestCandidate = candidate;
            }

            if (candidate.size <= profile.targetBytes) {
                return {
                    ...candidate,
                    inputMimeType,
                    outputBytes: candidate.size,
                    targetBytes: profile.targetBytes,
                    hardMaxBytes: profile.hardMaxBytes,
                    attempts,
                    wasAnimated,
                };
            }
        }
    }

    if (!wasAnimated && (!bestCandidate || bestCandidate.size > profile.hardMaxBytes)) {
        for (const scaleStep of WEBP_SCALE_STEPS) {
            const { width, height } = calculateAttemptDimensions(baseWidth, baseHeight, scaleStep, effectiveMinEdge);

            for (const quality of JPEG_QUALITY_STEPS) {
                const candidate = await encodeCandidate({
                    inputBuffer,
                    width,
                    height,
                    quality,
                    animated: false,
                    format: "jpeg",
                });
                attempts += 1;

                if (!bestCandidate || candidate.size < bestCandidate.size) {
                    bestCandidate = candidate;
                }

                if (candidate.size <= profile.hardMaxBytes) {
                    return {
                        ...candidate,
                        inputMimeType,
                        outputBytes: candidate.size,
                        targetBytes: profile.targetBytes,
                        hardMaxBytes: profile.hardMaxBytes,
                        attempts,
                        wasAnimated,
                    };
                }
            }
        }
    }

    if (!bestCandidate) {
        throw new InvalidUploadImageError();
    }
    if (bestCandidate.size > profile.hardMaxBytes) {
        throw new InvalidUploadImageError(
            `Image could not be optimized under ${Math.round(profile.hardMaxBytes / 1024)}KB. Please upload a smaller image.`
        );
    }

    return {
        ...bestCandidate,
        inputMimeType,
        outputBytes: bestCandidate.size,
        targetBytes: profile.targetBytes,
        hardMaxBytes: profile.hardMaxBytes,
        attempts,
        wasAnimated,
    };
};
