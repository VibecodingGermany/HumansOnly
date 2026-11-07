"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export default function ClerkAuthBridge() {
    const { isLoaded, userId } = useAuth();
    const lastUserId = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        const notifyLegacyAuthChanged = () => {
            window.dispatchEvent(new Event("legacy-auth-changed"));
        };

        const syncLegacySession = async () => {
            try {
                if (userId) {
                    if (lastUserId.current === userId) return;
                    lastUserId.current = userId;
                    const response = await fetch("/api/auth/clerk/bridge", {
                        method: "POST",
                        credentials: "include",
                    });
                    if (response.ok) {
                        notifyLegacyAuthChanged();
                    }
                    return;
                }

                if (lastUserId.current) {
                    lastUserId.current = null;
                    await fetch("/api/auth/logout", {
                        credentials: "include",
                    });
                    notifyLegacyAuthChanged();
                }
            } catch (error) {
                console.error("Failed to sync Clerk session.", error);
            }
        };

        void syncLegacySession();
    }, [isLoaded, userId]);

    return null;
}
