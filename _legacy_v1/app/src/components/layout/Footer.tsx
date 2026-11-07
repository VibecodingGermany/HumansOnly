"use client";

import { useContext } from "react";
import Link from "next/link";

import { AuthContext } from "@/app/(twitter)/layout";

export default function Footer() {
    const { token, isPending } = useContext(AuthContext);

    if (isPending) return null;

    if (!token)
        return (
            <footer className="footer">
                <div className="footer-div">
                    <h1>Don&apos;t miss what&apos;s happening</h1>
                    <p>People on Humans Only are the first to know.</p>
                </div>
                <div>
                    <Link href="/" className="btn ">
                        Log In
                    </Link>
                    <Link href="/" className="btn btn-light">
                        Sign Up
                    </Link>
                </div>
            </footer>
        );

    return null;
}
