/**
 * entityEditTypes — shared types and constants for EntityEditModal.
 */
import { Building2, Hash, Palette, Shield, Square, Type, Users } from 'lucide-react';
import type React from 'react';

export type EntityType = 'organisation' | 'club' | 'team';

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
  file_url?: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  organisation?: string;
  project?: string;
  is_active: boolean;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
}

export interface EntityData {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
  sport_id?: string | null;
  metadata?: {
    identity?: {
      logo_url?: string;
      default_location?: string;
    };
  };
}

export interface EntityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  organisationId?: string;
  projectId?: string;
  initialEntityData?: EntityData;
  initialBrandProfile?: BrandProfile | null;
  canEditGeneral?: boolean;
  canEditBrand?: boolean;
}

export const TOKEN_TYPES = [
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'font', label: 'Typography', icon: Type },
  { value: 'spacing', label: 'Spacing', icon: Square },
  { value: 'radius', label: 'Border Radius', icon: Square },
  { value: 'other', label: 'Other', icon: Hash },
];

export const ENTITY_LABELS: Record<EntityType, { singular: string; icon: React.ElementType }> = {
  organisation: { singular: 'Organisation', icon: Building2 },
  club: { singular: 'Club', icon: Shield },
  team: { singular: 'Team', icon: Users },
};
