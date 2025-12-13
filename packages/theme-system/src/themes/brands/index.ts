import { defaultBrand } from './default';
import type { BrandConfig } from '../../types/brand';

/**
 * Brand configuration registry.
 * Add new brand variants here to make them available in the theme system.
 */
export const brandConfig: BrandConfig = {
  variants: {
    default: defaultBrand,
    // Future brand variants can be added here
    // Example:
    // acme: acmeBrand,
    // globex: globexBrand,
  },
  default: 'default',
};

// Re-export individual brands for convenience
export { defaultBrand };
