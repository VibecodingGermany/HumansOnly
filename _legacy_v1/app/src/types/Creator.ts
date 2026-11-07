export type CreatorMediaType = "image" | "audio";

export type CreatorPortfolioItem = {
    id: string;
    creatorProfileId: string;
    ownerId: string;
    title: string;
    description: string | null;
    mediaType: CreatorMediaType;
    mediaUrl: string;
    previewUrl: string | null;
    thumbnailUrl: string | null;
    priceCents: number | null;
    currency: string;
    licensingType: string;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CreatorProfile = {
    id: string;
    userId: string;
    stageName: string | null;
    bio: string | null;
    primaryDiscipline: string | null;
    genres: string[] | null;
    supportEnabled: boolean;
    shopEnabled: boolean;
    tipMinCents: number;
    currency: string;
    payoutProvider: string;
    payoutStatus: string;
    payoutAccountId: string | null;
    createdAt: string;
    updatedAt: string;
};
