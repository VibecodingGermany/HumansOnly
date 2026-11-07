import { useEffect, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";

import Message from "./Message";
import NewMessageBox from "./NewMessageBox";
import { MessageProps, MessagesProps } from "@/types/MessageProps";
import { markMessagesRead } from "@/utilities/fetch";

export default function Messages({ selectedMessages, messagedUsername, handleConversations, token }: MessagesProps) {
    const [freshMessages, setFreshMessages] = useState([] as MessageProps[]);

    const messagesWrapperRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        setFreshMessages(selectedMessages);
    }, [selectedMessages]);

    useEffect(() => {
        const messagesWrapper = messagesWrapperRef.current;
        messagesWrapper?.scrollTo({
            top: messagesWrapper.scrollHeight,
            behavior: "smooth",
        });
    }, [freshMessages]);

    useEffect(() => {
        if (!messagedUsername || messagedUsername === token.username) return;
        const run = async () => {
            try {
                await markMessagesRead(messagedUsername);
                queryClient.invalidateQueries({ queryKey: ["messages", token.username] });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
            } catch {
                // no-op: unread marking failure should not block chat UI
            }
        };
        void run();
    }, [messagedUsername, queryClient, token.username]);

    return (
        <main className="messages-container">
            <div className="back-to">
                <button className="icon-hoverable btn btn-white" onClick={() => handleConversations(false)}>
                    <FaArrowLeft />
                </button>
                <div className="top">
                    <span className="top-title">{messagedUsername}</span>
                </div>
            </div>
            <div className="messages-wrapper" ref={messagesWrapperRef}>
                {freshMessages.length > 0 &&
                    freshMessages.map((message: MessageProps) => (
                        <Message key={message.id} message={message} messagedUsername={messagedUsername} />
                    ))}
            </div>
            <NewMessageBox
                messagedUsername={messagedUsername}
                token={token}
                setFreshMessages={setFreshMessages}
                freshMessages={freshMessages}
            />
        </main>
    );
}
