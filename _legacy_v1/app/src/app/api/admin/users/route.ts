import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isAdmin, unauthorizedResponse } from "@/utilities/auth/session";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";

export async function GET(request: NextRequest) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isAdmin(authUser)) {
        return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").trim();
    const limitRaw = Number.parseInt(searchParams.get("limit") || "30", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const users = await prisma.user.findMany({
        where: query
            ? {
                  OR: [
                      { username: { contains: query, mode: "insensitive" } },
                      { name: { contains: query, mode: "insensitive" } },
                  ],
              }
            : undefined,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        select: {
            id: true,
            clerkId: true,
            username: true,
            name: true,
            role: true,
            isVerifiedHuman: true,
            createdAt: true,
            photoUrl: true,
        },
    });

    const withEffectiveRole = users
        .map((user) => {
            const isSuperAdmin = isSuperAdminIdentity({
                username: user.username,
                clerkId: user.clerkId,
            });

            return {
                id: user.id,
                username: user.username,
                name: user.name,
                role: resolveEffectiveRole(user.role, isSuperAdmin),
                isSuperAdmin,
                isVerifiedHuman: user.isVerifiedHuman,
                createdAt: user.createdAt,
                photoUrl: user.photoUrl,
            };
        })
        .sort((a, b) => {
            const roleWeight = { admin: 3, moderator: 2, user: 1 };
            const weightDelta = roleWeight[b.role] - roleWeight[a.role];
            if (weightDelta !== 0) return weightDelta;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });

    return NextResponse.json({ success: true, users: withEffectiveRole });
}
