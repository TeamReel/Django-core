/**
 * Kit/outfit asset templates (tenue, legacy, keeper, tracksuit, coach).
 *
 * Split into sub-files by category:
 *   - kitTemplatesTenue.ts  (home/away/third + legacy)
 *   - kitTemplatesSpecialized.ts  (keeper, tracksuit, coach)
 */
import type { AssetTemplate } from './assetTemplateTypes';
import { KIT_TEMPLATES_TENUE } from './kitTemplatesTenue';
import { KIT_TEMPLATES_SPECIALIZED } from './kitTemplatesSpecialized';

export const KIT_TEMPLATES: AssetTemplate[] = [
  ...KIT_TEMPLATES_TENUE,
  ...KIT_TEMPLATES_SPECIALIZED,
];
