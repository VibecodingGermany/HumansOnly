import { NextRequest } from "next/server";

import { prisma } from "@/prisma/client";
import { errorResponse, getRequestId, successResponse } from "@/utilities/observability";

const resolveLimit = (value: string | null) => {
    const parsed = Number.parseInt(value || "12", 10);
    if (!Number.isFinite(parsed)) return 12;
    return Math.min(Math.max(parsed, 1), 30);
};

export async function GET(
    request: NextRequest,
    { params: { username } }: { params: { username: string } }
) {
    const requestId = getRequestId(request);
    const limit = resolveLimit(request.nextUrl.searchParams.get("limit"));

    try {
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
            select: {
                id: true,
                username: true,
                name: true,
                photoUrl: true,
                isVerifiedHuman: true,
                creatorProfile: {
                    include: {
                        items: {
                            where: {
                                isPublished: true,
                            },
                            orderBy: {
                                publishedAt: "desc",
                            },
                            take: limit,
                        },
                    },
                },
            },
        });

        if (!user || !user.creatorProfile) {
            return successResponse(requestId, {
                success: true,
                creator: null,
            });
        }

        const tipStats = await prisma.creatorTip.aggregate({
            where: {
                creatorProfileId: user.creatorProfile.id,
                status: {
                    in: ["pending", "succeeded", "recorded"],
                },
            },
            _count: {
                _all: true,
            },
            _sum: {
                amountCents: true,
            },
        });

        const creator = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                photoUrl: user.photoUrl,
                isVerifiedHuman: user.isVerifiedHuman,
            },
            profile: user.creatorProfile,
            stats: {
                supportCount: tipStats._count._all || 0,
                supportVolumeCents: tipStats._sum.amountCents || 0,
            },
        };

        return successResponse(requestId, {
            success: true,
            creator,
        });
    } catch (error: unknown) {
        return errorResponse(requestId, "Could not load creator profile.", 500, error);
    }
}
