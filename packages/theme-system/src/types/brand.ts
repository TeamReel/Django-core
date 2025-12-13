import type { themeVars } from '../themes/contract.css';

/**
 * Brand variant identifier
 * - 'default': Core Django theme with no customizations
 * - Custom brands: Organization-specific theme overrides
 */
export type BrandVariant = 'default' | string;

/**
 * Type representing the full theme token structure.
 * Auto-generated from vanilla-extract theme contract.
 */
export type ThemeTokenMap = typeof themeVars;

/**
 * Brand variant definition with hierarchical overrides.
 * Allows partial token customization while inheriting from base theme.
 */
export interface BrandVariantDefinition {
  /** Unique brand identifier */
  id: BrandVariant;
  /** Display name for UI selection */
  name: string;
  /** Partial token overrides (only customize what's needed) */
  overrides: Partial<ThemeTokenMap>;
}

/**
 * Complete brand configuration with all available variants.
 */
export interface BrandConfig {
  /** Map of brand ID to variant definition */
  variants: Record<BrandVariant, BrandVariantDefinition>;
  /** Default brand variant to use */
  default: BrandVariant;
}
