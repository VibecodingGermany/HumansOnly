import { UserProps } from "./UserProps";

export type MessageProps = {
    id: string;
    sender: UserProps;
    recipient: UserProps;
    text: string;
    createdAt: Date;
    photoUrl: string;
    isRead?: boolean;
};

export type ConversationResponse = {
    participants: string[];
    messages: MessageProps[];
    unreadCount?: number;
};

export type ConversationProps = {
    conversation: ConversationResponse;
    token: UserProps;
    handleConversations: (isSelected: boolean, messages?: MessageProps[], messagedUsername?: string) => void;
};

export type MessagesProps = {
    selectedMessages: MessageProps[];
    messagedUsername: string;
    handleConversations: (isSelected: boolean, messages?: MessageProps[], messagedUsername?: string) => void;
    token: UserProps;
};

export type MessageFormProps = {
    token: UserProps;
    messagedUsername: string;
    setFreshMessages: any;
    freshMessages: MessageProps[];
};
