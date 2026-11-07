import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { RxDotsHorizontal } from "react-icons/rx";
import { Avatar, Menu, MenuItem } from "@mui/material";
import { VerifiedHumanBadge } from "@/components/icons";

import { TweetProps } from "@/types/TweetProps";
import { formatDateExtended } from "@/utilities/date";
import Reply from "./Reply";
import Repost from "./Repost";
import Like from "./Like";
import Share from "./Share";
import Counters from "./Counters";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { VerifiedToken } from "@/types/TokenProps";
import { createReport, deleteTweet, editTweet, prepareHumanContext } from "@/utilities/fetch";
import PreviewDialog from "../dialog/PreviewDialog";
import { shimmer } from "@/utilities/misc/shimmer";
import NewReply from "./NewReply";
import Replies from "./Replies";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import CircularLoading from "../misc/CircularLoading";
import MentionText from "../misc/MentionText";
import EditTweetDialog from "../dialog/EditTweetDialog";

export default function SingleTweet({ tweet, token }: { tweet: TweetProps; token: VerifiedToken }) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const queryClient = useQueryClient();
    const router = useRouter();
    const isOwner = token?.username === tweet.author.username;
    const canDeletePost = Boolean(token && (isOwner || token.role === "moderator" || token.role === "admin"));

    const mutation = useMutation({
        mutationFn: () => deleteTweet(tweet.id, tweet.author.username),
        onSuccess: () => {
            setIsConfirmationOpen(false);
            setIsDeleting(false);
            setSnackbar({
                message: "Post deleted.",
                severity: "success",
                open: true,
            });

            // Remove stale single-post cache immediately to avoid rendering a deleted detail view.
            queryClient.removeQueries({
                queryKey: ["tweets", tweet.author.username, tweet.id],
                exact: true,
            });
            router.replace(`/${tweet.author.username}`);
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
        },
        onError: (error: Error) => {
            setIsDeleting(false);
            setIsConfirmationOpen(false);
            setSnackbar({
                message: error.message || "Failed to delete post.",
                severity: "error",
                open: true,
            });
        },
    });

    const reportMutation = useMutation({
        mutationFn: (payload: { reason: string; details?: string }) =>
            createReport({
                targetType: "tweet",
                targetTweetId: tweet.id,
                reason: payload.reason,
                details: payload.details,
            }),
        onSuccess: () => {
            setSnackbar({
                message: "Report submitted.",
                severity: "success",
                open: true,
            });
        },
        onError: (error: Error) => {
            setSnackbar({
                message: error.message || "Could not submit report.",
                severity: "error",
                open: true,
            });
        },
    });

    const editMutation = useMutation({
        mutationFn: async (payload: { text: string; photoUrl?: string | null; challengeToken?: string }) => {
            const { challengeToken, ...editPayload } = payload;
            const humanContext = await prepareHumanContext({
                action: "post_edit",
                challengeToken: challengeToken || undefined,
            });

            return editTweet(tweet.id, tweet.author.username, {
                ...editPayload,
                challengeSessionId: humanContext.challengeSessionId,
                ruleVersion: humanContext.ruleVersion,
            });
        },
        onSuccess: async (result) => {
            setIsEditOpen(false);
            await queryClient.invalidateQueries({ queryKey: ["tweets"] });
            await queryClient.invalidateQueries({ queryKey: ["tweets", tweet.author.username, tweet.id] });
            setSnackbar({
                message: result?.pendingReview ? "Post edit queued for authenticity review." : "Post updated.",
                severity: "success",
                open: true,
            });
        },
        onError: (error: Error) => {
            setSnackbar({
                message: error.message || "Failed to update post.",
                severity: "error",
                open: true,
            });
        },
    });

    const handleAnchorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handleAnchorClose = () => {
        setAnchorEl(null);
    };
    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlePreviewClick();
    };
    const handlePreviewClick = () => {
        setIsPreviewOpen(true);
    };
    const handlePreviewClose = () => {
        setIsPreviewOpen(false);
    };
    const handleConfirmationClick = () => {
        handleAnchorClose();
        setIsConfirmationOpen(true);
    };
    const handleEditClick = () => {
        handleAnchorClose();
        setIsEditOpen(true);
    };
    const handleReportTweet = () => {
        if (!token) return;
        const reason = window.prompt("Reason for reporting this post (max 80 chars):", "abuse");
        if (!reason) return;
        const details = window.prompt("Optional details (max 500 chars):") || undefined;
        reportMutation.mutate({ reason: reason.trim(), details: details?.trim() });
        handleAnchorClose();
    };

    const handleDelete = async () => {
        if (!token) {
            return setSnackbar({
                message: "You must be logged in to delete posts...",
                severity: "info",
                open: true,
            });
        }
        if (!canDeletePost) {
            return setSnackbar({
                message: "You are not allowed to delete this post.",
                severity: "error",
                open: true,
            });
        }
        handleAnchorClose();
        setIsDeleting(true);
        mutation.mutate();
    };

    return (
        <div>
            <div className={`single-tweet tweet ${tweet.isReply && "reply"}`}>
                <div className="single-tweet-author-section">
                    <div>
                        <Link className="tweet-avatar" href={`/${tweet.author.username}`}>
                            <Avatar
                                className="avatar"
                                sx={{ width: 50, height: 50 }}
                                alt=""
                                src={tweet.author.photoUrl ? getFullURL(tweet.author.photoUrl) : "/assets/egg.jpg"}
                            />
                        </Link>
                    </div>
                    <div className="tweet-author-section">
                        <Link className="tweet-author-link" href={`/${tweet.author.username}`}>
                            <span className="tweet-author">
                                {tweet.author.name ? tweet.author.name : tweet.author.username}
                                {tweet.author.isVerifiedHuman && (
                                    <span className="blue-tick" data-blue="Verified Human">
                                        <VerifiedHumanBadge />
                                    </span>
                                )}
                            </span>
                            <span className="text-muted">@{tweet.author.username}</span>
                        </Link>
                        {token && (
                            <>
                                <button className="three-dots icon-hoverable" onClick={handleAnchorClick}>
                                    <RxDotsHorizontal />
                                </button>
                                <Menu anchorEl={anchorEl} onClose={handleAnchorClose} open={Boolean(anchorEl)}>
                                    {isOwner && <MenuItem onClick={handleEditClick}>Edit post</MenuItem>}
                                    {canDeletePost && (
                                        <MenuItem onClick={handleConfirmationClick} className="delete">
                                            Delete
                                        </MenuItem>
                                    )}
                                    {!isOwner && <MenuItem onClick={handleReportTweet}>Report post</MenuItem>}
                                </Menu>
                            </>
                        )}
                    </div>
                </div>
                <div className="tweet-main">
                    <div className="tweet-text">
                        {tweet.isReply && (
                            <Link href={`/${tweet.repliedTo.author.username}`} className="reply-to">
                                <span className="mention">@{tweet.repliedTo.author.username}</span>
                            </Link>
                        )}{" "}
                        <MentionText text={tweet.text} />
                    </div>
                    {tweet.photoUrl && (
                        <>
                            <div className="tweet-image">
                                <Image
                                    onClick={handleImageClick}
                                    src={getFullURL(tweet.photoUrl)}
                                    alt="post image"
                                    placeholder="blur"
                                    blurDataURL={shimmer(500, 500)}
                                    height={500}
                                    width={500}
                                />
                            </div>
                            <PreviewDialog
                                open={isPreviewOpen}
                                handlePreviewClose={handlePreviewClose}
                                url={tweet.photoUrl}
                            />
                        </>
                    )}
                    <span className="text-muted date">
                        {formatDateExtended(tweet.createdAt)}
                        {tweet.editedAt ? " · edited" : ""}
                    </span>
                    <Counters tweet={tweet} />
                    <div className="tweet-bottom">
                        <Reply tweet={tweet} />
                        <Repost tweetId={tweet.id} tweetAuthor={tweet.author.username} />
                        <Like tweetId={tweet.id} tweetAuthor={tweet.author.username} />
                        <Share
                            tweetUrl={`https://${window.location.hostname}/${tweet.author.username}/tweets/${tweet.id}`}
                        />
                    </div>
                </div>
            </div>
            {token && <NewReply token={token} tweet={tweet} />}
            {tweet.replies.length > 0 && <Replies tweetId={tweet.id} tweetAuthor={tweet.author.username} />}
            <EditTweetDialog
                open={isEditOpen}
                token={tweet.author}
                initialText={tweet.text}
                initialPhotoUrl={tweet.photoUrl}
                onClose={() => setIsEditOpen(false)}
                onSave={(payload) => editMutation.mutate(payload)}
                isSaving={editMutation.isLoading}
            />
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
            {isConfirmationOpen && (
                <div className="html-modal-wrapper">
                    <dialog open className="confirm">
                        <h1>Delete Post?</h1>
                        <p>
                            This can&apos;t be undone and it will be removed from your profile, the timeline of any accounts that
                            follow you, and from Humans Only search results.
                        </p>
                        {isDeleting ? (
                            <CircularLoading />
                        ) : (
                            <>
                                <button className="btn btn-danger" onClick={handleDelete}>
                                    Delete
                                </button>
                                <button className="btn btn-white" onClick={() => setIsConfirmationOpen(false)}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </dialog>
                </div>
            )}
        </div>
    );
}
