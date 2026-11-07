import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/prisma/client";
import { verifyJwtToken } from "@/utilities/auth";
import { hashPassword } from "@/utilities/bcrypt";
import { UserRole } from "@/types/Role";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";

type ClerkClaims = {
    username?: unknown;
    preferred_username?: unknown;
    email?: unknown;
    email_address?: unknown;
    email_addresses?: unknown;
    given_name?: unknown;
    family_name?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    full_name?: unknown;
    name?: unknown;
};

const authenticatedUserSelect = {
    id: true,
    clerkId: true,
    username: true,
    name: true,
    description: true,
    location: true,
    website: true,
    isVerifiedHuman: true,
    role: true,
    createdAt: true,
    photoUrl: true,
    headerUrl: true,
} satisfies Prisma.UserSelect;

type AuthenticatedUserRecord = Prisma.UserGetPayload<{ select: typeof authenticatedUserSelect }>;

export type AuthenticatedUser = Omit<AuthenticatedUserRecord, "role"> & {
    role: UserRole;
    isSuperAdmin: boolean;
    authSource: "clerk" | "legacy";
};

export const isAdmin = (user: Pick<AuthenticatedUser, "role"> | null | undefined) => user?.role === "admin";

export const isModerator = (user: Pick<AuthenticatedUser, "role"> | null | undefined) =>
    user?.role === "moderator" || user?.role === "admin";

const sanitizeUsername = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20);

const resolveUniqueUsername = async (candidate: string, options?: { ignoreUserId?: string }) => {
    const base = sanitizeUsername(candidate) || "human_user";

    for (let i = 0; i < 100; i += 1) {
        const suffix = i === 0 ? "" : `_${i}`;
        const maxBaseLength = 20 - suffix.length;
        const username = `${base.slice(0, maxBaseLength)}${suffix}`;
        const exists = await prisma.user.findUnique({ where: { username } });

        if (!exists || exists.id === options?.ignoreUserId) return username;
    }

    return `human_${Date.now().toString().slice(-8)}`.slice(0, 20);
};

const readClaimString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
};

const getFirstNameFromClaims = (claims: ClerkClaims) =>
    readClaimString(claims.given_name) || readClaimString(claims.first_name);

const getLastNameFromClaims = (claims: ClerkClaims) =>
    readClaimString(claims.family_name) || readClaimString(claims.last_name);

const getEmailFromClaims = (claims: ClerkClaims) => {
    const directEmail = readClaimString(claims.email) || readClaimString(claims.email_address);
    if (directEmail) return directEmail;

    if (!Array.isArray(claims.email_addresses)) return null;

    for (const entry of claims.email_addresses) {
        if (typeof entry === "string" && entry.includes("@")) return entry;
        if (entry && typeof entry === "object" && "email_address" in entry) {
            const nestedEmail = readClaimString((entry as { email_address?: unknown }).email_address);
            if (nestedEmail) return nestedEmail;
        }
    }

    return null;
};

const getUsernameCandidates = (userId: string, claims: ClerkClaims) => {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const firstName = getFirstNameFromClaims(claims);
    const lastName = getLastNameFromClaims(claims);
    const fullName = readClaimString(claims.full_name) || readClaimString(claims.name);
    const email = getEmailFromClaims(claims);

    const addCandidate = (value: string | null) => {
        if (!value) return;
        const sanitized = sanitizeUsername(value);
        if (sanitized.length < 3 || seen.has(sanitized)) return;
        seen.add(sanitized);
        candidates.push(sanitized);
    };

    addCandidate(readClaimString(claims.username));
    addCandidate(readClaimString(claims.preferred_username));
    addCandidate(email?.split("@")[0] || null);

    if (firstName && lastName) {
        addCandidate(`${firstName}_${lastName}`);
        addCandidate(`${firstName}${lastName}`);
    }

    addCandidate(firstName);
    addCandidate(lastName);

    if (fullName) {
        const compact = fullName
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");
        addCandidate(compact);
    }

    addCandidate(`human_${userId.slice(-8)}`);

    return candidates;
};

