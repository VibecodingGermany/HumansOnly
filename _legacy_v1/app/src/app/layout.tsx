import localFont from "next/font/local";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import "../styles/reset.scss";
import "../styles/globals.scss";
import Providers from "./providers";
import ClerkAuthBridge from "@/components/auth/ClerkAuthBridge";

export const metadata = {
    title: "Humans Only",
};

const roboto = localFont({
    src: "../fonts/Roboto.ttf",
    display: "swap",
    variable: "--font-roboto",
});

const poppins = localFont({
    src: [
        {
            path: "../fonts/Poppins-ExtraLight.ttf",
            weight: "100",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-Light.ttf",
            weight: "200",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-Regular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-Medium.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-SemiBold.ttf",
            weight: "600",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-Bold.ttf",
            weight: "700",
            style: "normal",
        },
        {
            path: "../fonts/Poppins-ExtraBold.ttf",
            weight: "800",
            style: "normal",
        },
    ],
    display: "swap",
    variable: "--font-poppins",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const skipClerkDuringCiBuild = process.env.SKIP_CLERK_CI_BUILD === "1";

    const document = (
        <html lang="en" className={`${roboto.variable} ${poppins.variable}`}>
            <body>
                {!skipClerkDuringCiBuild && (
                    <header className="clerk-auth-header">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="clerk-auth-btn" type="button">
                                    Log in
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="clerk-auth-btn clerk-auth-btn-primary" type="button">
                                    Sign up
                                </button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </header>
                )}
                {!skipClerkDuringCiBuild && <ClerkAuthBridge />}
                <Providers>{children}</Providers>
            </body>
        </html>
    );

    if (skipClerkDuringCiBuild) {
        return document;
    }

    return <ClerkProvider>{document}</ClerkProvider>;
}
