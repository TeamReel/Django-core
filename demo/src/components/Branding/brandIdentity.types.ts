import React from 'react';
import { Circle, Type, Square, Hash } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
export interface DesignToken {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string;
}

export interface BrandAsset {
  id: string;
  alt_text?: string;
  asset_type: string;
  url?: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  organisation?: string;
  project?: string;
  is_active: boolean;
  token_count: number;
  asset_count: number;
  can_edit?: boolean;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
  created_at: string;
  updated_at: string;
}

export interface BrandIdentityPageProps {
  projectId?: string;
  projectName?: string;
  organisationId?: string;
  organisationName?: string;
  seasonId?: string;
  seasonName?: string;
  onCreateProfile?: () => void;
}

// ── Constants ────────────────────────────────────────────────
export const TOKEN_TYPE_ICONS: Record<string, React.ElementType> = {
  color: Circle,
  font: Type,
  spacing: Square,
  radius: Square,
  default: Hash,
};

export const TOKEN_TYPE_LABELS: Record<string, string> = {
  color: 'Colors',
  font: 'Typography',
  spacing: 'Spacing',
  radius: 'Border Radius',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  logo: 'Logo',
  icon: 'Icon',
  favicon: 'Favicon',
  banner: 'Banner',
  background: 'Background',
  watermark: 'Watermark',
  social: 'Social Media',
};

// ── Utility Functions ────────────────────────────────────────
export const isColorValue = (value: string): boolean => {
  return /^#[0-9A-Fa-f]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value);
};

export const formatTokenKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};
