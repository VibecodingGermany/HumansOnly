"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { X } from "lucide-react";
import type { Profile } from "@/lib/model";
export function Mascot({
  pose = "hero-figur",
  className = "",
  size = 300,
}: {
  pose?: string;
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src={`/images/karl-dieter/${pose}.webp`}
      width={size}
      height={size}
      alt="Karl-Dieter, dein Gastgeber"
      className={`mascot ${className}`}
      priority={pose === "hero-figur"}
    />
  );
}
export function Avatar({
  profile,
  size = "normal",
}: {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
  size?: "small" | "normal" | "large";
}) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{
        backgroundColor: ["#ead8c2", "#d7dfca", "#e4d8ec", "#d2e1ec"][
          profile.username.length % 4
        ],
      }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" width="64" height="64" />
      ) : (
        <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Schließen">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="modal-description">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Loading() {
  return (
    <div className="empty-state" role="status">
      <span className="eyebrow">Einen kleinen Moment</span>
      <h2>Wir machen die Tür auf.</h2>
      <p>Dein Clubhaus wird geladen …</p>
    </div>
  );
}
