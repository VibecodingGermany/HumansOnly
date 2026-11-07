import { NextResponse, NextRequest } from "next/server";
import { SignJWT } from "jose";

import { prisma } from "@/prisma/client";
import { comparePasswords } from "@/utilities/bcrypt";
import { getJwtSecretKey } from "@/utilities/auth";
import { buildAuthCookie } from "@/utilities/auth/cookies";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";

const INVALID_CREDENTIALS_MESSAGE = "Username or password is not correct.";

type LoginPayload = {
    username: string;
    password: string;
};

const parseLoginPayload = async (request: NextRequest): Promise<LoginPayload | null> => {
    try {
        const body = await request.json();
        const username = typeof body?.username === "string" ? body.username.trim() : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!username || !password || username.length > 20 || password.length > 128) {
            return null;
        }

        return { username, password };
    } catch {
        return null;
    }
};

export async function POST(request: NextRequest) {
    const payload = await parseLoginPayload(request);
    if (!payload) {
        return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    }
    const { username, password } = payload;

    try {
        const user = await prisma.user.findUnique({
            where: {
                username: username,
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
        }

        const isPasswordValid = await comparePasswords(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ success: false, message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
        }

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

        const response = NextResponse.json({
            success: true,
        });

        response.cookies.set(buildAuthCookie(token));

        return response;
    } catch {
        return NextResponse.json({ success: false, message: "Unable to login right now." }, { status: 500 });
    }
}
