/**
 * Media Slots Configuration
 *
 * Defines the 7 standard media slots for TeamReel member profiles.
 * Used across member detail pages, media galleries, and completion tracking.
 */

export const MEDIA_SLOTS = [
  { id: 'profile', label: 'Profile Photo', icon: '👤', description: 'Headshot or portrait' },
  { id: 'kit', label: 'In Tenue', icon: '👕', description: 'Player in team kit' },
  { id: 'fullbody', label: 'Full Body', icon: '🧍', description: 'Full body portrait' },
  { id: 'closeup', label: 'Close-up', icon: '🔍', description: 'Close-up shot' },
  { id: 'intro', label: 'Short Intro', icon: '🎬', description: 'Video introduction' },
  { id: 'celebration', label: 'Celebration', icon: '🎉', description: 'Celebration moment' },
  { id: 'legacy', label: 'Legacy', icon: '🏆', description: 'Legacy/history shot' },
] as const;

/**
 * Type for media slot IDs
 */
export type MediaSlotId = typeof MEDIA_SLOTS[number]['id'];

/**
 * Type for a single media slot configuration
 */
export type MediaSlot = typeof MEDIA_SLOTS[number];

/**
 * Form data structure for member media editing
 */
export type MemberMediaForm = {
  [K in MediaSlotId]: { url: string; caption: string };
};

/**
 * TeamReel assets structure stored in membership metadata
 */
export interface TeamReelAssets {
  media: {
    [K in MediaSlotId]?: {
      url?: string;
      caption?: string;
    };
  };
}

/**
 * Extended membership metadata with TeamReel assets
 */
export interface MembershipMetadata {
  teamreel_assets?: TeamReelAssets;
  [key: string]: unknown;
}
