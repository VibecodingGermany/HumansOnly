import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

const readReleaseMetadata = async () => {
    const candidate = path.join(process.cwd(), ".deploy", "release.txt");

    try {
        const raw = await fs.readFile(candidate, "utf8");
        const entries = raw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => line.split("="));

        return Object.fromEntries(entries);
    } catch {
        return null;
    }
};

export async function GET() {
    const release = await readReleaseMetadata();

    return NextResponse.json(
        {
            success: true,
            status: "ok",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            release,
        },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
}
