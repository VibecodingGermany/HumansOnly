import { useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { TweetOptionsProps } from "@/types/TweetProps";
import { AuthContext } from "@/app/(twitter)/layout";
import { getUserTweet, updateReposts } from "@/utilities/fetch";
import RepostIcon from "../misc/RepostIcon";
import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";

export default function Repost({ tweetId, tweetAuthor }: TweetOptionsProps) {
    const [isReposted, setIsReposted] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token, isPending } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const queryKey = ["tweets", tweetAuthor, tweetId];

    const { isFetched, data } = useQuery({
        queryKey: queryKey,
        queryFn: () => getUserTweet(tweetId, tweetAuthor),
    });

    const mutation = useMutation({
        mutationFn: (variables: { isReposted: boolean }) => updateReposts(tweetId, tweetAuthor, variables.isReposted),
        onMutate: () => {
            setIsButtonDisabled(true);
            setIsReposted(!isReposted);
        },
        onSuccess: () => {
            setIsButtonDisabled(false);
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
        },
        onError: (error) => console.log(error),
    });

    const handleRepost = () => {
        if (!token) {
            return setSnackbar({
                message: "You need to login to repost.",
                severity: "info",
                open: true,
            });
        }

        if (mutation.isLoading) return;

        const tokenOwnerId = token?.id || "";
        const repostedBy = data?.tweet?.retweetedBy;
        const isRepostedBy = repostedBy?.some((user: { id: string }) => user.id === tokenOwnerId);

        if (isReposted !== isRepostedBy) setIsReposted(isRepostedBy);

        const variables = {
            isReposted,
        };

        mutation.mutate(variables);
    };

    useEffect(() => {
        if (!isPending && isFetched) {
            const tokenOwnerId = token?.id;
            const repostedBy = data?.tweet?.retweetedBy;
            const isRepostedBy = repostedBy?.some((user: { id: string }) => user.id === tokenOwnerId);
            setIsReposted(isRepostedBy);
        }
    }, [isPending, isFetched, data]);

    return (
        <>
            <motion.button
                className={`icon retweet ${isReposted ? "active" : ""}`}
                onClick={handleRepost}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: isReposted ? [1, 1.5, 1.2, 1] : 1 }}
                transition={{ duration: 0.25 }}
                disabled={isButtonDisabled}
            >
                <motion.span animate={{ scale: [1, 1.5, 1.2, 1] }} transition={{ duration: 0.25 }}>
                    <RepostIcon />
                </motion.span>
                <motion.span animate={{ scale: isReposted ? [0, 1.2, 1] : 0 }} transition={{ duration: 0.25 }} />
                {data?.tweet?.retweetedBy?.length === 0 ? null : (
                    <span className="count">{data?.tweet?.retweetedBy?.length}</span>
                )}
            </motion.button>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
