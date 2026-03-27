/** Shape of `metadata.teamreel_assets` on squad members. */
export interface TeamreelAssets {
  media?: { legacy_photo?: { url?: string }; [key: string]: unknown };
  old?: { profile_photo_url?: string };
  videos?: Record<string, Record<string, { raw?: unknown; processing_state?: string; [key: string]: unknown }>>;
  [key: string]: unknown;
}
