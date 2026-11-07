"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function LandingPage() {
    return (
        <main className="landing-page">
            <div className="landing-bg">
                <Image src="/assets/landing-bg.jpg" alt="Background" fill priority style={{ objectFit: "cover" }} />
                <div className="landing-overlay" />
            </div>

            <div className="landing-content">
                <div className="landing-left">
                    <div className="landing-logo">
                        <Image src="/assets/ho-logo.png" alt="Humans Only" width={200} height={200} priority />
                    </div>
                    <h1 className="landing-slogan">
                        Join the Human
                        <br />
                        Revolution.
                    </h1>
                </div>

                <div className="landing-right">
                    <div className="landing-form">
                        <SignedOut>
                            <h2>Create your account with Clerk</h2>
                            <p>Registration and login are now handled by Clerk.</p>
                            <SignUpButton mode="modal">
                                <button className="btn btn-landing btn-submit" type="button">
                                    CREATE ACCOUNT
                                </button>
                            </SignUpButton>
                            <SignInButton mode="modal">
                                <button className="btn btn-landing" type="button">
                                    LOG IN
                                </button>
                            </SignInButton>
                            <Link className="btn btn-landing btn-submit" href="/explore">
                                EXPLORE WITHOUT SIGN IN
                            </Link>
                        </SignedOut>

                        <SignedIn>
                            <h2>You are signed in.</h2>
                            <p>Continue to explore Humans Only.</p>
                            <UserButton afterSignOutUrl="/" />
                            <Link className="btn btn-landing btn-submit" href="/explore">
                                GO TO EXPLORE
                            </Link>
                        </SignedIn>
                    </div>
                </div>
            </div>
        </main>
    );
}