const buildDisplayName = (claims: ClerkClaims) => {
    const firstName = getFirstNameFromClaims(claims);
    const lastName = getLastNameFromClaims(claims);

    if (firstName && lastName) {
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.slice(0, 50) || null;
    }

    if (firstName) {
        return firstName.slice(0, 50) || null;
    }

    const fullName = readClaimString(claims.full_name) || readClaimString(claims.name);
    if (fullName) return fullName.slice(0, 50) || null;

    return null;
};

const autoGeneratedUsernamePattern = /^human_[a-z0-9]{8}$/;
const autoGeneratedFallbackPattern = /^human_user(?:_[0-9]+)?$/;

const isAutoGeneratedUsername = (username: string) =>
    autoGeneratedUsernamePattern.test(username) || autoGeneratedFallbackPattern.test(username);

const getBestAvailableUsername = async (userId: string, claims: ClerkClaims, ignoreUserId?: string) => {
    const candidates = getUsernameCandidates(userId, claims);

    for (const candidate of candidates) {
        const username = await resolveUniqueUsername(candidate, { ignoreUserId });
        if (username) return username;
    }

    return resolveUniqueUsername(`human_${userId.slice(-8)}`, { ignoreUserId });
};

export const getOrCreateUserByClerkId = async (userId: string, claims: ClerkClaims = {}) => {
    const existing = await prisma.user.findUnique({
        where: {
            clerkId: userId,
        },
        select: authenticatedUserSelect,
    });

    const displayName = buildDisplayName(claims);

    if (existing) {
        const nextUsername = isAutoGeneratedUsername(existing.username)
            ? await getBestAvailableUsername(userId, claims, existing.id)
            : existing.username;
        const nextName = existing.name || displayName;

        if (nextUsername !== existing.username || nextName !== existing.name) {
            return prisma.user.update({
                where: { id: existing.id },
                data: {
                    ...(nextUsername !== existing.username ? { username: nextUsername } : {}),
                    ...(nextName !== existing.name ? { name: nextName } : {}),
                },
                select: authenticatedUserSelect,
            });
        }

        return existing;
    }

    const username = await getBestAvailableUsername(userId, claims);
    const generatedPassword = await hashPassword(`${userId}-${Date.now()}-${Math.random()}`);

    return prisma.user.create({
        data: {
            clerkId: userId,
            username,
            password: generatedPassword,
            name: displayName,
        },
        select: authenticatedUserSelect,
    });
};

const getLegacyCookieUser = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const verifiedToken = await verifyJwtToken(token);
    const tokenUserId = typeof verifiedToken?.id === "string" ? verifiedToken.id : null;

    if (!tokenUserId) return null;

    return prisma.user.findUnique({
        where: {
            id: tokenUserId,
        },
        select: authenticatedUserSelect,
    });
};

export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
    const withEffectiveRole = (user: AuthenticatedUserRecord, authSource: "clerk" | "legacy"): AuthenticatedUser => {
        const isSuperAdmin = isSuperAdminIdentity({
            username: user.username,
            clerkId: user.clerkId,
        });

        return {
            ...user,
            role: resolveEffectiveRole(user.role, isSuperAdmin),
            isSuperAdmin,
            authSource,
        };
    };

    try {
        const { userId, sessionClaims } = await auth();

        if (userId) {
            const user = await getOrCreateUserByClerkId(userId, (sessionClaims || {}) as ClerkClaims);
            return withEffectiveRole(user, "clerk");
        }
    } catch {
        // Gracefully continue with legacy cookie fallback.
    }

    const legacyUser = await getLegacyCookieUser();
    if (!legacyUser) return null;

    return withEffectiveRole(legacyUser, "legacy");
};

export const unauthorizedResponse = (message = "You are not authorized to perform this action.") =>
    NextResponse.json({ success: false, message }, { status: 401 });
