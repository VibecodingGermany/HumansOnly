import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/utilities/auth/session";
import { getCurrentPolicyWithAcceptance } from "@/utilities/human/policy";

export async function GET() {
    const authUser = await getAuthenticatedUser();
    const { policy, acceptedAt } = await getCurrentPolicyWithAcceptance(authUser?.id);

    return NextResponse.json({
        success: true,
        version: policy.version,
        locale: policy.locale,
        title: policy.title,
        sections: policy.sections,
        checksum: policy.checksum,
        effectiveAt: policy.effectiveAt,
        accepted: Boolean(acceptedAt),
        acceptedAt,
    });
}
