import { useEffect, useMemo, useState } from "react";
import { TextField, Avatar } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FaRegImage, FaRegSmile } from "react-icons/fa";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import CircularLoading from "../misc/CircularLoading";
import { createTweet, prepareHumanContext } from "@/utilities/fetch";
import { NewTweetProps } from "@/types/TweetProps";
import Uploader from "../misc/Uploader";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { uploadFile } from "@/utilities/storage";
import ProgressCircle from "../misc/ProgressCircle";
import TurnstileChallenge from "../human/TurnstileChallenge";

export default function NewTweet({ token, handleSubmit }: NewTweetProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [showDropzone, setShowDropzone] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [count, setCount] = useState(0);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [challengeNonce, setChallengeNonce] = useState(0);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const videoBetaPreview = process.env.NEXT_PUBLIC_VIDEO_BETA_PREVIEW === "true";

    const queryClient = useQueryClient();
    const draftStorageKey = useMemo(() => `ho:draft:new-post:${token.username}`, [token.username]);

    const mutation = useMutation({
        mutationFn: createTweet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
        },
        onError: (error) => console.log(error),
    });

    const handlePhotoChange = (file: File) => {
        setPhotoFile(file);
    };

    const validationSchema = yup.object({
        text: yup
            .string()
            .max(280, "Post text should be of maximum 280 characters length.")
            .required("Post text can't be empty."),
    });

    const formik = useFormik({
        initialValues: {
            text: "",
            photoUrl: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                setSubmitError(null);
                const humanContext = await prepareHumanContext({
                    action: "post_create",
                    challengeToken: challengeToken || undefined,
                });

                if (photoFile) {
                    const path: string | void = await uploadFile(photoFile);
                    if (!path) throw new Error("Error uploading image.");
                    values.photoUrl = path;
                    setPhotoFile(null);
                }

                const result = await mutation.mutateAsync({
                    text: values.text.trim(),
                    photoUrl: values.photoUrl || undefined,
                    challengeSessionId: humanContext.challengeSessionId,
                    ruleVersion: humanContext.ruleVersion,
                });

                if (result.pendingReview) {
                    setSubmitError(result.message || "Post queued for authenticity review.");
                    resetForm();
                    setCount(0);
                    setShowDropzone(false);
                    if (handleSubmit) handleSubmit();
                    return;
                }

                resetForm();
                setCount(0);
                setShowDropzone(false);
                setDraftLoaded(false);
                window.localStorage.removeItem(draftStorageKey);
                if (handleSubmit) handleSubmit();
            } catch (error) {
                const message = error instanceof Error ? error.message : "Could not publish post.";
                setSubmitError(message);
            } finally {
                setChallengeToken(null);
                setChallengeNonce((current) => current + 1);
            }
        },
    });

    useEffect(() => {
        const draftText = window.localStorage.getItem(draftStorageKey) || "";
        if (!draftText) {
            setDraftLoaded(false);
            return;
        }

        formik.setFieldValue("text", draftText, false);
        setCount(draftText.length);
        setDraftLoaded(true);
    }, [draftStorageKey]);

    const customHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextText = e.target.value;
        setCount(nextText.length);
        if (nextText.trim().length === 0) {
            window.localStorage.removeItem(draftStorageKey);
            setDraftLoaded(false);
        } else {
            window.localStorage.setItem(draftStorageKey, nextText);
            setDraftLoaded(true);
        }
        formik.handleChange(e);
    };

    const handleClearDraft = () => {
        window.localStorage.removeItem(draftStorageKey);
        formik.setFieldValue("text", "", false);
        setCount(0);
        setDraftLoaded(false);
    };

    if (formik.isSubmitting) {
        return <CircularLoading />;
    }

    return (
        <div className="new-tweet-form">
            <Avatar
                className="avatar div-link"
                sx={{ width: 50, height: 50 }}
                alt=""
                src={token.photoUrl ? getFullURL(token.photoUrl) : "/assets/egg.jpg"}
            />
            <form onSubmit={formik.handleSubmit}>
                <div className="input">
                    <TextField
                        placeholder="What's happening?"
                        multiline
                        hiddenLabel
                        minRows={3}
                        variant="standard"
                        fullWidth
                        name="text"
                        value={formik.values.text}
                        onChange={customHandleChange}
                        error={formik.touched.text && Boolean(formik.errors.text)}
                        helperText={formik.touched.text && formik.errors.text}
                    />
                </div>
                <div className="input-additions">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowDropzone(true);
                        }}
                        className="icon-hoverable"
                    >
                        <FaRegImage />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowPicker(!showPicker);
                        }}
                        className="icon-hoverable"
                    >
                        <FaRegSmile />
                    </button>
                    <ProgressCircle maxChars={280} count={count} />
                    <button className={`btn ${formik.isValid ? "" : "disabled"}`} disabled={!formik.isValid} type="submit">
                        Post
                    </button>
                </div>
                <div className="composer-meta-row">
                    {draftLoaded ? <span className="text-muted">Draft saved locally.</span> : <span className="text-muted">No draft saved.</span>}
                    {draftLoaded && (
                        <button type="button" className="btn btn-white" onClick={handleClearDraft}>
                            Clear draft
                        </button>
                    )}
                </div>
                {photoFile && (
                    <div className="composer-meta-row">
                        <span className="text-muted">Selected media: {photoFile.name}</span>
                        <button type="button" className="btn btn-white" onClick={() => setPhotoFile(null)}>
                            Remove media
                        </button>
                    </div>
                )}
                {videoBetaPreview && <p className="text-muted">Video beta preview is enabled for staged rollout validation.</p>}
                {showPicker && (
                    <div className="emoji-picker">
                        <Picker
                            data={data}
                            onEmojiSelect={(emoji: any) => {
                                formik.setFieldValue("text", formik.values.text + emoji.native);
                                setShowPicker(false);
                                setCount(count + emoji.native.length);
                            }}
                            previewPosition="none"
                        />
                    </div>
                )}
                {showDropzone && <Uploader handlePhotoChange={handlePhotoChange} />}
                <TurnstileChallenge
                    action="post_create"
                    nonce={challengeNonce}
                    onTokenChange={setChallengeToken}
                />
                {submitError && <p className="text-muted">{submitError}</p>}
            </form>
        </div>
    );
}
