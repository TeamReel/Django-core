/**
 * Asset template registry — barrel that combines all template groups.
 *
 * Consumers should import from this file (backward-compatible).
 */
export type { AssetTemplate, TemplateParameter } from './assetTemplateTypes';

import { BRAND_TEMPLATES } from './assetTemplatesBrand';
import { KIT_TEMPLATES } from './assetTemplatesKit';
import { MEMBER_TEMPLATES } from './assetTemplatesMember';

export { BRAND_TEMPLATES } from './assetTemplatesBrand';
export { KIT_TEMPLATES } from './assetTemplatesKit';
export { MEMBER_TEMPLATES } from './assetTemplatesMember';

export const ASSET_TEMPLATES = [
  ...BRAND_TEMPLATES,
  ...KIT_TEMPLATES,
  ...MEMBER_TEMPLATES,
];

/** Get template by ID */
export function getTemplate(id: string) {
  return ASSET_TEMPLATES.find((t) => t.id === id);
}

/** Get templates suitable for a specific context */
export function getTemplatesForContext(context: 'club' | 'member' | 'guest') {
  if (context === 'member' || context === 'guest') {
    const memberCategories = context === 'guest'
      ? ['fullbody', 'intro', 'celebration']
      : ['fullbody', 'intro', 'celebration', 'action_photo', 'then_vs_now', 'photo_composite', 'walking_composite'];
    return ASSET_TEMPLATES.filter((t) => memberCategories.includes(t.category));
  }
  return ASSET_TEMPLATES.filter((t) =>
    !['fullbody', 'closeup', 'intro', 'celebration', 'action_photo', 'then_vs_now', 'photo_composite', 'walking_composite'].includes(t.category),
  );
}
