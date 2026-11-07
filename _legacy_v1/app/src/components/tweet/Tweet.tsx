import { Avatar, Popover, Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, MenuItem } from "@mui/material";
import { RxDotsHorizontal } from "react-icons/rx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VerifiedHumanBadge } from "@/components/icons";

import { TweetProps } from "@/types/TweetProps";
import { formatDate, formatDateExtended } from "@/utilities/date";
import { shimmer } from "@/utilities/misc/shimmer";
import Reply from "./Reply";
import Repost from "./Repost";
import Like from "./Like";
import Share from "./Share";
import PreviewDialog from "../dialog/PreviewDialog";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { AuthContext } from "@/app/(twitter)/layout";
import RepostIcon from "../misc/RepostIcon";
import ProfileCard from "../user/ProfileCard";
import MentionText from "../misc/MentionText";
import { createReport, deleteTweet, editTweet, prepareHumanContext, submitFeedFeedback } from "@/utilities/fetch";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import EditTweetDialog from "../dialog/EditTweetDialog";

export default function Tweet({ tweet }: { tweet: TweetProps }) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });
    const [hoveredProfile, setHoveredProfile] = useState("");

    const { token } = useContext(AuthContext);
    const router = useRouter();
    const queryClient = useQueryClient();

    let displayedTweet = tweet;

    if (tweet.isRetweet) {
        displayedTweet = tweet.retweetOf;
    }

    const isOwner = token?.username === displayedTweet.author.username;
    const isModerator = token?.role === "moderator" || token?.role === "admin";
    const canEditPost = Boolean(isOwner && !tweet.isRetweet);
    const canDeletePost = Boolean((isOwner || isModerator) && !tweet.isRetweet);

    const deleteMutation = useMutation({
        mutationFn: () => deleteTweet(displayedTweet.id, displayedTweet.author.username),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["tweets"] });
            setSnackbar({ message: "Post deleted.", severity: "success", open: true });
        },
        onError: (error: Error) => {
            setSnackbar({ message: error.message || "Failed to delete post.", severity: "error", open: true });
        },
    });

    const editMutation = useMutation({
        mutationFn: async (payload: { text: string; photoUrl?: string | null; challengeToken?: string }) => {
            const { challengeToken, ...editPayload } = payload;
            const humanContext = await prepareHumanContext({
                action: "post_edit",
                challengeToken: challengeToken || undefined,
            });
            return editTweet(displayedTweet.id, displayedTweet.author.username, {
                ...editPayload,
                challengeSessionId: humanContext.challengeSessionId,
                ruleVersion: humanContext.ruleVersion,
            });
        },
        onSuccess: async (result) => {
            setIsEditOpen(false);
            await queryClient.invalidateQueries({ queryKey: ["tweets"] });
            await queryClient.invalidateQueries({ queryKey: ["tweets", displayedTweet.author.username, displayedTweet.id] });
            setSnackbar({
                message: result?.pendingReview ? "Post edit queued for authenticity review." : "Post updated.",
                severity: "success",
                open: true,
            });
        },
        onError: (error: Error) => {
            setSnackbar({ message: error.message || "Failed to update post.", severity: "error", open: true });
        },
    });

    const reportMutation = useMutation({
        mutationFn: (payload: { reason: string; details?: string }) =>
            createReport({
                targetType: "tweet",
                targetTweetId: displayedTweet.id,
                reason: payload.reason,
                details: payload.details,
            }),
        onSuccess: () => {
            setSnackbar({ message: "Report submitted.", severity: "success", open: true });
        },
        onError: (error: Error) => {
            setSnackbar({ message: error.message || "Could not submit report.", severity: "error", open: true });
        },
    });

    const feedbackMutation = useMutation({
        mutationFn: () => submitFeedFeedback({ tweetId: displayedTweet.id, feedbackType: "not_interested" }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["tweets", "home"] });
            setSnackbar({ message: "We'll show less like this in For You.", severity: "success", open: true });
        },
        onError: (error: Error) => {
            setSnackbar({ message: error.message || "Could not save feed feedback.", severity: "error", open: true });
        },
    });

    const handleTweetClick = () => {
        router.push(`/${displayedTweet.author.username}/tweets/${displayedTweet.id}`);
    };
    const handlePropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
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
    const handlePopoverOpen = (e: React.MouseEvent<HTMLElement>, type: "default" | "mention" | "retweet" = "default") => {
        if (type === "mention") {
            setHoveredProfile(displayedTweet.repliedTo.author.username);
        }
        if (type === "retweet") {
            setHoveredProfile(tweet.author.username);
        }
        if (type === "default") {
            setHoveredProfile(displayedTweet.author.username);
        }
        setAnchorEl(e.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };
    const handleEditPost = () => {
        handleMenuClose();
        setIsEditOpen(true);
    };
    const handleDeletePost = () => {
        handleMenuClose();
        if (!window.confirm("Delete this post permanently?")) return;
        deleteMutation.mutate();
    };
    const handleReportPost = () => {
        handleMenuClose();
        const reason = window.prompt("Reason for reporting this post (max 80 chars):", "abuse");
        if (!reason) return;
        const details = window.prompt("Optional details (max 500 chars):") || undefined;
        reportMutation.mutate({ reason: reason.trim(), details: details?.trim() });
    };
    const handleNotInterested = () => {
        handleMenuClose();
        feedbackMutation.mutate();
    };

    return (
        <motion.div
            onClick={handleTweetClick}
            className={`tweet div-link ${tweet.isRetweet && "retweet"} ${displayedTweet.isReply && "reply"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Link
                onClick={handlePropagation}
                className="tweet-avatar"
                href={`/${displayedTweet.author.username}`}
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
            >
                <Avatar
                    className="avatar"
                    sx={{ width: 50, height: 50 }}
                    alt=""
                    src={displayedTweet.author.photoUrl ? getFullURL(displayedTweet.author.photoUrl) : "/assets/egg.jpg"}
                />
            </Link>
            <div className="tweet-main">
                <section className="tweet-author-section">
                    <Link
                        onClick={handlePropagation}
                        className="tweet-author-link"
                        href={`/${displayedTweet.author.username}`}
                        onMouseEnter={handlePopoverOpen}
                        onMouseLeave={handlePopoverClose}
                    >
                        <span className="tweet-author">
                            {displayedTweet.author.name ? displayedTweet.author.name : displayedTweet.author.username}
                            {displayedTweet.author.isVerifiedHuman && (
                                <span className="blue-tick" data-blue="Verified Human">
                                    <VerifiedHumanBadge />
                                </span>
                            )}
                        </span>
                        <span className="text-muted">@{displayedTweet.author.username}</span>
                    </Link>
                    <Tooltip title={formatDateExtended(displayedTweet.createdAt)} placement="top">
                        <span className="text-muted date">
                            <span className="middle-dot">·</span>
                            {formatDate(displayedTweet.createdAt)}
                            {displayedTweet.editedAt ? " · edited" : ""}
                        </span>
                    </Tooltip>
                    {token && !tweet.isRetweet && (
                        <>
                            <button className="three-dots icon-hoverable" onClick={handleMenuOpen}>
                                <RxDotsHorizontal />
                            </button>
                            <Menu anchorEl={menuAnchorEl} onClose={handleMenuClose} open={Boolean(menuAnchorEl)}>
                                {canEditPost && <MenuItem onClick={handleEditPost}>Edit post</MenuItem>}
                                {canDeletePost && (
                                    <MenuItem className="delete" onClick={handleDeletePost}>
                                        Delete
                                    </MenuItem>
                                )}
                                {!isOwner && <MenuItem onClick={handleReportPost}>Report post</MenuItem>}
                                {!isOwner && <MenuItem onClick={handleNotInterested}>Not interested</MenuItem>}
                            </Menu>
                        </>
                    )}
                </section>
                <div className="tweet-text">
                    {displayedTweet.isReply && (
                        <Link
                            onClick={handlePropagation}
                            href={`/${displayedTweet.repliedTo.author.username}`}
                            className="reply-to"
                        >
                            <span
                                className="mention"
                                onMouseEnter={(e) => handlePopoverOpen(e, "mention")}
                                onMouseLeave={handlePopoverClose}
                            >
                                @{displayedTweet.repliedTo.author.username}
                            </span>
                        </Link>
                    )}{" "}
                    <MentionText text={displayedTweet.text} />
                </div>
                {displayedTweet.photoUrl && (
                    <div onClick={handlePropagation}>
                        <div className="tweet-image">
                            <Image
                                onClick={handleImageClick}
                                src={getFullURL(displayedTweet.photoUrl)}
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
                            url={displayedTweet.photoUrl}
                        />
                    </div>
                )}
                <div onClick={handlePropagation} className="tweet-bottom">
                    <Reply tweet={displayedTweet} />
                    <Repost tweetId={displayedTweet.id} tweetAuthor={displayedTweet.author.username} />
                    <Like tweetId={displayedTweet.id} tweetAuthor={displayedTweet.author.username} />
                    <Share
                        tweetUrl={`https://${window.location.hostname}/${displayedTweet.author.username}/tweets/${displayedTweet.id}`}
                    />
                </div>
            </div>
            {tweet.isRetweet &&
                (token?.username === tweet.author.username ? (
                    <Link onClick={handlePropagation} href={`/${token?.username}`} className="retweeted-by">
                        <RepostIcon /> You reposted.
                    </Link>
                ) : (
                    <Link
                        onClick={handlePropagation}
                        href={`/${tweet.author.username}`}
                        className="retweeted-by"
                        onMouseEnter={(e) => handlePopoverOpen(e, "retweet")}
                        onMouseLeave={handlePopoverClose}
                    >
                        <RepostIcon /> {`${tweet.author.name ? tweet.author.name : tweet.author.username} reposted.`}
                    </Link>
                ))}
            <Popover
                sx={{
                    pointerEvents: "none",
                }}
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <ProfileCard username={hoveredProfile} token={token} />
            </Popover>
            <EditTweetDialog
                open={isEditOpen}
                token={displayedTweet.author}
                initialText={displayedTweet.text}
                initialPhotoUrl={displayedTweet.photoUrl}
                onClose={() => setIsEditOpen(false)}
                onSave={(payload) => editMutation.mutate(payload)}
                isSaving={editMutation.isLoading}
            />
            {snackbar.open && <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />}
        </motion.div>
    );
}
