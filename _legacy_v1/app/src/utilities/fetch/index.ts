import { NotificationContent, NotificationTypes } from "@/types/NotificationProps";
import { UserRole } from "@/types/Role";
import { CreatorPortfolioItem, CreatorProfile } from "@/types/Creator";
import type { ProductEventName } from "@/utilities/analytics/events";

// Browser calls must stay same-origin so auth/session cookies are sent for the active domain.
const HOST_URL =
    typeof window === "undefined"
        ? process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_HOST_URL || "http://localhost:3000"
        : "";

export const getAllTweets = async (page = "1") => {
    const response = await fetch(`${HOST_URL}/api/tweets/all?page=${page}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getRelatedTweets = async () => {
    const response = await fetch(`${HOST_URL}/api/tweets/related`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getForYouFeed = async (page = "1", limit = "20") => {
    const response = await fetch(`${HOST_URL}/api/feed/for-you?page=${page}&limit=${limit}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserTweets = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${username}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserLikes = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${username}/likes`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserMedia = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${username}/media`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserReplies = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${username}/replies`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserTweet = async (tweetId: string, tweetAuthor: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export type HumanAction = "post_create" | "post_edit" | "reply_create" | "upload_post";

export const getCurrentRules = async () => {
    const response = await fetch(`${HOST_URL}/api/rules/current`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load rules.");
    return json;
};

export const acceptRules = async (payload: { version: string; checksum: string }) => {
    const response = await fetch(`${HOST_URL}/api/rules/accept`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not accept rules.");
    return json;
};

export const verifyHumanChallenge = async (payload: { action: HumanAction; token?: string; ruleVersion?: string }) => {
    const response = await fetch(`${HOST_URL}/api/human/challenge/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Human challenge failed.");
    return json;
};

export const prepareHumanContext = async ({
    action,
    challengeToken,
}: {
    action: HumanAction;
    challengeToken?: string;
}) => {
    const rules = await getCurrentRules();
    if (!rules.accepted) {
        await acceptRules({ version: rules.version, checksum: rules.checksum });
    }

    const challenge = await verifyHumanChallenge({
        action,
        token: challengeToken,
        ruleVersion: rules.version,
    });

    return {
        ruleVersion: rules.version as string,
        challengeSessionId: challenge.challengeSessionId as string,
    };
};

export const createTweet = async (tweet: {
    text: string;
    photoUrl?: string;
    challengeSessionId?: string;
    ruleVersion?: string;
}) => {
    const response = await fetch(`${HOST_URL}/api/tweets/create`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tweet),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const logIn = async (candidate: string) => {
    const response = await fetch(`${HOST_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: candidate,
    });
    return response.json();
};

export const logInAsTest = async () => {
    const testAccount = {
        username: "test",
        password: "123456789",
    };
    return await logIn(JSON.stringify(testAccount));
};

export const logout = async () => {
    await fetch(`${HOST_URL}/api/auth/logout`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
};

export const createUser = async (newUser: string) => {
    const response = await fetch(`${HOST_URL}/api/users/create`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: newUser,
    });
    return response.json();
};

export const getUser = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/users/${username}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const editUser = async (updatedUser: string, username: string) => {
    const response = await fetch(`${HOST_URL}/api/users/${username}/edit`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: updatedUser,
    });
    return response.json();
};

export const updateTweetLikes = async (tweetId: string, tweetAuthor: string, isLiked: boolean) => {
    const route = isLiked ? "unlike" : "like";
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}/${route}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateReposts = async (tweetId: string, tweetAuthor: string, isReposted: boolean) => {
    const route = isReposted ? "unretweet" : "retweet";
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}/${route}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateUserFollows = async (followedUsername: string, isFollowed: boolean) => {
    const route = isFollowed ? "unfollow" : "follow";
    const response = await fetch(`${HOST_URL}/api/users/${followedUsername}/${route}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateUserMute = async (targetUsername: string, isMuted: boolean) => {
    const route = isMuted ? "unmute" : "mute";
    const response = await fetch(`${HOST_URL}/api/users/${targetUsername}/${route}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateUserBlock = async (targetUsername: string, isBlocked: boolean) => {
    const route = isBlocked ? "unblock" : "block";
    const response = await fetch(`${HOST_URL}/api/users/${targetUsername}/${route}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserPrivacyPreferences = async () => {
    const response = await fetch(`${HOST_URL}/api/users/preferences`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateUserPrivacyPreferences = async (
    preferences: Partial<{ isPrivate: boolean; messagePrivacy: "everyone" | "followers" }>
) => {
    const response = await fetch(`${HOST_URL}/api/users/preferences`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getBlockedUsers = async () => {
    const response = await fetch(`${HOST_URL}/api/users/blocked`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getMutedUsers = async () => {
    const response = await fetch(`${HOST_URL}/api/users/muted`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const createReport = async (
    payload: {
        targetType: "user" | "tweet";
        targetUsername?: string;
        targetTweetId?: string;
        reason: string;
        details?: string;
    }
) => {
    const response = await fetch(`${HOST_URL}/api/reports`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const deleteTweet = async (tweetId: string, tweetAuthor: string) => {
    const encodedAuthor = encodeURIComponent(tweetAuthor);
    const encodedTweetId = encodeURIComponent(tweetId);
    const response = await fetch(`${HOST_URL}/api/tweets/${encodedAuthor}/${encodedTweetId}/delete`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const contentType = response.headers.get("content-type") || "";
    const json = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok || !json?.success) {
        const requestId = typeof json?.requestId === "string" ? json.requestId : null;
        const requestIdHint = requestId ? ` (requestId: ${requestId})` : "";
        throw new Error((json?.message ? `${json.message}${requestIdHint}` : null) || `Could not delete post (${response.status}).`);
    }

    return json;
};

export const editTweet = async (
    tweetId: string,
    tweetAuthor: string,
    payload: { text: string; photoUrl?: string | null; challengeSessionId?: string; ruleVersion?: string }
) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}/edit`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const createReply = async (
    reply: {
        text: string;
        photoUrl?: string;
        challengeSessionId?: string;
        ruleVersion?: string;
    },
    tweetAuthor: string,
    tweetId: string
) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}/reply`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(reply),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getReplies = async (tweetAuthor: string, tweetId: string) => {
    const response = await fetch(`${HOST_URL}/api/tweets/${tweetAuthor}/${tweetId}/reply`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const search = async (text: string) => {
    const response = await fetch(`${HOST_URL}/api/search?q=${text}`, {
        credentials: "include",
    });
    return response.json();
};

export const getRandomThreeUsers = async () => {
    const response = await fetch(`${HOST_URL}/api/users/random`, {
        credentials: "include",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const createMessage = async (message: string) => {
    const response = await fetch(`${HOST_URL}/api/messages/create`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: message,
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getUserMessages = async (username: string, page = "1", limit = "20") => {
    const response = await fetch(`${HOST_URL}/api/messages/${username}?page=${page}&limit=${limit}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const checkUserExists = async (username: string) => {
    const response = await fetch(`${HOST_URL}/api/users/exists?q=${username}`, {
        credentials: "include",
    });
    return response.json();
};

export const deleteConversation = async (participants: string[]) => {
    const response = await fetch(`${HOST_URL}/api/messages/delete`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ participants }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const markMessagesRead = async (messagedUsername: string) => {
    const response = await fetch(`${HOST_URL}/api/messages/read`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ messagedUsername }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getNotificationsPage = async (page = "1", limit = "50") => {
    const response = await fetch(`${HOST_URL}/api/notifications?page=${page}&limit=${limit}`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getNotifications = async () => getNotificationsPage();

export const createNotification = async (
    recipient: string,
    type: NotificationTypes,
    secret: string,
    notificationContent: NotificationContent = null
) => {
    const response = await fetch(`${HOST_URL}/api/notifications/create`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient, type, secret, notificationContent }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const markNotificationsRead = async () => {
    const response = await fetch(`${HOST_URL}/api/notifications/read`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getNotificationPreferences = async () => {
    const response = await fetch(`${HOST_URL}/api/notifications/preferences`, {
        credentials: "include",
        next: {
            revalidate: 0,
        },
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateNotificationPreferences = async (
    preferences: Partial<{ like: boolean; reply: boolean; follow: boolean; retweet: boolean; message: boolean }>
) => {
    const response = await fetch(`${HOST_URL}/api/notifications/preferences`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getAdminUsers = async (query = "", limit = 30) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("limit", String(limit));

    const response = await fetch(`${HOST_URL}/api/admin/users?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateUserRole = async (username: string, role: UserRole) => {
    const response = await fetch(`${HOST_URL}/api/admin/users/${username}/role`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getModerationReports = async (status = "open", limit = 50) => {
    const response = await fetch(`${HOST_URL}/api/moderation/reports?status=${status}&limit=${limit}`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const updateReportStatus = async (reportId: string, status: "open" | "reviewing" | "resolved" | "rejected") => {
    const response = await fetch(`${HOST_URL}/api/moderation/reports/${reportId}/status`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getAuthenticityChecks = async (status = "open", limit = 50, cursor?: string) => {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`${HOST_URL}/api/moderation/authenticity?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getMyAuthenticityChecks = async (status = "all", limit = 30) => {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limit", String(limit));

    const response = await fetch(`${HOST_URL}/api/me/authenticity?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const decideAuthenticityCheck = async (
    checkId: string,
    decision: "allow" | "reject" | "strike",
    note?: string
) => {
    const response = await fetch(`${HOST_URL}/api/moderation/authenticity/${checkId}/decision`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, note }),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const submitAuthenticityAppeal = async (checkId: string, reason?: string) => {
    const response = await fetch(`${HOST_URL}/api/authenticity/appeals`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ checkId, reason }),
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getMyAuthenticityAppeals = async () => {
    const response = await fetch(`${HOST_URL}/api/authenticity/appeals`, {
        credentials: "include",
        cache: "no-store",
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getAuthenticityAppeals = async (status = "open", limit = 50, cursor?: string) => {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`${HOST_URL}/api/moderation/authenticity/appeals?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const decideAuthenticityAppeal = async (
    appealId: string,
    decision: "uphold" | "overturn_allow",
    note?: string
) => {
    const response = await fetch(`${HOST_URL}/api/moderation/authenticity/appeals/${appealId}/decision`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, note }),
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getMyTrust = async () => {
    const response = await fetch(`${HOST_URL}/api/me/trust`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Something went wrong.");
    return json;
};

export const getMyCreatorProfile = async (): Promise<{ success: boolean; profile: CreatorProfile | null }> => {
    const response = await fetch(`${HOST_URL}/api/creator/profile`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load creator profile.");
    return json;
};

export const saveCreatorProfile = async (
    payload: Partial<{
        stageName: string | null;
        bio: string | null;
        primaryDiscipline: string | null;
        genres: string[];
        supportEnabled: boolean;
        shopEnabled: boolean;
        tipMinCents: number;
        currency: string;
        payoutProvider: "none" | "manual" | "stripe";
        payoutStatus: "not_connected" | "pending" | "active" | "restricted";
        payoutAccountId: string | null;
    }>
): Promise<{ success: boolean; profile: CreatorProfile }> => {
    const response = await fetch(`${HOST_URL}/api/creator/profile`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not save creator profile.");
    return json;
};

export const getMyCreatorItems = async (): Promise<{
    success: boolean;
    profile: CreatorProfile | null;
    items: CreatorPortfolioItem[];
}> => {
    const response = await fetch(`${HOST_URL}/api/creator/items`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load creator items.");
    return json;
};

export const createCreatorItem = async (
    payload: Partial<{
        title: string;
        description: string;
        mediaType: "image" | "audio";
        mediaUrl: string;
        previewUrl: string | null;
        thumbnailUrl: string | null;
        priceCents: number | null;
        currency: string;
        licensingType: "personal" | "commercial" | "exclusive";
        isPublished: boolean;
    }>
): Promise<{ success: boolean; item: CreatorPortfolioItem }> => {
    const response = await fetch(`${HOST_URL}/api/creator/items`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not create creator item.");
    return json;
};

export const getCreatorProfile = async (
    username: string,
    limit = 12
): Promise<{
    success: boolean;
    creator: {
        user: {
            id: string;
            username: string;
            name: string | null;
            photoUrl: string | null;
            isVerifiedHuman: boolean;
        };
        profile: CreatorProfile & { items: CreatorPortfolioItem[] };
        stats: {
            supportCount: number;
            supportVolumeCents: number;
        };
    } | null;
}> => {
    const response = await fetch(`${HOST_URL}/api/creator/${username}?limit=${limit}`, {
        credentials: "include",
        cache: "no-store",
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load creator profile.");
    return json;
};

export const createCreatorTip = async (payload: {
    creatorUsername: string;
    amountCents: number;
    currency?: string;
    itemId?: string;
    message?: string;
}) => {
    const response = await fetch(`${HOST_URL}/api/creator/tips`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not create creator tip.");
    return json;
};

const PRODUCT_EVENT_SESSION_KEY = "ho:product-event-session-id";

const getProductEventSessionId = () => {
    if (typeof window === "undefined") return undefined;

    const existing = window.sessionStorage.getItem(PRODUCT_EVENT_SESSION_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    window.sessionStorage.setItem(PRODUCT_EVENT_SESSION_KEY, generated);
    return generated;
};

export const trackProductEvent = async (payload: {
    eventName: ProductEventName;
    surface?: string;
    payload?: Record<string, unknown>;
}) => {
    try {
        await fetch(`${HOST_URL}/api/analytics/events`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
                sessionId: getProductEventSessionId(),
            }),
        });
    } catch {
        // Product analytics must never block or break the user journey.
    }
};

export const submitFeedFeedback = async (payload: { tweetId: string; feedbackType: "not_interested" }) => {
    const response = await fetch(`${HOST_URL}/api/feed/feedback`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not submit feed feedback.");
    return json;
};

export const getAdminAnalyticsKpis = async (days = 7) => {
    const response = await fetch(`${HOST_URL}/api/admin/analytics/kpis?days=${days}`, {
        credentials: "include",
        cache: "no-store",
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load admin analytics KPIs.");
    return json;
};

export const getSystemHealth = async () => {
    const response = await fetch(`${HOST_URL}/api/health`, {
        credentials: "include",
        cache: "no-store",
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.message ? json.message : "Could not load system health.");
    return json;
};
