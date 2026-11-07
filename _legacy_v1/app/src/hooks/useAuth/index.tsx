import React from "react";
import { VerifiedToken } from "@/types/TokenProps";

const fromServer = async () => {
    const { cookies } = await import("next/headers");
    const { verifyJwtToken } = await import("@/utilities/auth");
    const cookieList = await cookies();
    const token = cookieList.get("token")?.value;
    const verifiedToken = token ? await verifyJwtToken(token) : null;
    return verifiedToken;
};

export default function useAuth() {
    const [token, setToken] = React.useState<VerifiedToken>(null);
    const [isPending, setIsPending] = React.useState<boolean>(true);

    const readSessionToken = React.useCallback(async (): Promise<VerifiedToken> => {
        try {
            const response = await fetch("/api/auth/session", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data?.token ?? null;
        } catch {
            return null;
        }
    }, []);

    const getVerifiedToken = React.useCallback(async () => {
        setIsPending(true);
        setToken(await readSessionToken());
        setIsPending(false);
    }, [readSessionToken]);

    const refreshToken = React.useCallback(async () => {
        setToken(await readSessionToken());
    }, [readSessionToken]);

    React.useEffect(() => {
        void getVerifiedToken();

        const handleLegacyAuthChanged = () => {
            void refreshToken();
        };

        window.addEventListener("legacy-auth-changed", handleLegacyAuthChanged);

        return () => {
            window.removeEventListener("legacy-auth-changed", handleLegacyAuthChanged);
        };
    }, [getVerifiedToken, refreshToken]);

    return { token, isPending, refreshToken };
}

useAuth.fromServer = fromServer;

// Custom hook for authorization which works with server (fromServer) and client side
