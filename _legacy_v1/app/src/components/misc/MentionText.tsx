import Link from "next/link";

const MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})/g;

const isValidMentionBoundary = (source: string, index: number) => {
    if (index === 0) return true;
    const prev = source[index - 1];
    return !/[a-zA-Z0-9_.]/.test(prev);
};

export default function MentionText({ text }: { text: string }) {
    if (!text) return null;

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null = MENTION_REGEX.exec(text);

    while (match) {
        const mentionStart = match.index;
        const mentionToken = match[0];
        const username = match[1];
        const mentionEnd = mentionStart + mentionToken.length;

        if (mentionStart > cursor) {
            nodes.push(text.slice(cursor, mentionStart));
        }

        if (isValidMentionBoundary(text, mentionStart)) {
            nodes.push(
                <Link key={`${username}-${mentionStart}`} href={`/${username}`} className="mention">
                    {mentionToken}
                </Link>
            );
        } else {
            nodes.push(mentionToken);
        }

        cursor = mentionEnd;
        match = MENTION_REGEX.exec(text);
    }

    if (cursor < text.length) {
        nodes.push(text.slice(cursor));
    }

    return <>{nodes}</>;
}
