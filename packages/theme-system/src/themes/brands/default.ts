import type { BrandVariantDefinition } from '../../types/brand';

/**
 * Default brand variant - Django Core theme with no customizations.
 * Serves as the reference implementation for all brand variants.
 */
export const defaultBrand: BrandVariantDefinition = {
  id: 'default',
  name: 'Django Core Default',
  overrides: {}, // No overrides - uses light/dark themes as-is
};
