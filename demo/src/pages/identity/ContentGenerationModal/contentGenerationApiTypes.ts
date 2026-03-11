/**
 * Type definitions for contentGenerationApi functions.
 */
import type { ContentTemplate } from './types';

/* ================================================================== */
/*  Fetch templates                                                    */
/* ================================================================== */

export interface FetchTemplatesParams {
  templateType: string;
  templateSubtype: string;
  organisationSport?: { id: number | string; name: string; slug?: string } | null;
}

/* ================================================================== */
/*  Lineup Flyer                                                       */
/* ================================================================== */

export interface GenerateLineupFlyerParams {
  matchData: { id: string; project?: { id: string }; metadata?: Record<string, any> } | null;
  seasonProjectId?: string | number;
  selectedMembers: Record<string, string[]>;
  lineupFormation: string;
  lineupCloseupStyle: string;
  selectedTemplateId?: number | null;
  selectedBackgroundUrl?: string | null;
}

/* ================================================================== */
/*  Team Poster                                                        */
/* ================================================================== */

export interface GenerateTeamPosterParams {
  matchData: { id: string; project?: { id: string }; metadata?: Record<string, any> } | null;
  seasonProjectId?: string | number;
  selectedMembers: Record<string, string[]>;
  lineupFormation: string;
  selectedTemplateId?: number | null;
}

/* ================================================================== */
/*  Match Flyer                                                        */
/* ================================================================== */

export interface GenerateMatchFlyerParams {
  matchData: { id: string; project?: { id: string } } | null;
  seasonProjectId?: string | number;
  matchFlyerVariant: string;
  flyerPhotoLayout: string;
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  flyerMemberId: string | null;
  flyerActionStyle: string;
  selectedBackgroundUrl?: string | null;
}

/* ================================================================== */
/*  Match Summary                                                      */
/* ================================================================== */

export interface GenerateMatchSummaryParams {
  matchData: { id: string; project?: { id: string } } | null;
  seasonProjectId?: string | number;
  summaryScoreHome: number;
  summaryScoreAway: number;
  summaryGoalScorers: string;
  selectedBackgroundUrl?: string | null;
}

/* ================================================================== */
/*  Generic AI generation                                              */
/* ================================================================== */

export interface GenerateGenericAIParams {
  selectedType?: { type: string; subtype: string } | null;
  selectedTemplate?: ContentTemplate | null;
  matchData: { id: string; project?: { id: string; name: string }; opponent_project?: { id: string; name: string } } | null;
  organisationId?: string | null;
  assetType?: string | null;
}

export interface GenericAIResult {
  variants: import('./types').GeneratedVariant[];
  generatedOutput: import('./types').GeneratedOutput | null;
}

/* ================================================================== */
/*  Save variant                                                       */
/* ================================================================== */

export interface SaveVariantParams {
  variant: import('./types').GeneratedVariant;
  variantIdx: number;
  totalVariants: number;
  selectedType?: { type: string; subtype: string } | null;
  selectedTemplate?: ContentTemplate | null;
  assetType?: string | null;
  matchData: { id: string; project?: { id: string } } | null;
  organisationId?: string | null;
}

export interface SaveVariantResult {
  file_asset_id?: string;
  brand_asset_id?: string;
  media_item_id?: string;
  storage_path?: string;
}
