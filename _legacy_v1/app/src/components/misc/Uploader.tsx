import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Typography } from "@mui/material";

export default function Uploader({ handlePhotoChange }: { handlePhotoChange: (file: File) => void }) {
    const [preview, setPreview] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const onDrop = async (acceptedFiles: File[]) => {
        setError(null);
        setIsLoading(true);

        const file = acceptedFiles[0];
        setPreview(file);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        handlePhotoChange(file);
        setIsLoading(false);
    };

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/gif": [".gif"],
            "image/webp": [".webp"],
            "image/avif": [".avif"],
            "image/heic": [".heic"],
            "image/heif": [".heif"],
        },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
        multiple: false,
        onDrop,
        onDropRejected: (fileRejections) => {
            const rejection = fileRejections[0];
            if (rejection?.errors[0]) {
                const errorCode = rejection.errors[0].code;
                if (errorCode === 'file-too-large') {
                    setError('File too large. Maximum 50MB allowed.');
                } else if (errorCode === 'file-invalid-type') {
                    setError('Invalid file type. Use JPEG, PNG, GIF, WebP, AVIF, HEIC or HEIF.');
                } else {
                    setError('Upload error. Please try again.');
                }
            }
        },
    });

    // Cleanup memory leak
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <div className="dropzone">
            <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag and drop an image file here, or click to select one</p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>Max 50MB - JPEG, PNG, GIF, WebP, AVIF, HEIC, HEIF</p>
            </div>
            {error && (
                <Typography color="error" sx={{ mt: 1, fontSize: '0.875rem' }}>
                    {error}
                </Typography>
            )}
            {isLoading && (
                <Typography sx={{ mt: 1, fontSize: '0.875rem' }}>
                    Loading preview...
                </Typography>
            )}
            {preview && previewUrl && (
                <Image className="preview" src={previewUrl} width={250} height={250} alt="preview" />
            )}
        </div>
    );
}
