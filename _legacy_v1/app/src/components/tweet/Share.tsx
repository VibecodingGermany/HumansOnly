import { useState } from "react";
import { FiShare } from "react-icons/fi";

import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";

export default function Share({ tweetUrl }: { tweetUrl: string }) {
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const handleCopy = async () => {
        try {
            if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share({
                    title: "Humans Only",
                    text: "Check out this post on Humans Only.",
                    url: tweetUrl,
                });
                setSnackbar({ message: "Post link shared successfully.", severity: "success", open: true });
                return;
            }

            await navigator.clipboard.writeText(tweetUrl);
            setSnackbar({ message: "Post link copied to clipboard.", severity: "success", open: true });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return;
            }
            setSnackbar({ message: "Sharing failed. Please try again.", severity: "error", open: true });
        }
    };

    return (
        <>
            <button className="icon share" onClick={handleCopy}>
                <FiShare />
            </button>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
