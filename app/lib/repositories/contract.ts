import type {
  Bucket,
  InvitePreview,
  NotificationSettings,
  OnboardingInput,
  PostInput,
  Profile,
  ProfileUpdate,
  Snapshot,
  Ticket,
  Vote,
} from "@/lib/model";
export interface ClubhouseRepository {
  load(): Promise<Snapshot>;
  inspectInvite(code: string): Promise<InvitePreview>;
  onboard(input: OnboardingInput): Promise<Profile>;
  createTicket(spaceId: string): Promise<Ticket>;
  createPost(input: PostInput): Promise<void>;
  vote(postId: string, vote: Vote): Promise<void>;
  upload(bucket: Bucket, file: Blob): Promise<string>;
  /** Eigenes Profil speichern (Name, Bio, Ort, Pronomen, Links, Sichtbarkeit). */
  updateProfile(input: ProfileUpdate): Promise<void>;
  /** Hochgeladenes Bild als Profilbild setzen; null entfernt es. */
  setAvatar(path: string | null): Promise<void>;
  updateNotifications(settings: NotificationSettings): Promise<void>;
  /** Löst die Bestätigungs-Mail für die neue Adresse aus. */
  requestEmailChange(email: string): Promise<void>;
  /** Löscht Konto, Profil, Beiträge und Tickets unwiderruflich. */
  deleteAccount(): Promise<void>;
  requestLogin(email: string): Promise<void>;
  verifyLogin(email: string, token: string): Promise<void>;
  hasSession(): Promise<boolean>;
  signOut(): Promise<void>;
  subscribe(onChange: () => void): () => void;
  /** Öffentlich: gleiche Antwort für neue und bereits bekannte Adressen. */
  joinWaitlist(name: string, email: string): Promise<void>;
  /** Admin: stellt ein Goldenes Ticket aus (ohne eigenes Budget) und gibt es zurück. */
  approveWaitlist(entryId: string): Promise<Ticket>;
  /** Admin: ist automatischer Mailversand auf dem Server eingerichtet? */
  mailStatus(): Promise<{ enabled: boolean; simulated: boolean }>;
  /** Admin: freigeben (falls nötig) und Einladungsmail über den Server verschicken. */
  sendWaitlistInvite(entryId: string): Promise<void>;
  rejectWaitlist(entryId: string): Promise<void>;
  deleteWaitlist(entryId: string): Promise<void>;
}
