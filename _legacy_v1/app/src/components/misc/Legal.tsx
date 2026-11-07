import { FaGithub } from "react-icons/fa";

import { APP_VERSION } from "@/version";

export default function Legal() {
    const year = new Date().getFullYear();

    return (
        <footer className="legal">
            <ul className="legal-links">
                <li>
                    <a href="/legal/terms" target="_blank" rel="noreferrer">
                        Terms of Service
                    </a>
                </li>
                <li>
                    <a href="/legal/privacy" target="_blank" rel="noreferrer">
                        Privacy Policy
                    </a>
                </li>
                <li>
                    <a href="/legal/cookies" target="_blank" rel="noreferrer">
                        Cookie Policy
                    </a>
                </li>
                <li>
                    <a href="/legal/imprint" target="_blank" rel="noreferrer">
                        Imprint
                    </a>
                </li>
                <li>
                    <a href="/legal/accessibility" target="_blank" rel="noreferrer">
                        Accessibility
                    </a>
                </li>
            </ul>
            <div className="copy">
                <a href="https://humans-only.de/" target="_blank" rel="noreferrer">
                    &copy; {year} | Humans Only
                </a>
                <a href="https://github.com/cubetribe/HumansOnly" target="_blank" rel="noreferrer" aria-label="Humans Only GitHub">
                    <FaGithub className="github" />
                </a>
                <span className="version">Version {APP_VERSION}</span>
            </div>
        </footer>
    );
}
