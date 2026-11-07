import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomBytes } from "crypto";

export type ServerUploadType = "post" | "profile" | "header" | "creator_image" | "creator_audio";

type StoreMediaPayload = {
    buffer: Buffer;
    extension: string;
    mimeType: string;
    uploadType: ServerUploadType;
    userId: string;
};

type StoreMediaResult = {
    provider: "local" | "supabase";
    storageKey: string;
    publicUrl: string;
};

const sanitizeExtension = (extension: string) => {
    const cleaned = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleaned || "bin";
};

const randomSuffix = () => randomBytes(8).toString("hex");

const buildStorageKey = ({ uploadType, userId, extension }: { uploadType: ServerUploadType; userId: string; extension: string }) =>
    `${uploadType}/${userId}/${Date.now()}-${randomSuffix()}.${sanitizeExtension(extension)}`;

const storeInLocal = async (payload: StoreMediaPayload): Promise<StoreMediaResult> => {
    const filename = `${Date.now()}-${randomSuffix()}.${sanitizeExtension(payload.extension)}`;
    const uploadDir = join(process.cwd(), "public", "uploads");

    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }

    const filepath = join(uploadDir, filename);
    await writeFile(filepath, payload.buffer);

    return {
        provider: "local",
        storageKey: filename,
        publicUrl: `/uploads/${filename}`,
    };
};

const storeInSupabase = async (payload: StoreMediaPayload): Promise<StoreMediaResult> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "humansonly-media";

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase storage is not configured.");
    }

    const storageKey = buildStorageKey({
        uploadType: payload.uploadType,
        userId: payload.userId,
        extension: payload.extension,
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });

    const { error } = await supabase.storage.from(bucket).upload(storageKey, payload.buffer, {
        contentType: payload.mimeType,
        cacheControl: "31536000",
        upsert: false,
    });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
        throw new Error("Supabase public URL could not be generated.");
    }

    return {
        provider: "supabase",
        storageKey,
        publicUrl,
    };
};

export const storeMediaBuffer = async (payload: StoreMediaPayload): Promise<StoreMediaResult> => {
    const mode = (process.env.UPLOAD_STORAGE_PROVIDER || "local").toLowerCase();

    if (mode === "supabase") {
        return storeInSupabase(payload);
    }

    if (mode === "auto") {
        const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
        if (hasSupabaseConfig) {
            return storeInSupabase(payload);
        }
    }

    return storeInLocal(payload);
};
