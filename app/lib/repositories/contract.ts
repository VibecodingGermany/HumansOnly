import type {
  Bucket,
  InvitePreview,
  OnboardingInput,
  PostInput,
  Profile,
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
  requestLogin(email: string): Promise<void>;
  verifyLogin(email: string, token: string): Promise<void>;
  hasSession(): Promise<boolean>;
  signOut(): Promise<void>;
  subscribe(onChange: () => void): () => void;
}
