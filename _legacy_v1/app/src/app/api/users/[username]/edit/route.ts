import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

import { prisma } from "@/prisma/client";
import { getJwtSecretKey } from "@/utilities/auth";
import { buildAuthCookie } from "@/utilities/auth/cookies";
import { getAuthenticatedUser, unauthorizedResponse } from "@/utilities/auth/session";
import { sanitizeMediaUrl } from "@/utilities/misc/sanitizeMediaUrl";
import { isSuperAdminIdentity, resolveEffectiveRole } from "@/utilities/auth/roles";
import { trackProductEventForUser } from "@/utilities/analytics/server";

type ValidationResult = {
    isSet: boolean;
    value?: string | null;
    error?: string;
};

const readOptionalTextField = (
    body: Record<string, unknown>,
    field: "name" | "description" | "location" | "website",
    maxLength: number
): ValidationResult => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
        return { isSet: false };
    }

    const rawValue = body[field];
    if (rawValue === null) {
        return { isSet: true, value: null };
    }
    if (typeof rawValue !== "string") {
        return { isSet: true, error: `${field} must be a string.` };
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return { isSet: true, value: null };
    }
    if (trimmed.length > maxLength) {
        return { isSet: true, error: `${field} must be at most ${maxLength} characters.` };
    }

    return { isSet: true, value: trimmed };
};

const readOptionalMediaField = (body: Record<string, unknown>, field: "photoUrl" | "headerUrl"): ValidationResult => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
        return { isSet: false };
    }

    const rawValue = body[field];
    if (rawValue === null) {
        return { isSet: true, value: null };
    }
    if (typeof rawValue !== "string") {
        return { isSet: true, error: `${field} must be a string.` };
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return { isSet: true, value: null };
    }

    const sanitized = sanitizeMediaUrl(trimmed);
    if (!sanitized) {
        return { isSet: true, error: `${field} must be a valid upload URL.` };
    }

    return { isSet: true, value: sanitized };
};

export async function POST(request: NextRequest, { params: { username } }: { params: { username: string } }) {
    const requestId = request.headers.get("x-request-id") || undefined;
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (authUser.username !== username) return unauthorizedResponse();

    if (Object.prototype.hasOwnProperty.call(body, "isVerifiedHuman") && typeof body.isVerifiedHuman !== "boolean") {
        return NextResponse.json({ success: false, message: "isVerifiedHuman must be a boolean." }, { status: 400 });
    }

    const nameField = readOptionalTextField(body, "name", 50);
    if (nameField.error) return NextResponse.json({ success: false, message: nameField.error }, { status: 400 });

    const descriptionField = readOptionalTextField(body, "description", 160);
    if (descriptionField.error) return NextResponse.json({ success: false, message: descriptionField.error }, { status: 400 });

    const locationField = readOptionalTextField(body, "location", 30);
    if (locationField.error) return NextResponse.json({ success: false, message: locationField.error }, { status: 400 });

    const websiteField = readOptionalTextField(body, "website", 30);
    if (websiteField.error) return NextResponse.json({ success: false, message: websiteField.error }, { status: 400 });

    const photoField = readOptionalMediaField(body, "photoUrl");
    if (photoField.error) return NextResponse.json({ success: false, message: photoField.error }, { status: 400 });

    const headerField = readOptionalMediaField(body, "headerUrl");
    if (headerField.error) return NextResponse.json({ success: false, message: headerField.error }, { status: 400 });

    const wantsVerifiedHuman = body.isVerifiedHuman === true;

    if (wantsVerifiedHuman) {
        const providedCode = typeof body.verificationCode === "string" ? body.verificationCode : "";
        if (!process.env.BLUE_SECRET_KEY || providedCode !== process.env.BLUE_SECRET_KEY) {
            return NextResponse.json({ success: false, message: "Invalid verification code." }, { status: 400 });
        }
    }

    try {
        const updateData: {
            name?: string | null;
            description?: string | null;
            location?: string | null;
            website?: string | null;
            photoUrl?: string | null;
            headerUrl?: string | null;
            isVerifiedHuman?: boolean;
        } = {};

        if (nameField.isSet) updateData.name = nameField.value ?? null;
        if (descriptionField.isSet) updateData.description = descriptionField.value ?? null;
        if (locationField.isSet) updateData.location = locationField.value ?? null;
        if (websiteField.isSet) updateData.website = websiteField.value ?? null;
        if (photoField.isSet) updateData.photoUrl = photoField.value ?? null;
        if (headerField.isSet) updateData.headerUrl = headerField.value ?? null;
        if (wantsVerifiedHuman) updateData.isVerifiedHuman = true;

        const user = await prisma.user.update({
            where: {
                username: username,
            },
            data: updateData,
        });

        await trackProductEventForUser({
            userId: authUser.id,
            eventName: "profile_updated",
            surface: "profile_edit",
            sessionId: requestId,
            payload: {
                updatedFields: Object.keys(updateData),
                verifiedHumanChanged: Boolean(updateData.isVerifiedHuman),
            },
        });

        const isSuperAdmin = isSuperAdminIdentity({
            username: user.username,
            clerkId: user.clerkId,
        });
        const effectiveRole = resolveEffectiveRole(user.role, isSuperAdmin);

        const newToken = await new SignJWT({
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
        response.cookies.set(buildAuthCookie(newToken));

        return response;
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ success: false, message: "Failed to update profile." }, { status: 500 });
    }
}
