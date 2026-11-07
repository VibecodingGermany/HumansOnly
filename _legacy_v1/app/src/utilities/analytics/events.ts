export const PRODUCT_EVENT_NAMES = [
    "feed_home_loaded",
    "feed_home_empty",
    "feed_home_error",
    "post_created",
    "post_liked",
    "reply_created",
    "user_followed",
    "message_created",
    "notifications_marked_read",
    "profile_updated",
    "feed_not_interested",
    "conversation_prompt_used",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const isProductEventName = (value: unknown): value is ProductEventName =>
    typeof value === "string" && PRODUCT_EVENT_NAMES.includes(value as ProductEventName);
