"use client";

import Image from "next/image";
import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthContext } from "@/app/(twitter)/layout";
import CircularLoading from "@/components/misc/CircularLoading";
import CustomSnackbar from "@/components/misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import { createCreatorTip, getCreatorProfile } from "@/utilities/fetch";
import { getFullURL } from "@/utilities/misc/getFullURL";

export default function CreatorShowcase({ username }: { username: string }) {
    const { token } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const [snackbar, setSnackbar] = useState<SnackbarProps>({
        message: "",
        severity: "success",
        open: false,
    });

    const { data, isLoading } = useQuery({
        queryKey: ["creator", "public", username],
        queryFn: () => getCreatorProfile(username),
    });

    const creator = data?.creator;
    const isOwner = token?.username === username;

    const tipMutation = useMutation({
        mutationFn: ({ amountCents, itemId }: { amountCents: number; itemId?: string }) =>
            createCreatorTip({
                creatorUsername: username,
                amountCents,
                itemId,
                currency: creator?.profile?.currency || "EUR",
            }),
        onSuccess: async (result) => {
            await queryClient.invalidateQueries({ queryKey: ["creator", "public", username] });
            setSnackbar({
                message:
                    result?.mode === "recorded_support"
                        ? "Support wurde erfasst. Stripe Connect kann jetzt als nächster Schritt aktiviert werden."
                        : "Support erfolgreich gestartet.",
                severity: "success",
                open: true,
            });
            if (result?.checkoutUrl) {
                window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
            }
        },
        onError: (error: Error) => {
            setSnackbar({
                message: error.message || "Support konnte nicht gestartet werden.",
                severity: "error",
                open: true,
            });
        },
    });

    const tipSuggestions = useMemo(() => {
        const min = creator?.profile?.tipMinCents || 200;
        const base = [min, Math.max(min, 500), Math.max(min, 1000)];
        return Array.from(new Set(base));
    }, [creator?.profile?.tipMinCents]);

    if (isLoading) return <CircularLoading />;
    if (!creator) return null;

    const stageName = creator.profile.stageName || creator.user.name || `@${creator.user.username}`;
    const genres = Array.isArray(creator.profile.genres) ? creator.profile.genres.filter((genre) => typeof genre === "string") : [];
    const items = Array.isArray(creator.profile.items) ? creator.profile.items : [];

    return (
        <section className="creator-showcase">
            <div className="creator-showcase-header">
                <h2>Artist Showcase</h2>
                <p className="text-muted">
                    {stageName} · {creator.profile.primaryDiscipline || "creator"}
                </p>
                {creator.profile.bio ? <p>{creator.profile.bio}</p> : null}
                {genres.length > 0 ? (
                    <div className="creator-tags">
                        {genres.map((genre) => (
                            <span className="creator-tag" key={`${username}-${genre}`}>
                                {genre}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>

            {creator.profile.supportEnabled && !isOwner ? (
                <div className="creator-support-row">
                    {tipSuggestions.map((amount) => (
                        <button
                            key={`${username}-tip-${amount}`}
                            type="button"
                            className="btn btn-white"
                            disabled={tipMutation.isLoading}
                            onClick={() => tipMutation.mutate({ amountCents: amount })}
                        >
                            Support {amount / 100} {creator.profile.currency}
                        </button>
                    ))}
                </div>
            ) : null}

            {items.length === 0 ? (
                <p className="text-muted">Noch keine veröffentlichten Werke.</p>
            ) : (
                <div className="creator-item-grid">
                    {items.map((item) => (
                        <article className="creator-item-card" key={item.id}>
                            <div className="creator-item-media">
                                {item.mediaType === "image" ? (
                                    <Image
                                        src={getFullURL(item.mediaUrl)}
                                        alt={item.title}
                                        width={640}
                                        height={640}
                                        style={{ width: "100%", height: "auto" }}
                                    />
                                ) : (
                                    <audio controls preload="none" src={getFullURL(item.mediaUrl)} />
                                )}
                            </div>
                            <div className="creator-item-body">
                                <strong>{item.title}</strong>
                                {item.description ? <p className="text-muted">{item.description}</p> : null}
                                <div className="creator-item-meta">
                                    <span className="text-muted">{item.licensingType}</span>
                                    {typeof item.priceCents === "number" ? (
                                        <span>
                                            {item.priceCents / 100} {item.currency}
                                        </span>
                                    ) : (
                                        <span className="text-muted">Freely shareable</span>
                                    )}
                                </div>
                                {creator.profile.supportEnabled && !isOwner ? (
                                    <button
                                        type="button"
                                        className="btn btn-white"
                                        disabled={tipMutation.isLoading}
                                        onClick={() => tipMutation.mutate({ amountCents: creator.profile.tipMinCents, itemId: item.id })}
                                    >
                                        Support this work
                                    </button>
                                ) : null}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {snackbar.open ? (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            ) : null}
        </section>
    );
}
