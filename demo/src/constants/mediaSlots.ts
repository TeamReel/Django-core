/**
 * Media Slots Configuration
 *
 * Defines the 8 standard media slots for TeamReel member profiles.
 * Used across member detail pages, media galleries, and completion tracking.
 */

export const MEDIA_SLOTS = [
  // Input assets (uploaded by user)
  { id: 'profile', label: 'Profile Photo', icon: '👤', description: 'Headshot or portrait', isInput: true },
  { id: 'legacy_photo', label: 'Legacy Photo', icon: '📸', description: 'Historical photo of player', isInput: true },
  // Generated content (from templates)
  { id: 'kit', label: 'In Tenue', icon: '👕', description: 'Profile Photo + Team Tenue → Generated', isInput: false },
  { id: 'closeup', label: 'Close-up', icon: '🔍', description: 'In Tenue → Generated image', isInput: false },
  { id: 'intro', label: 'Short Intro', icon: '🎬', description: 'In Tenue → Generated video', isInput: false },
  { id: 'celebration', label: 'Celebration', icon: '🎉', description: 'In Tenue → Generated video', isInput: false },
  { id: 'then_vs_now', label: 'Transformation', icon: '⏳', description: 'Legacy + Current → Generated video', isInput: false },
  { id: 'legacy', label: 'Legacy in Tenue', icon: '🏆', description: 'Legacy Photo + Legacy Tenue → Generated', isInput: false },
  { id: 'photo_composite', label: 'Duo Portret', icon: '👥', description: 'Photo composite → Generated image', isInput: false },
  { id: 'walking_composite', label: 'Walking', icon: '🚶', description: 'Walking composite → Generated video', isInput: false },
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
