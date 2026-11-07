import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isAdmin, unauthorizedResponse } from "@/utilities/auth/session";
import { isUserRole, normalizeUserRole } from "@/types/Role";
import { isSuperAdminIdentity } from "@/utilities/auth/roles";

type UpdateRolePayload = {
    role?: unknown;
};

export async function POST(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isAdmin(authUser)) {
        return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
    }

    let body: UpdateRolePayload;
    try {
        body = (await request.json()) as UpdateRolePayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    if (!isUserRole(body.role)) {
        return NextResponse.json({ success: false, message: "Invalid role." }, { status: 400 });
    }

    if (authUser.username === username) {
        return NextResponse.json({ success: false, message: "You cannot change your own role." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true, clerkId: true, username: true, role: true },
    });

    if (!targetUser) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const actorIsSuperAdmin = Boolean(authUser.isSuperAdmin);
    const targetIsSuperAdmin = isSuperAdminIdentity({
        username: targetUser.username,
        clerkId: targetUser.clerkId,
    });
    const targetCurrentRole = normalizeUserRole(targetUser.role);

    if (targetIsSuperAdmin) {
        return NextResponse.json({ success: false, message: "Super admin role is protected." }, { status: 403 });
    }
    if (!actorIsSuperAdmin && (body.role === "admin" || targetCurrentRole === "admin")) {
        return NextResponse.json(
            {
                success: false,
                message: "Only super admins can assign or modify admin roles.",
            },
            { status: 403 }
        );
    }

    const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: body.role },
        select: { id: true, username: true, role: true },
    });

    console.info(
        JSON.stringify({
            event: "role_change",
            actorUsername: authUser.username,
            actorIsSuperAdmin,
            targetUsername: targetUser.username,
            fromRole: targetCurrentRole,
            toRole: body.role,
            requestId: request.headers.get("x-request-id") || null,
            at: new Date().toISOString(),
        })
    );

    return NextResponse.json({ success: true, user: updated });
}
