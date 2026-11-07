import { useState } from "react";

import { trackProductEvent } from "@/utilities/fetch";

const defaultPrompts = [
    "Welche echte Fähigkeit hast du dieses Jahr verbessert?",
    "Welche Community-Idee würde Humans Only besser machen?",
    "Wofür brauchst du heute Feedback von anderen Menschen?",
];

export default function ConversationPrompts({ username }: { username: string }) {
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

    const handleUsePrompt = async (prompt: string) => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedPrompt(prompt);
        } catch {
            setCopiedPrompt(prompt);
        }

        void trackProductEvent({
            eventName: "conversation_prompt_used",
            surface: "home_prompts",
            payload: {
                username,
                prompt,
            },
        });
    };

    return (
        <section className="conversation-prompts">
            <h2>Conversation Starters</h2>
            <p className="text-muted">Klick auf eine Idee und füge sie in deinen nächsten Post ein.</p>
            <div className="conversation-prompts-grid">
                {defaultPrompts.map((prompt) => (
                    <button key={prompt} type="button" className="prompt-card" onClick={() => handleUsePrompt(prompt)}>
                        <span>{prompt}</span>
                        <small>{copiedPrompt === prompt ? "Copied" : "Use prompt"}</small>
                    </button>
                ))}
            </div>
        </section>
    );
}

