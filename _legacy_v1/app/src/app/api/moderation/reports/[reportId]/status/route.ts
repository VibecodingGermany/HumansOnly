import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma/client";
import { getAuthenticatedUser, isModerator, unauthorizedResponse } from "@/utilities/auth/session";

const ALLOWED_STATUSES = new Set(["open", "reviewing", "resolved", "rejected"]);

type UpdateReportStatusPayload = {
    status?: unknown;
};

export async function POST(request: NextRequest, { params: { reportId } }: { params: { reportId: string } }) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return unauthorizedResponse();
    if (!isModerator(authUser)) {
        return NextResponse.json({ success: false, message: "Moderator access required." }, { status: 403 });
    }

    let body: UpdateReportStatusPayload;
    try {
        body = (await request.json()) as UpdateReportStatusPayload;
    } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const nextStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    if (!ALLOWED_STATUSES.has(nextStatus)) {
        return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({
        where: { id: reportId },
        select: { id: true },
    });

    if (!existing) {
        return NextResponse.json({ success: false, message: "Report not found." }, { status: 404 });
    }

    const updated = await prisma.report.update({
        where: { id: reportId },
        data: { status: nextStatus },
        select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, report: updated });
}
