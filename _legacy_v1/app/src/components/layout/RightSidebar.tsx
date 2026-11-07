"use client";

import { useContext } from "react";

import { AuthContext } from "@/app/(twitter)/layout";
import Search from "../misc/Search";
import Legal from "../misc/Legal";
import CommunityBoard from "../misc/CommunityBoard";

export default function RightSidebar() {
    const { token } = useContext(AuthContext);

    return (
        <aside className="right-sidebar">
            <div className="fixed">
                <Search />
                <CommunityBoard token={token} />
                <Legal />
            </div>
        </aside>
    );
}
