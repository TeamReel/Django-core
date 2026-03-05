/**
 * Media Slots Configuration
 *
 * Defines the 8 standard media slots for TeamReel member profiles.
 * Used across member detail pages, media galleries, and completion tracking.
 */

export const MEDIA_SLOTS = [
  // Input assets (uploaded by user)
  { id: 'profile', label: 'Profile Photo', icon: 'user', description: 'Headshot or portrait', isInput: true },
  { id: 'legacy_photo', label: 'Legacy Photo', icon: 'camera', description: 'Historical photo of player', isInput: true },
  // Generated content (from templates)
  { id: 'kit', label: 'In Tenue', icon: 'shirt', description: 'Profile Photo + Team Tenue → Generated', isInput: false },
  { id: 'closeup', label: 'Close-up', icon: 'scan-face', description: 'In Tenue → Generated image', isInput: false },
  { id: 'intro', label: 'Short Intro', icon: 'clapperboard', description: 'In Tenue → Generated video', isInput: false },
  { id: 'celebration', label: 'Celebration', icon: 'party-popper', description: 'In Tenue → Generated video', isInput: false },
  { id: 'then_vs_now', label: 'Transformation', icon: 'arrow-right-left', description: 'Legacy + Current → Generated video', isInput: false },
  { id: 'legacy', label: 'Legacy in Tenue', icon: 'trophy', description: 'Legacy Photo + Legacy Tenue → Generated', isInput: false },
  { id: 'photo_composite', label: 'Duo Portret', icon: 'users', description: 'Photo composite → Generated image', isInput: false },
  { id: 'walking_composite', label: 'Walking', icon: 'footprints', description: 'Walking composite → Generated video', isInput: false },
  { id: 'action_photo', label: 'Actiefoto', icon: 'zap', description: 'In Tenue → Action photo (dribbling, shooting, etc.)', isInput: false },
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
