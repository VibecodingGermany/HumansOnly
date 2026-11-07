import { sanitizeMediaUrl } from "./sanitizeMediaUrl";

export const getFullURL = (url: string | null | undefined): string => {
    if (!url) return '';

    const sanitized = sanitizeMediaUrl(url);
    if (sanitized) {
        return sanitized;
    }

    // Local uploads already have full path
    if (url.startsWith('/uploads/')) {
        return url;
    }

    // Unknown absolute URLs are intentionally rejected by sanitizeMediaUrl.
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return '';
    }

    // Legacy Supabase paths - fallback
    const storageURL = process.env.NEXT_PUBLIC_STORAGE_URL;
    if (storageURL) {
        return `${storageURL}${url}`;
    }

    // Default: assume local path
    return `/uploads/${url}`;
};
