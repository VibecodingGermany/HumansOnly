import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/utilities/auth/session";

export async function GET() {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ success: true, token: null, source: null });

    const { authSource, clerkId: _clerkId, ...token } = user;
    return NextResponse.json({ success: true, token, source: authSource });
}
