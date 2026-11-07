"use client";

import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthContext } from "@/app/(twitter)/layout";
import CircularLoading from "@/components/misc/CircularLoading";
import CustomSnackbar from "@/components/misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import { acceptRules, getCurrentRules } from "@/utilities/fetch";

type RuleSection = {
    id: string;
    title: string;
    bullets: string[];
};

export default function RulesPage() {
    const { token, isPending } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { data, isLoading } = useQuery({
        queryKey: ["rules", "current"],
        queryFn: getCurrentRules,
    });

    const acceptMutation = useMutation({
        mutationFn: () => acceptRules({ version: data.version, checksum: data.checksum }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["rules", "current"] });
            setSnackbar({
                message: "Rules accepted. You can publish human-only content now.",
                severity: "success",
                open: true,
            });
        },
        onError: (error: Error) => {
            setSnackbar({
                message: error.message || "Could not accept rules.",
                severity: "error",
                open: true,
            });
        },
    });

    const sections = useMemo<RuleSection[]>(() => {
        if (!data?.sections || !Array.isArray(data.sections)) return [];
        return data.sections as RuleSection[];
    }, [data?.sections]);

    if (isPending || isLoading) return <CircularLoading />;

    return (
        <main className="rules-page legal-doc-page">
            <h1>Rules</h1>
            <p>
                Version {data?.version || "-"} · Effective {data?.effectiveAt ? new Date(data.effectiveAt).toLocaleDateString() : "-"}
            </p>

            {sections.map((section) => (
                <section key={section.id}>
                    <h2>{section.title}</h2>
                    <ul>
                        {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                        ))}
                    </ul>
                </section>
            ))}

            <section>
                <h2>Publishing Gate</h2>
                {token ? (
                    <>
                        <p>
                            Public posting requires acceptance of the current rules and a valid human challenge before submission.
                        </p>
                        <button
                            className="btn btn-dark"
                            type="button"
                            disabled={Boolean(data?.accepted) || acceptMutation.isLoading}
                            onClick={() => acceptMutation.mutate()}
                        >
                            {data?.accepted ? "Rules Accepted" : acceptMutation.isLoading ? "Saving..." : "Accept Current Rules"}
                        </button>
                    </>
                ) : (
                    <p className="text-muted">Sign in to accept rules and publish content.</p>
                )}
            </section>

            {snackbar.open && <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />}
        </main>
    );
}
