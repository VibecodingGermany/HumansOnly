"use client";
import Link from "next/link";
import { Fragment } from "react";
import { displayUrl, tokenize } from "@/lib/links";
import { useClub } from "./provider";
/** Beitragstext mit klickbaren Links und @Erwähnungen. Kein HTML aus Nutzertext. */
export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { state } = useClub();
  return (
    <p className={className}>
      {tokenize(text).map((part, i) => {
        if (part.kind === "url")
          return (
            <a
              key={i}
              className="inline-link"
              href={part.href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              title={part.href}
            >
              {displayUrl(part.href)}
            </a>
          );
        if (
          part.kind === "mention" &&
          state.profiles.some((p) => p.username === part.username)
        )
          return (
            <Link
              key={i}
              className="inline-mention"
              href={`/u/${part.username}`}
            >
              {part.text}
            </Link>
          );
        return <Fragment key={i}>{part.text}</Fragment>;
      })}
    </p>
  );
}
