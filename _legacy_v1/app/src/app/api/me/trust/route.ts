import { NextResponse } from "next/server";

import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { getUserTrustSnapshot } from "@/utilities/human/trust";

export async function GET() {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();

    const trust = await getUserTrustSnapshot(authUser.id);
    if (!trust) {
        return NextResponse.json({ success: false, message: "Trust snapshot unavailable." }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        tier: trust.tier,
        score: trust.score,
        passkeyEnrolled: trust.passkeyEnrolled,
        recentChallenges: trust.recentChallenges,
        strikes: trust.strikes,
    });
}
