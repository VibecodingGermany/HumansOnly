import { prisma } from "@/prisma/client";

export const canUsersInteract = async (viewerId: string, targetId: string) => {
    if (!viewerId || !targetId || viewerId === targetId) {
        return {
            blocked: false,
            muted: false,
            blockedByViewer: false,
            blockedByTarget: false,
        };
    }

    const [blockedByViewer, blockedByTarget, mutedByViewer] = await prisma.$transaction([
        prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId: viewerId,
                    blockedId: targetId,
                },
            },
            select: {
                id: true,
            },
        }),
        prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId: targetId,
                    blockedId: viewerId,
                },
            },
            select: {
                id: true,
            },
        }),
        prisma.mute.findUnique({
            where: {
                muterId_mutedId: {
                    muterId: viewerId,
                    mutedId: targetId,
                },
            },
            select: {
                id: true,
            },
        }),
    ]);

    return {
        blocked: Boolean(blockedByViewer || blockedByTarget),
        muted: Boolean(mutedByViewer),
        blockedByViewer: Boolean(blockedByViewer),
        blockedByTarget: Boolean(blockedByTarget),
    };
};

export const visibleAuthorFilterForViewer = (viewerId: string) => ({
    blocksInitiated: {
        none: {
            blockedId: viewerId,
        },
    },
    blocksReceived: {
        none: {
            blockerId: viewerId,
        },
    },
    mutesReceived: {
        none: {
            muterId: viewerId,
        },
    },
});

export const visibleAuthorWhereForViewer = (viewerId: string | null) => {
    if (!viewerId) {
        return {
            isPrivate: false,
        };
    }

    return {
        AND: [
            {
                OR: [
                    {
                        id: viewerId,
                    },
                    {
                        isPrivate: false,
                    },
                    {
                        followers: {
                            some: {
                                id: viewerId,
                            },
                        },
                    },
                ],
            },
            visibleAuthorFilterForViewer(viewerId),
        ],
    };
};

export const visibleTweetWhereForViewer = (viewerId: string | null) => {
    if (!viewerId) {
        return {
            visibilityStatus: "public",
        };
    }

    return {
        OR: [
            {
                visibilityStatus: "public",
            },
            {
                authorId: viewerId,
            },
        ],
    };
};
