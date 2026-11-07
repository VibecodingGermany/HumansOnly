import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

import { prisma } from "@/prisma/client";
import { hashPassword } from "@/utilities/bcrypt";
import { getJwtSecretKey } from "@/utilities/auth";
import { buildAuthCookie } from "@/utilities/auth/cookies";
import { createNotification } from "@/utilities/fetch";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";

type CreateUserPayload = {
    username: string;
    password: string;
    name?: string | null;
    description?: string | null;
    location?: string | null;
    website?: string | null;
    photoUrl?: string | null;
    headerUrl?: string | null;
};

const parseCreateUserPayload = async (request: NextRequest): Promise<CreateUserPayload | null> => {
    try {
        const body = await request.json();
        const username = typeof body?.username === "string" ? body.username.trim() : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!username || !password || username.length > 20 || password.length > 128) {
            return null;
        }

        return {
            username,
            password,
            name: typeof body?.name === "string" ? body.name : null,
            description: typeof body?.description === "string" ? body.description : null,
            location: typeof body?.location === "string" ? body.location : null,
            website: typeof body?.website === "string" ? body.website : null,
            photoUrl: typeof body?.photoUrl === "string" ? body.photoUrl : null,
            headerUrl: typeof body?.headerUrl === "string" ? body.headerUrl : null,
        };
    } catch {
        return null;
    }
};

export async function POST(request: NextRequest) {
    const userData = await parseCreateUserPayload(request);
    if (!userData) {
        return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    }
    const secret = process.env.CREATION_SECRET_KEY;

    if (!secret) {
        return NextResponse.json({
            success: false,
            message: "Secret key not found.",
        });
    }

    try {
        const userExists = await prisma.user.findUnique({
            where: {
                username: userData.username,
            },
        });

        if (userExists) {
            return NextResponse.json({
                success: false,
                message: "Username already exists.",
            }, { status: 409 });
        }

        const hashedPassword = await hashPassword(userData.password);

        const newUser = await prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
            },
        });
        const isSuperAdmin = isSuperAdminIdentity({
            username: newUser.username,
            clerkId: newUser.clerkId,
        });
        const effectiveRole = resolveEffectiveRole(newUser.role, isSuperAdmin);

        await createNotification(newUser.username, "welcome", secret);

        const token = await new SignJWT({
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            description: newUser.description,
            location: newUser.location,
            website: newUser.website,
            isVerifiedHuman: newUser.isVerifiedHuman,
            role: effectiveRole,
            isSuperAdmin,
            createdAt: newUser.createdAt,
            photoUrl: newUser.photoUrl,
            headerUrl: newUser.headerUrl,
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
        return NextResponse.json({ success: false, message: "Unable to create user right now." }, { status: 500 });
    }
}
