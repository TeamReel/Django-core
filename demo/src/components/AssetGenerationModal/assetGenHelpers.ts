// =============================================================================
// AssetGenerationModal — Types, constants, and pure helpers
// =============================================================================

/** Detect mime type from base64 signature */
export function getSecureMimeType(base64: string | null, declaredType: string | undefined | null): string {
  if (!base64) return declaredType || 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return declaredType || 'image/png';
}

/** Info about a saved asset returned from the callback */
export interface SavedAssetInfo {
  storagePath: string | null;
  assetType: string;
  presignedUrl?: string | null;
}

export interface AssetGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'club' | 'member' | 'guest';
  preSelectedTemplate?: string;
  projectId: string | number;
  organisationId: string;
  membershipId?: string;
  inputAssets?: Record<string, string | null>;
  previousResultUrl?: string | null;
  initialParams?: Record<string, string>;
  label?: string;
  onAssetSaved?: (info?: SavedAssetInfo) => void;
  requireApproval?: boolean;
  availableBackgrounds?: Array<{ url: string; label?: string }>;
}

export type ModalStep = 'template' | 'configure' | 'results';

export type FeedbackFields = {
  colors: string;
  pattern: string;
  logo: string;
  collar: string;
  other: string;
};

// =============================================================================
// Model definitions
// =============================================================================

export interface VideoModelDef {
  provider: string;
  modelId: string;
  label: string;
  desc: string;
  costLabel: string;
}

export interface ImageModelDef {
  modelId: string;
  label: string;
  desc: string;
  costLabel: string;
}

export const VIDEO_MODELS: VideoModelDef[] = [
  { provider: '', modelId: '', label: '\u{1F504} Auto', desc: 'Automatisch kiezen', costLabel: '' },
  { provider: 'minimax', modelId: 'video-01', label: '\u{1F3AC} MiniMax', desc: 'Video-01', costLabel: '$0.05/video' },
  { provider: 'minimax', modelId: 'video-01-live2d', label: '\u{1F3AC} Live2D', desc: 'MiniMax 2D\u2192Video', costLabel: '$0.05/video' },
  { provider: 'runway', modelId: 'gen4_turbo', label: '\u2708\uFE0F Gen4 Turbo', desc: 'Runway \u2014 snel', costLabel: '$0.096/s' },
  { provider: 'runway', modelId: 'gen4', label: '\u2708\uFE0F Gen4', desc: 'Runway \u2014 beter', costLabel: '$0.23/s' },
  { provider: 'pika', modelId: 'pika-2.2', label: '\u{1F3A8} Pika 2.2', desc: 'fal.ai', costLabel: '$0.05/s' },
  { provider: 'veo', modelId: 'veo-3.1-fast', label: '\u{1F310} Veo Fast', desc: 'Google Veo 3.1', costLabel: '$0.15/video' },
  { provider: 'veo', modelId: 'veo-3.1-generate', label: '\u{1F310} Veo Std', desc: 'Google Veo 3.1 HQ', costLabel: '$0.60/video' },
];

export const IMAGE_MODELS: ImageModelDef[] = [
  { modelId: '', label: '\u{1F504} Auto', desc: 'Standard model', costLabel: '~\u20AC0.04/img' },
  { modelId: 'nano-banana-pro-preview', label: '\u{1F34C} Nano Banana', desc: 'Snel & goedkoop', costLabel: '~\u20AC0.04/img' },
  { modelId: 'gemini-2.5-flash-preview-native-audio-dialog', label: '\u26A1 Gemini 2.5 Flash', desc: 'Iets beter, iets duurder', costLabel: '~\u20AC0.04/img' },
];

// =============================================================================
// Pure helpers
// =============================================================================

import type { AssetTemplate } from '../../constants/assetTemplates';

/** Determine which input key is the "primary" for source switching */
export function getPrimaryInputKey(tmpl: AssetTemplate): string | null {
  if (tmpl.inputRequirements.includes('source')) return 'source';
  if (tmpl.id === 'logo_standardize') return 'logo';
  if (tmpl.id === 'sponsor_standardize') return 'sponsor';
  if (tmpl.id === 'location_standardize') return 'location';
  if (tmpl.inputRequirements.includes('reference')) return 'reference';
  return null;
}

