export type UserRole = "user" | "moderator" | "admin";

export const USER_ROLES: UserRole[] = ["user", "moderator", "admin"];

export const isUserRole = (value: unknown): value is UserRole =>
    typeof value === "string" && USER_ROLES.includes(value as UserRole);

export const normalizeUserRole = (value: unknown): UserRole => (isUserRole(value) ? value : "user");
