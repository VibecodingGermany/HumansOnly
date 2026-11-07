import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q");

    if (!query) return NextResponse.json({ success: false, message: "Missing query.", exists: false }, { status: 400 });

    try {
        const user = await prisma.user.findUnique({
            where: {
                username: query,
            },
        });

        if (!user) return NextResponse.json({ success: true, exists: false });

        return NextResponse.json({ success: true, exists: true });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, message: "Failed to check user." }, { status: 500 });
    }
}
