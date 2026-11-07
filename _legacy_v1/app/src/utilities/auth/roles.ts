import { normalizeUserRole, UserRole } from "@/types/Role";

type SuperAdminIdentity = {
    username?: string | null;
    clerkId?: string | null;
};

const parseCsvSet = (value: string | undefined, normalize = (entry: string) => entry) =>
    new Set(
        (value || "")
            .split(",")
            .map((entry) => normalize(entry.trim()))
            .filter(Boolean)
    );

const DEFAULT_SUPER_ADMIN_USERNAMES = new Set(["human_ikzcsvsb"]);

const getSuperAdminUsernames = () => {
    const configured = parseCsvSet(process.env.SUPER_ADMIN_USERNAMES, (entry) => entry.toLowerCase());
    return new Set(Array.from(DEFAULT_SUPER_ADMIN_USERNAMES).concat(Array.from(configured)));
};
const getSuperAdminClerkIds = () => parseCsvSet(process.env.SUPER_ADMIN_CLERK_IDS);

export const isSuperAdminIdentity = ({ username, clerkId }: SuperAdminIdentity) => {
    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    const normalizedClerkId = typeof clerkId === "string" ? clerkId.trim() : "";

    const allowlistedUsernames = getSuperAdminUsernames();
    const allowlistedClerkIds = getSuperAdminClerkIds();

    return (
        (normalizedUsername.length > 0 && allowlistedUsernames.has(normalizedUsername)) ||
        (normalizedClerkId.length > 0 && allowlistedClerkIds.has(normalizedClerkId))
    );
};

export const resolveEffectiveRole = (storedRole: unknown, isSuperAdmin: boolean): UserRole =>
    isSuperAdmin ? "admin" : normalizeUserRole(storedRole);
