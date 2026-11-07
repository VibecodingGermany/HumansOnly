import { NextRequest, NextResponse } from "next/server";
import { buildClearedAuthCookie } from "@/utilities/auth/cookies";

export async function GET(request: NextRequest) {
    const response = NextResponse.json({
        success: true,
        message: "Logged out successfully",
    });

    response.cookies.set(buildClearedAuthCookie());

    return response;
}
