const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

export const buildAuthCookie = (token: string) => ({
    name: "token",
    value: token,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
});

export const buildClearedAuthCookie = () => ({
    ...buildAuthCookie(""),
    maxAge: 0,
});
