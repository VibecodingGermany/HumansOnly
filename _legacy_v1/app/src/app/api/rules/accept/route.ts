import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { acceptCurrentPolicy } from "@/utilities/human/policy";

type AcceptRulesPayload = {
    version?: unknown;
    checksum?: unknown;
};

export async function POST(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    let body: AcceptRulesPayload;
    try {
        body = (await request.json()) as AcceptRulesPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const version = typeof body.version === "string" ? body.version.trim() : "";
    const checksum = typeof body.checksum === "string" ? body.checksum.trim() : "";

    if (!version || !checksum) {
        return NextResponse.json({ success: false, message: "version and checksum are required." }, { status: 400 });
    }

    const accepted = await acceptCurrentPolicy({
        userId: authUser.id,
        version,
        checksum,
        request,
    });

    if (!accepted.success) {
        return NextResponse.json(
            {
                success: false,
                message: accepted.message,
                currentVersion: accepted.policy.version,
                currentChecksum: accepted.policy.checksum,
            },
            { status: 409 }
        );
    }

    console.log(
        JSON.stringify({
            event: "rules_accept",
            userId: authUser.id,
            username: authUser.username,
            version: accepted.policy.version,
            acceptedAt: accepted.acceptance.acceptedAt.toISOString(),
        })
    );

    return NextResponse.json({
        success: true,
        accepted: true,
        acceptedAt: accepted.acceptance.acceptedAt,
        version: accepted.policy.version,
        checksum: accepted.policy.checksum,
    });
}