/** Map frontend input keys to backend expected keys */
export function mapInputKeys(inputs: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  Object.entries(inputs).forEach(([key, val]) => {
    if (key === 'person') mapped['person_photo'] = val;
    else if (key === 'reference') mapped['reference_photo'] = val;
    else mapped[key] = val;
  });
  return mapped;
}

/** Determine effective output asset type based on template, params, and context */
export function getEffectiveOutputAssetType(
  template: AssetTemplate | null,
  params: Record<string, string>,
  context: 'club' | 'member' | 'guest',
): string {
  if (!template) return 'unknown';

  if (context === 'guest') {
    if (template.id === 'fullbody_in_tenue') return 'guest_player';
    if (template.id === 'closeup_in_tenue') return 'guest_player_closeup';
    if (template.id === 'member_intro') return 'guest_player_intro';
    if (template.id === 'member_goal_celebration') return 'guest_player_celebration';
    return 'guest_player';
  }

  let effectiveType = template.outputAssetType;
  if (template.id === 'tenue_generate') {
    if (params['kit_type'] === 'away') effectiveType = 'kit_away';
    else if (params['kit_type'] === 'third') effectiveType = 'kit_third';
    else effectiveType = 'kit_home';
  } else if (template.id === 'fullbody_in_tenue') {
    effectiveType = `member_in_tenue_${params['kit_type'] || 'home'}`;
  } else if (template.id === 'closeup_in_tenue') {
    effectiveType = `member_closeup_${params['kit_type'] || 'home'}`;
  } else if (template.id === 'member_action_photo') {
    effectiveType = `action_photo_${params['kit_type'] || 'home'}_${params['style_variant'] || 'dribbling'}`;
  }
  return effectiveType;
}

/** Estimate generation cost */
export function estimateCost(
  isVideo: boolean,
  selectedModel: string,
  variantCount: number,
): string {
  if (isVideo) {
    const sel = VIDEO_MODELS.find(m => m.modelId === selectedModel);
    if (!sel || !sel.costLabel) return '';
    const match = sel.costLabel.match(/\$([\d.]+)\/(video|s)/);
    if (!match) return '';
    const rate = parseFloat(match[1]);
    const unit = match[2];
    const dur = unit === 's' ? 5 : 1;
    const totalUsd = rate * dur * variantCount;
    const totalEur = totalUsd * 0.92;
    return `~\u20AC${totalEur.toFixed(2)} (${variantCount} variant${variantCount > 1 ? 'en' : ''})`;
  }
  const rateMap: Record<string, number> = {
    '': 0.04,
    'nano-banana-pro-preview': 0.04,
    'gemini-2.5-flash-preview-native-audio-dialog': 0.043,
  };
  const rate = rateMap[selectedModel] ?? 0.04;
  const total = rate * variantCount;
  return `~\u20AC${total.toFixed(2)} (${variantCount} variant${variantCount > 1 ? 'en' : ''})`;
}

/** Step titles for the modal header */
export function getStepTitle(modalStep: ModalStep, generationStep: string, requireApproval: boolean): string {
  const titles: Record<ModalStep, string> = {
    template: 'Stap 1 \u2014 Kies type',
    configure: 'Stap 2 \u2014 Instellingen',
    results: generationStep === 'queued' ? 'In de wachtrij gezet \u2705'
      : generationStep === 'polling' ? 'Video wordt gegenereerd...'
      : 'Stap 3 \u2014 Resultaten',
  };
  return titles[modalStep];
}

/** Composite template IDs that need a background selector */
export const COMPOSITE_TEMPLATE_IDS = ['photo_composite_gemini', 'walking_composite_far', 'walking_composite_near'];

/** Shoe color options for fullbody_in_tenue */
export const SHOE_COLOR_OPTIONS = [
  { value: 'zwart', label: '\u26AB Zwart' },
  { value: 'wit', label: '\u26AA Wit' },
  { value: 'rood', label: '\u{1F534} Rood' },
  { value: 'blauw', label: '\u{1F535} Blauw' },
  { value: 'geel', label: '\u{1F7E1} Geel' },
  { value: 'oranje', label: '\u{1F7E0} Oranje' },
  { value: 'groen', label: '\u{1F7E2} Groen' },
  { value: 'roze', label: '\u{1FA77} Roze' },
];
