"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getForYouFeed, getRelatedTweets, trackProductEvent } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import NewTweet from "@/components/tweet/NewTweet";
import ConversationPrompts from "@/components/misc/ConversationPrompts";
import { AuthContext } from "../layout";

export default function HomePage() {
    const { token, isPending } = useContext(AuthContext);
    const lastTrackedEventRef = useRef<string | null>(null);
    const [feedMode, setFeedMode] = useState<"following" | "for_you">("following");

    const { isLoading, isError, data } = useQuery({
        queryKey: ["tweets", "home", feedMode],
        queryFn: () => (feedMode === "for_you" ? getForYouFeed("1", "20") : getRelatedTweets()),
        enabled: !!token,
    });

    useEffect(() => {
        if (!token || !isError) return;
        if (lastTrackedEventRef.current === "feed_home_error") return;

        lastTrackedEventRef.current = "feed_home_error";
        void trackProductEvent({
            eventName: "feed_home_error",
            surface: "home_feed",
            payload: {
                username: token.username,
                feedMode,
            },
        });
    }, [token, isError, feedMode]);

    useEffect(() => {
        if (!token || isLoading || isError || !data) return;

        const eventName = data.tweets.length === 0 ? "feed_home_empty" : "feed_home_loaded";
        if (lastTrackedEventRef.current === eventName) return;

        lastTrackedEventRef.current = eventName;
        void trackProductEvent({
            eventName,
            surface: "home_feed",
            payload: {
                username: token.username,
                tweetCount: data.tweets.length,
                feedMode,
            },
        });
    }, [token, isLoading, isError, data, feedMode]);

    if (isPending) return <CircularLoading />;
    if (!token) {
        return (
            <main>
                <h1 className="page-name">Home</h1>
                <p className="text-muted">Sign in to see posts from people you follow.</p>
            </main>
        );
    }
    if (isLoading) return <CircularLoading />;
    if (isError || !data) {
        return (
            <main>
                <h1 className="page-name">Home</h1>
                <p className="text-muted">Could not load your home feed right now.</p>
            </main>
        );
    }

    return (
        <main>
            <h1 className="page-name">Home</h1>
            <div className="feed-mode-toggle">
                <button
                    className={`btn ${feedMode === "following" ? "" : "btn-white"}`}
                    onClick={() => setFeedMode("following")}
                >
                    Following
                </button>
                <button
                    className={`btn ${feedMode === "for_you" ? "" : "btn-white"}`}
                    onClick={() => setFeedMode("for_you")}
                >
                    For You
                </button>
            </div>
            <ConversationPrompts username={token.username} />
            {token && <NewTweet token={token} />}
            {data && data.tweets.length === 0 && <NothingToShow />}
            <Tweets tweets={data.tweets} />
        </main>
    );
}
