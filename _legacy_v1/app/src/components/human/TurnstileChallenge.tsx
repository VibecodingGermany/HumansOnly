"use client";

import { useEffect, useRef, useState } from "react";

import { HumanAction } from "@/utilities/fetch";

type TurnstileRenderOptions = {
    sitekey: string;
    action?: string;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact" | "flexible";
    callback?: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: () => void;
    "timeout-callback"?: () => void;
};

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

type TurnstileChallengeProps = {
    action: HumanAction;
    nonce?: number;
    onTokenChange: (token: string | null) => void;
};

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

const loadTurnstileScript = async () => {
    if (typeof window === "undefined") return;
    if (window.turnstile) return;
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]');
        const script = existing || document.createElement("script");

        if (!existing) {
            script.src = TURNSTILE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const startedAt = Date.now();
        const timeoutMs = 10000;

        const pollUntilReady = () => {
            if (window.turnstile) {
                resolve();
                return;
            }

            if (Date.now() - startedAt > timeoutMs) {
                reject(new Error("Turnstile script did not initialize in time."));
                return;
            }

            window.setTimeout(pollUntilReady, 60);
        };

        script.addEventListener(
            "error",
            () => {
                reject(new Error("Failed to load Turnstile script."));
            },
            { once: true }
        );

        pollUntilReady();
    }).catch((error) => {
        scriptPromise = null;
        throw error;
    });

    return scriptPromise;
};

export default function TurnstileChallenge({ action, nonce = 0, onTokenChange }: TurnstileChallengeProps) {
    const [status, setStatus] = useState<"idle" | "waiting" | "verified" | "error">("idle");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

    useEffect(() => {
        onTokenChange(null);
    }, [onTokenChange, action, nonce]);

    useEffect(() => {
        if (!siteKey || !containerRef.current) return;

        let cancelled = false;

        const removeWidget = () => {
            if (!window.turnstile || !widgetIdRef.current) return;
            try {
                window.turnstile.remove(widgetIdRef.current);
            } catch {
                // Remove can throw if widget instance is already gone; safe to ignore.
            }
            widgetIdRef.current = null;
        };

        const renderWidget = async () => {
            try {
                setStatus("idle");
                await loadTurnstileScript();
                if (cancelled || !containerRef.current || !window.turnstile) return;

                removeWidget();

                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    action,
                    theme: "dark",
                    size: "flexible",
                    callback: (token: string) => {
                        if (cancelled) return;
                        onTokenChange(token);
                        setStatus("verified");
                    },
                    "expired-callback": () => {
                        if (cancelled) return;
                        onTokenChange(null);
                        setStatus("waiting");
                        if (window.turnstile && widgetIdRef.current) {
                            window.turnstile.reset(widgetIdRef.current);
                        }
                    },
                    "timeout-callback": () => {
                        if (cancelled) return;
                        onTokenChange(null);
                        setStatus("waiting");
                    },
                    "error-callback": () => {
                        if (cancelled) return;
                        onTokenChange(null);
                        setStatus("error");
                    },
                });

                setStatus("waiting");
            } catch {
                if (cancelled) return;
                onTokenChange(null);
                setStatus("error");
            }
        };

        renderWidget();

        return () => {
            cancelled = true;
            removeWidget();
        };
    }, [action, nonce, onTokenChange, siteKey]);

    if (!siteKey) return null;

    return (
        <div className="human-challenge">
            <div ref={containerRef} className="human-challenge-widget" />
            {status === "error" && (
                <p className="text-muted">Human challenge could not be loaded. Refresh and try again.</p>
            )}
        </div>
    );
}
