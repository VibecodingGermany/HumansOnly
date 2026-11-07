"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Avatar, Dialog, TextField } from "@mui/material";
import { FaRegImage, FaRegSmile } from "react-icons/fa";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import Uploader from "../misc/Uploader";
import ProgressCircle from "../misc/ProgressCircle";
import { uploadFile } from "@/utilities/storage";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { UserProps } from "@/types/UserProps";
import TurnstileChallenge from "../human/TurnstileChallenge";

type EditTweetDialogProps = {
    open: boolean;
    token: Pick<UserProps, "photoUrl" | "name" | "username">;
    initialText: string;
    initialPhotoUrl?: string | null;
    onClose: () => void;
    onSave: (payload: { text: string; photoUrl?: string | null; challengeToken?: string }) => void;
    isSaving?: boolean;
};

const MAX_TWEET_LENGTH = 280;

export default function EditTweetDialog({
    open,
    token,
    initialText,
    initialPhotoUrl = null,
    onClose,
    onSave,
    isSaving = false,
}: EditTweetDialogProps) {
    const [text, setText] = useState(initialText);
    const [count, setCount] = useState(initialText.length);
    const [showPicker, setShowPicker] = useState(false);
    const [showDropzone, setShowDropzone] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
    const [uploaderKey, setUploaderKey] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [challengeNonce, setChallengeNonce] = useState(0);

    useEffect(() => {
        if (open) {
            setText(initialText);
            setCount(initialText.length);
            setShowPicker(false);
            setShowDropzone(false);
            setPhotoFile(null);
            setRemoveExistingPhoto(false);
            setUploaderKey((current) => current + 1);
            setError(null);
            setChallengeToken(null);
            setChallengeNonce((current) => current + 1);
        }
    }, [open, initialText, initialPhotoUrl]);

    const normalized = text.trim();
    const isValid = normalized.length > 0 && normalized.length <= MAX_TWEET_LENGTH;
    const existingPhotoSrc = initialPhotoUrl ? getFullURL(initialPhotoUrl) : "";
    const hasExistingPhoto = Boolean(existingPhotoSrc) && !removeExistingPhoto && !photoFile;
    const isBusy = isSaving || isUploading;

    const handlePhotoChange = (file: File) => {
        setPhotoFile(file);
        setRemoveExistingPhoto(true);
        setError(null);
    };

    const handleRemoveImage = () => {
        if (photoFile) {
            setPhotoFile(null);
            setShowDropzone(false);
            setUploaderKey((current) => current + 1);
        }
        setRemoveExistingPhoto(true);
    };

    const handleRestoreImage = () => {
        if (!initialPhotoUrl) return;
        setRemoveExistingPhoto(false);
    };

    const handleSubmit = async () => {
        if (!isValid || isBusy) return;

        const payload: { text: string; photoUrl?: string | null; challengeToken?: string } = {
            text: normalized,
            challengeToken: challengeToken || undefined,
        };

        try {
            setError(null);

            if (photoFile) {
                setIsUploading(true);
                payload.photoUrl = await uploadFile(photoFile, "post");
            } else if (initialPhotoUrl && removeExistingPhoto) {
                payload.photoUrl = null;
            }

            onSave(payload);
            setChallengeToken(null);
            setChallengeNonce((current) => current + 1);
        } catch (uploadError) {
            const uploadMessage = uploadError instanceof Error ? uploadError.message : "Image upload failed.";
            setError(uploadMessage);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog className="dialog" open={open} onClose={isBusy ? undefined : onClose} maxWidth={"sm"} fullWidth>
            <div className="new-tweet-wrapper edit-tweet-wrapper">
                <h1 className="title">Edit Post</h1>
                <div className="new-tweet-form edit-tweet-form">
                    <Avatar
                        className="avatar"
                        sx={{ width: 50, height: 50 }}
                        alt={token.username}
                        src={token.photoUrl ? getFullURL(token.photoUrl) : "/assets/egg.jpg"}
                    />
                    <div className="edit-tweet-fields">
                        <TextField
                            autoFocus
                            multiline
                            minRows={4}
                            maxRows={10}
                            fullWidth
                            value={text}
                            onChange={(event) => {
                                const nextText = event.target.value;
                                setText(nextText);
                                setCount(nextText.length);
                            }}
                            helperText={`${count}/${MAX_TWEET_LENGTH}`}
                        />

                        {hasExistingPhoto && (
                            <div className="edit-tweet-existing-media">
                                <Image src={existingPhotoSrc} alt="Current post image" width={500} height={500} />
                                <button className="btn btn-white" type="button" onClick={handleRemoveImage}>
                                    Remove image
                                </button>
                            </div>
                        )}

                        {removeExistingPhoto && initialPhotoUrl && !photoFile && (
                            <div className="edit-tweet-media-note">
                                Existing image will be removed after saving.
                                <button className="btn btn-white" type="button" onClick={handleRestoreImage}>
                                    Keep image
                                </button>
                            </div>
                        )}

                        <div className="input-additions">
                            <button
                                type="button"
                                className="icon-hoverable"
                                onClick={(event) => {
                                    event.preventDefault();
                                    setShowDropzone(true);
                                    setShowPicker(false);
                                }}
                            >
                                <FaRegImage />
                            </button>
                            <button
                                type="button"
                                className="icon-hoverable"
                                onClick={(event) => {
                                    event.preventDefault();
                                    setShowPicker((isOpen) => !isOpen);
                                }}
                            >
                                <FaRegSmile />
                            </button>
                            {photoFile && (
                                <button className="btn btn-white" type="button" onClick={handleRemoveImage}>
                                    Remove new image
                                </button>
                            )}
                            <ProgressCircle maxChars={MAX_TWEET_LENGTH} count={count} />
                        </div>

                        {showPicker && (
                            <div className="emoji-picker">
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: any) => {
                                        const nextText = `${text}${emoji.native}`;
                                        setText(nextText);
                                        setCount(nextText.length);
                                        setShowPicker(false);
                                    }}
                                    previewPosition="none"
                                />
                            </div>
                        )}

                        {showDropzone && <Uploader key={uploaderKey} handlePhotoChange={handlePhotoChange} />}

                        <TurnstileChallenge
                            action="post_edit"
                            nonce={challengeNonce}
                            onTokenChange={setChallengeToken}
                        />

                        {error && <p className="text-muted">{error}</p>}
                    </div>
                </div>
                <div className="edit-tweet-actions">
                    <button className="btn btn-white" type="button" onClick={onClose} disabled={isBusy}>
                        Cancel
                    </button>
                    <button className="btn btn-dark" type="button" onClick={handleSubmit} disabled={!isValid || isBusy}>
                        {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
