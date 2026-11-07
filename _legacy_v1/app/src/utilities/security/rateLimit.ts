type RateLimitBucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const nowMs = () => Date.now();

const cleanupExpiredBuckets = (now: number) => {
    buckets.forEach((bucket, key) => {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    });
};

export const enforceRateLimit = ({
    key,
    limit,
    windowMs,
}: {
    key: string;
    limit: number;
    windowMs: number;
}) => {
    const now = nowMs();
    cleanupExpiredBuckets(now);

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return {
            allowed: true,
            remaining: limit - 1,
            retryAfterSeconds: Math.ceil(windowMs / 1000),
        };
    }

    if (existing.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    buckets.set(key, existing);
    return {
        allowed: true,
        remaining: limit - existing.count,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
};
