import { NextRequest, NextResponse } from "next/server";

import { verifyJwtToken } from "@/utilities/auth";

export async function POST(request: NextRequest) {
    const { token } = await request.json();
    const payload = typeof token === "string" ? await verifyJwtToken(token) : null;
    return NextResponse.json(payload);
}
