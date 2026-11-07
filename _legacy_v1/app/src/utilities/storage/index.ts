export type UploadType = 'post' | 'profile' | 'header' | 'creator_image' | 'creator_audio';

export const uploadFile = async (
    file: File,
    type: UploadType = 'post',
    options?: { challengeSessionId?: string; ruleVersion?: string }
): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        if (options?.challengeSessionId) formData.append("challengeSessionId", options.challengeSessionId);
        if (options?.ruleVersion) formData.append("ruleVersion", options.ruleVersion);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await response.json() : null;

        if (!response.ok || !data?.success) {
            const fallbackMessage = `Upload failed (${response.status})`;
            throw new Error(data?.error || data?.message || fallbackMessage);
        }

        if (!data.path || typeof data.path !== "string") {
            throw new Error(data.message || "Upload did not return a media path.");
        }

        return data.path;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};
