"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Menu, MenuItem } from "@mui/material";
import { FaHome, FaBell, FaEnvelope, FaUser, FaCog, FaHashtag, FaEllipsisH, FaPlus, FaGavel, FaShieldAlt } from "react-icons/fa";
import { HumansOnlyLogo, VerifiedHumanBadge } from "@/components/icons";
import { useClerk } from "@clerk/nextjs";

import NewTweetDialog from "../dialog/NewTweetDialog";
import LogOutDialog from "../dialog/LogOutDialog";
import { logout } from "@/utilities/fetch";
import { AuthContext } from "@/app/(twitter)/layout";
import { getFullURL } from "@/utilities/misc/getFullURL";
import UnreadNotificationsBadge from "../misc/UnreadNotificationsBadge";

export default function LeftSidebar() {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isNewTweetOpen, setIsNewTweetOpen] = useState(false);
    const [isLogOutOpen, setIsLogOutOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const { token } = useContext(AuthContext);
    const { signOut } = useClerk();

    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await Promise.allSettled([logout(), signOut({ redirectUrl: "/" })]);
        router.push("/");
    };

    const handleAnchorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handleAnchorClose = () => {
        setAnchorEl(null);
    };
    const handleNewTweetClick = () => {
        setIsNewTweetOpen(true);
    };
    const handleNewTweetClose = () => {
        setIsNewTweetOpen(false);
    };
    const handleLogOutClick = () => {
        handleAnchorClose();
        setIsLogOutOpen(true);
    };
    const handleLogOutClose = () => {
        setIsLogOutOpen(false);
    };

    return (
        <>
            <aside className="left-sidebar">
                <div className="fixed">
                    <Link href="/explore" className="twitter-icon">
                        <HumansOnlyLogo />
                    </Link>
                    <nav>
                        <ul>
                            {token && (
                                <li>
                                    <Link href="/home">
                                        <div className={`nav-link ${pathname.startsWith("/home") ? "active" : ""}`}>
                                            <FaHome /> <span className="nav-title">Home</span>
                                        </div>
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link href="/explore">
                                    <div className={`nav-link ${pathname.startsWith("/explore") ? "active" : ""}`}>
                                        <FaHashtag /> <span className="nav-title">Explore</span>
                                    </div>
                                </Link>
                            </li>
                            <li>
                                <Link href="/rules">
                                    <div className={`nav-link ${pathname.startsWith("/rules") ? "active" : ""}`}>
                                        <FaGavel /> <span className="nav-title">Rules</span>
                                    </div>
                                </Link>
                            </li>
                            {token && (
                                <>
                                    <li>
                                        <Link href="/notifications">
                                            <div
                                                className={`nav-link ${
                                                    pathname.startsWith("/notifications") ? "active" : ""
                                                }`}
                                            >
                                                <div className="badge-wrapper">
                                                    <FaBell /> <UnreadNotificationsBadge />
                                                </div>
                                                <span className="nav-title">Notifications</span>
                                            </div>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/messages">
                                            <div className={`nav-link ${pathname.startsWith("/messages") ? "active" : ""}`}>
                                                <FaEnvelope /> <span className="nav-title">Messages</span>
                                            </div>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={`/${token.username}`}>
                                            <div
                                                className={`nav-link ${
                                                    pathname.startsWith(`/${token.username}`) ? "active" : ""
                                                }`}
                                            >
                                                <FaUser /> <span className="nav-title">Profile</span>
                                            </div>
                                        </Link>
                                    </li>
                                </>
                            )}
                            <li>
                                <Link href="/settings">
                                    <div className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}>
                                        <FaCog /> <span className="nav-title">Settings</span>
                                    </div>
                                </Link>
                            </li>
                            {token?.role === "admin" && (
                                <li>
                                    <Link href="/admin">
                                        <div className={`nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}>
                                            <FaShieldAlt /> <span className="nav-title">Admin</span>
                                        </div>
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </nav>
                    {token && (
                        <>
                            <button onClick={handleNewTweetClick} className="btn btn-tweet">
                                Post
                            </button>
                            <button onClick={handleAnchorClick} className="side-profile">
                                <div>
                                    <Avatar
                                        className="avatar"
                                        alt=""
                                        src={token.photoUrl ? getFullURL(token.photoUrl) : "/assets/egg.jpg"}
                                    />
                                </div>
                                <div>
                                    <div className="token-name">
                                        {token.name ? token.name : token.username}
                                        {token.isVerifiedHuman && (
                                            <span className="blue-tick" data-blue="Verified Human">
                                                <VerifiedHumanBadge />
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-muted token-username">@{token.username}</div>
                                </div>
                                <div className="three-dots">
                                    <FaEllipsisH />
                                </div>
                            </button>
                            <Menu
                                anchorEl={anchorEl}
                                onClose={handleAnchorClose}
                                open={Boolean(anchorEl)}
                                anchorOrigin={{
                                    vertical: "bottom",
                                    horizontal: "right",
                                }}
                                transformOrigin={{
                                    vertical: "bottom",
                                    horizontal: "right",
                                }}
                            >
                                <MenuItem onClick={handleAnchorClose}>
                                    <Link href={`/${token.username}`}>Profile</Link>
                                </MenuItem>
                                <MenuItem onClick={handleAnchorClose}>
                                    <Link href={`/${token.username}/edit`}>Edit Profile</Link>
                                </MenuItem>
                                <MenuItem onClick={handleAnchorClose}>
                                    <Link href="/settings">Settings</Link>
                                </MenuItem>
                                {token?.role === "admin" && (
                                    <MenuItem onClick={handleAnchorClose}>
                                        <Link href="/admin">Admin</Link>
                                    </MenuItem>
                                )}
                                <MenuItem onClick={handleAnchorClose}>
                                    <Link href="/rules">Rules</Link>
                                </MenuItem>
                                <MenuItem onClick={handleLogOutClick}>Log Out</MenuItem>
                            </Menu>
                        </>
                    )}
                </div>
            </aside>
            {token && (
                <nav className="mobile-nav">
                    <Link href="/home" className={`mobile-nav-link ${pathname.startsWith("/home") ? "active" : ""}`}>
                        <FaHome />
                        <span>Home</span>
                    </Link>
                    <Link href="/explore" className={`mobile-nav-link ${pathname.startsWith("/explore") ? "active" : ""}`}>
                        <FaHashtag />
                        <span>Explore</span>
                    </Link>
                    <Link href="/notifications" className={`mobile-nav-link ${pathname.startsWith("/notifications") ? "active" : ""}`}>
                        <div className="badge-wrapper">
                            <FaBell />
                            <UnreadNotificationsBadge />
                        </div>
                        <span>Alerts</span>
                    </Link>
                    <Link href="/messages" className={`mobile-nav-link ${pathname.startsWith("/messages") ? "active" : ""}`}>
                        <FaEnvelope />
                        <span>Messages</span>
                    </Link>
                    <Link href={`/${token.username}`} className={`mobile-nav-link ${pathname.startsWith(`/${token.username}`) ? "active" : ""}`}>
                        <FaUser />
                        <span>Profile</span>
                    </Link>
                </nav>
            )}
            {token && (
                <button className="mobile-post-fab" onClick={handleNewTweetClick} aria-label="Create post">
                    <FaPlus />
                </button>
            )}
            {token && (
                <>
                    <NewTweetDialog open={isNewTweetOpen} handleNewTweetClose={handleNewTweetClose} token={token} />
                    <LogOutDialog
                        open={isLogOutOpen}
                        handleLogOutClose={handleLogOutClose}
                        logout={handleLogout}
                        isLoggingOut={isLoggingOut}
                    />
                </>
            )}
        </>
    );
}
