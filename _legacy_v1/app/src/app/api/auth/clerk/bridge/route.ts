import { auth } from "@clerk/nextjs/server";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

import { getJwtSecretKey } from "@/utilities/auth";
import { buildAuthCookie } from "@/utilities/auth/cookies";
import { getOrCreateUserByClerkId } from "@/utilities/auth/session";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";

export async function POST() {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
        return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    try {
        const user = await getOrCreateUserByClerkId(userId, (sessionClaims || {}) as Record<string, unknown>);
        const isSuperAdmin = isSuperAdminIdentity({
            username: user.username,
            clerkId: user.clerkId,
        });
        const effectiveRole = resolveEffectiveRole(user.role, isSuperAdmin);

        const token = await new SignJWT({
            id: user.id,
            username: user.username,
            name: user.name,
            description: user.description,
            location: user.location,
            website: user.website,
            isVerifiedHuman: user.isVerifiedHuman,
            role: effectiveRole,
            isSuperAdmin,
            createdAt: user.createdAt,
            photoUrl: user.photoUrl,
            headerUrl: user.headerUrl,
        })
            .setProtectedHeader({
                alg: "HS256",
            })
            .setIssuedAt()
            .setExpirationTime("1d")
            .sign(getJwtSecretKey());

        const response = NextResponse.json({ success: true });
        response.cookies.set(buildAuthCookie(token));
        return response;
    } catch {
        return NextResponse.json({ success: false, message: "Failed to sync Clerk session." }, { status: 500 });
    }
}
