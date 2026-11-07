"use client";

import Link from "next/link";
import { FaBullhorn, FaCode, FaShieldAlt, FaMusic } from "react-icons/fa";

import { UserProps } from "@/types/UserProps";

type CommunityBoardProps = {
    token: UserProps | null;
};

export default function CommunityBoard({ token }: CommunityBoardProps) {
    return (
        <section className="community-board">
            <article className="community-card community-card-primary">
                <div className="card-icon">
                    <FaBullhorn />
                </div>
                <h2>Baue Humans Only mit uns</h2>
                <p>
                    Wir suchen aktive Mitmacher. Entwicklungszeit, Moderation oder Operatives: wenn du die Plattform
                    verbessern willst, melde dich.
                </p>
                <ul>
                    <li>
                        <FaCode /> Entwickler:innen (Frontend, API, Security, AI Detection)
                    </li>
                    <li>
                        <FaShieldAlt /> Moderator:innen (Trust & Safety, Community Ops)
                    </li>
                </ul>
                <div className="card-actions">
                    <a href="https://github.com/cubetribe/HumansOnly/issues/new" target="_blank" rel="noreferrer">
                        Mitmachen auf GitHub
                    </a>
                    <a href="mailto:d.westermann@ol-mg.de?subject=Humans%20Only%20-%20Mitarbeit">
                        Direkt Kontakt
                    </a>
                </div>
                {token ? (
                    <p className="member-note">Danke, @{token.username}. Teile die Mission mit deinem Netzwerk.</p>
                ) : (
                    <p className="member-note">Sign in und werde Teil der ersten Kern-Community.</p>
                )}
            </article>

            <article className="community-card community-card-placeholder">
                <h3>Hier könnte deine Anzeige stehen</h3>
                <p>Premium-Platzierung für Projekte, Events und Initiativen, die zu einer echten Human-Community passen.</p>
            </article>

            <article className="community-card community-card-ad">
                <div className="ad-badge">
                    <FaMusic /> Creator Ad
                </div>
                <h3>Zeig deine Kunst. Lass dich fair bezahlen.</h3>
                <p>Leg jetzt dein Künstlerprofil an und lass dich von den Nutzern hier für deine Kunst fair bezahlen.</p>
                <div className="card-actions">
                    <Link href={token ? "/settings" : "/"}>{token ? "Jetzt Künstlerprofil starten" : "Einloggen und starten"}</Link>
                </div>
            </article>
        </section>
    );
}
