import type {
  Profile,
  Space,
  Membership,
  Post,
  ContentVote,
  Ticket,
  InvitePreview,
} from "@/lib/model";
type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      spaces: Table<Space>;
      space_members: Table<Membership>;
      posts: Table<Post>;
      content_votes: Table<ContentVote>;
      invite_tickets: Table<Ticket>;
    };
    Views: Record<string, never>;
    Functions: {
      inspect_invite: { Args: { p_code: string }; Returns: InvitePreview };
      create_invite: { Args: { p_space_id: string }; Returns: Ticket };
      redeem_invite: {
        Args: {
          p_code: string;
          p_username: string;
          p_display_name: string;
          p_bio: string;
          p_voice_path: string;
          p_voice_duration_sec: number;
        };
        Returns: Profile;
      };
      create_post: {
        Args: {
          p_space_id: string | null;
          p_text: string;
          p_image_path: string | null;
          p_audio_path: string | null;
          p_audio_duration_sec: number | null;
          p_parent_id: string | null;
        };
        Returns: Post;
      };
      cast_content_vote: {
        Args: { p_post_id: string; p_vote: string };
        Returns: Post;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
