/**
 * Member-focused asset templates (photos, videos, composites, action shots).
 *
 * Split into sub-files by category for maintainability:
 *   - memberTemplatesPhotoIntro.ts  (fullbody, closeup, intro, celebration)
 *   - memberTemplatesCompositeAction.ts  (then_vs_now, composites, walking, action)
 */
import type { AssetTemplate } from './assetTemplateTypes';
import { MEMBER_TEMPLATES_PHOTO_INTRO } from './memberTemplatesPhotoIntro';
import { MEMBER_TEMPLATES_COMPOSITE_ACTION } from './memberTemplatesCompositeAction';

export const MEMBER_TEMPLATES: AssetTemplate[] = [
  ...MEMBER_TEMPLATES_PHOTO_INTRO,
  ...MEMBER_TEMPLATES_COMPOSITE_ACTION,
];
