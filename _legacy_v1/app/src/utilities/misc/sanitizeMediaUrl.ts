const LOCAL_UPLOAD_PATH_PATTERN = /^\/uploads\/[a-zA-Z0-9/_\-.]+$/;
const MAX_MEDIA_URL_LENGTH = 2048;

const normalizeHostFromUrl = (rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    try {
        return new URL(rawUrl).hostname.toLowerCase();
    } catch {
        return null;
    }
};

const normalizeStorageBase = (rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
    } catch {
        return null;
    }
};

const parseAdditionalHosts = (rawHosts?: string): Set<string> => {
    if (!rawHosts) return new Set();
    return new Set(
        rawHosts
            .split(",")
            .map((host) => host.trim().toLowerCase())
            .filter((host) => host.length > 0)
    );
};

const isSafeLocalUploadPath = (path: string) =>
    LOCAL_UPLOAD_PATH_PATTERN.test(path) && !path.includes("..") && !path.includes("\\");

const isConfiguredSupabasePublicPath = (url: URL) => {
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET;
    if (bucketName) {
        return url.pathname.includes(`/storage/v1/object/public/${bucketName}/`);
    }
    return url.pathname.includes("/storage/v1/object/public/");
};

export const sanitizeMediaUrl = (value: unknown): string | null => {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return null;

    if (trimmed.startsWith("/")) {
        return isSafeLocalUploadPath(trimmed) ? trimmed : null;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.search || parsed.hash) return null;
    if (parsed.pathname.includes("..") || parsed.pathname.includes("\\")) return null;

    const normalizedAbsolute = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const storageBase = normalizeStorageBase(process.env.NEXT_PUBLIC_STORAGE_URL);
    if (storageBase && (normalizedAbsolute === storageBase || normalizedAbsolute.startsWith(`${storageBase}/`))) {
        return normalizedAbsolute;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname.endsWith(".supabase.co") && isConfiguredSupabasePublicPath(parsed)) {
        return normalizedAbsolute;
    }

    const appHost = normalizeHostFromUrl(process.env.NEXT_PUBLIC_HOST_URL);
    const additionalHosts = parseAdditionalHosts(process.env.UPLOAD_ALLOWED_MEDIA_HOSTS);
    if ((appHost && hostname === appHost) || additionalHosts.has(hostname)) {
        return parsed.pathname.startsWith("/uploads/") ? normalizedAbsolute : null;
    }

    return null;
};
