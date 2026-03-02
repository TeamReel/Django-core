/**
 * assetsTabHelpers — Constants and type exports for AssetsTab
 *
 * Extracted from AssetsTab.tsx (Phase 23).
 */

// ============================================================================
// Types
// ============================================================================

export type AssetsLevel = 'organisation' | 'club' | 'team' | 'season' | 'match' | 'member';

// ============================================================================
// Constants
// ============================================================================

/** Maps upload asset type → output (AI-processed) asset type for auto-save */
export const UPLOAD_OUTPUT_TYPE: Record<string, string> = {
  'logo_upload': 'logo',
  'sponsor_logo_upload': 'sponsor_logo',
  'kit_home_upload': 'kit_home',
  'kit_away_upload': 'kit_away',
  'kit_third_upload': 'kit_third',
  'kit_goalkeeper_upload': 'kit_goalkeeper',
  'kit_training_upload': 'kit_training',
  'kit_coach_upload': 'kit_coach',
  'kit_assistant_upload': 'kit_assistant',
  'kit_legacy_upload': 'kit_legacy',
};

/** Maps upload asset type → AI template to auto-trigger after upload */
export const UPLOAD_TO_AI_TEMPLATE: Record<string, { templateId: string; initialParams?: Record<string, string> }> = {
  'logo_upload': { templateId: 'logo_standardize' },
  'sponsor_logo_upload': { templateId: 'sponsor_standardize' },
  'kit_home_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'home' } },
  'kit_away_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'away' } },
  'kit_third_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'third' } },
  'kit_goalkeeper_upload': { templateId: 'keeper_tenue' },
  'kit_training_upload': { templateId: 'tracksuit_generate' },
  'kit_coach_upload': { templateId: 'coach_outfit' },
  'kit_assistant_upload': { templateId: 'coach_outfit' },
  'kit_legacy_upload': { templateId: 'legacy_tenue_generate' },
  'location_photo': { templateId: 'location_standardize' },
  'club_background_upload': { templateId: 'background_standardize' },
};
