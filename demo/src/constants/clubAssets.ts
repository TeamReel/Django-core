/**
 * Club Assets Configuration
 *
 * Defines the standard asset slots for TeamReel clubs.
 * These assets are used to generate member content (In Tenue images).
 *
 * Hierarchy:
 * - Club Level: Upload Logo, Tenue, Sponsor
 * - Season Level: Optional Sponsor override (inherits from club if not set)
 * - Member Level: Combine Profile Photo + Season's Tenue → Generate "In Tenue"
 */

// ============================================================================
// Club-Level Assets (uploaded at /knvb/ajax)
// ============================================================================

export const CLUB_ASSET_SLOTS = [
  // Input assets (uploaded by user)
  {
    id: 'logo',
    label: 'Club Logo',
    icon: '🏛️',
    description: 'Official club logo/crest',
    isInput: true,
    required: true,
  },
  {
    id: 'tenue',
    label: 'Tenue (Kit)',
    icon: '👕',
    description: 'Team kit/jersey template for photo generation',
    isInput: true,
    required: true,
  },
  {
    id: 'sponsor',
    label: 'Sponsor',
    icon: '💼',
    description: 'Main sponsor logo (optional)',
    isInput: true,
    required: false,
  },
  // Generated combinations
  {
    id: 'tenue_with_logo',
    label: 'Tenue + Logo',
    icon: '🎽',
    description: 'Generated: Kit with club logo applied',
    isInput: false,
    dependsOn: ['tenue', 'logo'],
  },
  {
    id: 'tenue_full',
    label: 'Tenue Complete',
    icon: '⭐',
    description: 'Generated: Kit with logo and sponsor',
    isInput: false,
    dependsOn: ['tenue', 'logo', 'sponsor'],
  },
] as const;

// ============================================================================
// Season-Level Assets (optional overrides)
// ============================================================================

export const SEASON_ASSET_SLOTS = [
  {
    id: 'sponsor',
    label: 'Season Sponsor',
    icon: '💼',
    description: 'Override sponsor for this season (inherits from club if empty)',
    isInput: true,
    required: false,
    inheritsFrom: 'club',
  },
  {
    id: 'tenue_full',
    label: 'Season Tenue',
    icon: '⭐',
    description: 'Effective tenue for this season (auto-generated with season sponsor)',
    isInput: false,
    dependsOn: ['club.tenue', 'club.logo', 'sponsor'],
  },
] as const;

// ============================================================================
// Types
// ============================================================================

export type ClubAssetSlotId = typeof CLUB_ASSET_SLOTS[number]['id'];
export type SeasonAssetSlotId = typeof SEASON_ASSET_SLOTS[number]['id'];

export type ClubAssetSlot = typeof CLUB_ASSET_SLOTS[number];
export type SeasonAssetSlot = typeof SEASON_ASSET_SLOTS[number];

/**
 * Club assets structure stored in project.metadata
 */
export interface ClubAssets {
  logo?: {
    url?: string;
    uploaded_at?: string;
  };
  tenue?: {
    url?: string;
    uploaded_at?: string;
  };
  sponsor?: {
    url?: string;
    uploaded_at?: string;
  };
  // Generated assets
  tenue_with_logo?: {
    url?: string;
    generated_at?: string;
  };
  tenue_full?: {
    url?: string;
    generated_at?: string;
  };
}

/**
 * Season assets structure stored in period.metadata (or period.data)
 */
export interface SeasonAssets {
  sponsor?: {
    url?: string;
    uploaded_at?: string;
    inherited?: boolean; // true if using club's sponsor
  };
  tenue_full?: {
    url?: string;
    generated_at?: string;
  };
}

/**
 * Extended project metadata with TeamReel club assets
 */
export interface ProjectMetadata {
  teamreel_assets?: ClubAssets;
  [key: string]: unknown;
}

/**
 * Extended period metadata with TeamReel season assets
 */
export interface PeriodMetadata {
  teamreel_assets?: SeasonAssets;
  [key: string]: unknown;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get effective tenue for a season
 * Returns the fully generated tenue with logo and sponsor
 */
export function getEffectiveSeasonTenue(
  clubAssets: ClubAssets | undefined,
  seasonAssets: SeasonAssets | undefined
): string | undefined {
  // If season has its own generated tenue, use that
  if (seasonAssets?.tenue_full?.url) {
    return seasonAssets.tenue_full.url;
  }
  // Otherwise use club's full tenue
  if (clubAssets?.tenue_full?.url) {
    return clubAssets.tenue_full.url;
  }
  // Fallback to tenue with logo (no sponsor)
  if (clubAssets?.tenue_with_logo?.url) {
    return clubAssets.tenue_with_logo.url;
  }
  return undefined;
}

/**
 * Get effective sponsor for a season
 * Returns season sponsor if set, otherwise club sponsor
 */
export function getEffectiveSponsor(
  clubAssets: ClubAssets | undefined,
  seasonAssets: SeasonAssets | undefined
): string | undefined {
  // Season sponsor takes precedence
  if (seasonAssets?.sponsor?.url && !seasonAssets.sponsor.inherited) {
    return seasonAssets.sponsor.url;
  }
  // Fall back to club sponsor
  return clubAssets?.sponsor?.url;
}

/**
 * Check if club has all required assets for tenue generation
 */
export function canGenerateClubTenue(clubAssets: ClubAssets | undefined): boolean {
  return Boolean(clubAssets?.logo?.url && clubAssets?.tenue?.url);
}

/**
 * Check if a season can generate In Tenue images for members
 */
export function canGenerateMemberInTenue(
  clubAssets: ClubAssets | undefined,
  seasonAssets: SeasonAssets | undefined
): boolean {
  const effectiveTenue = getEffectiveSeasonTenue(clubAssets, seasonAssets);
  return Boolean(effectiveTenue);
}
