export type ProvenanceStatus = "verified" | "unknown" | "invalid";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const extractProvenanceSignals = ({
    buffer,
    filename,
}: {
    buffer: Buffer;
    filename?: string | null;
}) => {
    const sample = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("latin1").toLowerCase();
    const filenameNormalized = (filename || "").toLowerCase();

    const hasC2PA = sample.includes("c2pa") || sample.includes("contentauthenticity");
    const hasXmpProvenance = sample.includes("xmp") && sample.includes("provenance");

    const syntheticHints = ["midjourney", "stable diffusion", "sdxl", "dall-e", "generated with ai", "ai art"];
    const syntheticHits = syntheticHints.filter((hint) => sample.includes(hint) || filenameNormalized.includes(hint));

    let syntheticRiskScore = 0.1;
    syntheticRiskScore += syntheticHits.length * 0.18;
    if (hasC2PA) syntheticRiskScore -= 0.05;

    const provenanceStatus: ProvenanceStatus = hasC2PA || hasXmpProvenance ? "verified" : "unknown";

    return {
        provenanceStatus,
        provenanceSigner: hasC2PA ? "embedded_c2pa_manifest" : null,
        syntheticRiskScore: Number(clamp(syntheticRiskScore).toFixed(3)),
        data: {
            hasC2PA,
            hasXmpProvenance,
            syntheticHints: syntheticHits,
        },
    };
};
