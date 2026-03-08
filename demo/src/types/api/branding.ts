/**
 * Branding types — BrandProfile, DesignToken, BrandAsset.
 * Mirrors: src/branding/serializers.py
 */

import type { FileRef } from './common';

/* ------------------------------------------------------------------ */
/*  Design Token                                                       */
/* ------------------------------------------------------------------ */

/** Single design token (DesignTokenSerializer). */
export interface DesignToken {
  id: number;
  profile: number;
  key: string;
  value: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Brand Asset                                                        */
/* ------------------------------------------------------------------ */

/** Brand asset (BrandAssetSerializer). */
export interface BrandAsset {
  id: number;
  profile: number;
  file: string;            // UUID FK
  asset_type: string;
  label: string;
  alt_text: string;
  is_active: boolean;
  file_details: Pick<FileRef, 'id' | 'name' | 'size' | 'content_type'> | null;
  url: string | null;
  profile_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_type: 'club' | 'team' | null;
  parent_project_id: string | null;
  organisation_name: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Brand Profile                                                      */
/* ------------------------------------------------------------------ */

/** Brand profile list shape (BrandProfileSerializer). */
export interface BrandProfile {
  id: number;
  organisation: string;        // UUID FK
  organisation_name: string | null;
  project: number;             // int FK
  project_name: string | null;
  project_type: 'club' | 'team' | null;
  parent_project_id: number | null;
  name: string;
  is_active: boolean;
  token_count: number;
  asset_count: number;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/** Brand profile detail shape (BrandProfileDetailSerializer). */
export interface BrandProfileDetail extends BrandProfile {
  tokens: DesignToken[];
  assets: BrandAsset[];
}
