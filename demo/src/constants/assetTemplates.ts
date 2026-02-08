/**
 * Asset Generation Templates — Frontend mirror of teamreel_prompts.py
 *
 * Defines the available AI generation templates with their
 * user-facing labels, parameter options, and input requirements.
 */

// ============================================================================
// Types
// ============================================================================

export interface TemplateParameter {
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
  default: string;
}

export interface AssetTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  inputRequirements: string[];
  parameters: Record<string, TemplateParameter>;
  /** Which brand asset types are needed as input */
  requiredAssetTypes: string[];
  /** Which brand asset type the result saves as */
  outputAssetType: string;
  /** Credits cost per variant */
  creditsCost: number;
}

// ============================================================================
// Template Definitions
// ============================================================================

export const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    id: 'logo_standardize',
    name: 'Logo Standaardiseren',
    icon: '🏛️',
    category: 'logo',
    description: 'Zet een clublogo om naar vierkant formaat met transparante achtergrond.',
    inputRequirements: ['logo'],
    requiredAssetTypes: ['logo_upload'],
    outputAssetType: 'logo_light',
    creditsCost: 1,
    parameters: {
      background: {
        label: 'Achtergrond',
        type: 'select',
        options: [
          { value: 'transparent', label: 'Transparant' },
          { value: 'white', label: 'Wit' },
          { value: 'light_grey', label: 'Lichtgrijs' },
        ],
        default: 'transparent',
      },
      style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'original', label: 'Origineel' },
          { value: 'clean_vector', label: 'Clean Vector' },
          { value: 'minimalist', label: 'Minimalistisch' },
        ],
        default: 'original',
      },
    },
  },
  {
    id: 'sponsor_standardize',
    name: 'Sponsor Standaardiseren',
    icon: '💼',
    category: 'sponsor',
    description: 'Zet een sponsorlogo om naar standaard formaat met transparante achtergrond.',
    inputRequirements: ['sponsor'],
    requiredAssetTypes: ['sponsor_logo_upload'],
    outputAssetType: 'sponsor_logo',
    creditsCost: 1,
    parameters: {
      background: {
        label: 'Achtergrond',
        type: 'select',
        options: [
          { value: 'transparent', label: 'Transparant' },
          { value: 'white', label: 'Wit' },
        ],
        default: 'transparent',
      },
      orientation: {
        label: 'Oriëntatie',
        type: 'select',
        options: [
          { value: 'landscape', label: 'Liggend' },
          { value: 'square', label: 'Vierkant' },
        ],
        default: 'landscape',
      },
    },
  },
  {
    id: 'tenue_generate',
    name: 'Tenue Genereren',
    icon: '👕',
    category: 'tenue',
    description: 'Genereer een realistisch voetbaltenue met logo en sponsor.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'kit_home',
    creditsCost: 1,
    parameters: {
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'short', label: 'Kort' },
          { value: 'long', label: 'Lang' },
        ],
        default: 'short',
      },
      neck: {
        label: 'Hals',
        type: 'select',
        options: [
          { value: 'round', label: 'Ronde kraag' },
          { value: 'collar', label: 'Polo kraag' },
          { value: 'v_neck', label: 'V-hals' },
        ],
        default: 'round',
      },
      kit_type: {
        label: 'Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuis' },
          { value: 'away', label: 'Uit' },
          { value: 'third', label: 'Derde' },
        ],
        default: 'home',
      },
    },
  },
  {
    id: 'keeper_tenue',
    name: 'Keeperstenue',
    icon: '🧤',
    category: 'keeper',
    description: 'Genereer een keeperstenue in contrasterende kleuren.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'kit_goalkeeper',
    creditsCost: 1,
    parameters: {
      keeper_color: {
        label: 'Kleur',
        type: 'select',
        options: [
          { value: 'neon_green', label: 'Neon Groen' },
          { value: 'neon_orange', label: 'Neon Oranje' },
          { value: 'purple', label: 'Paars' },
          { value: 'neon_yellow', label: 'Neon Geel' },
          { value: 'pink', label: 'Roze' },
        ],
        default: 'neon_green',
      },
      neck: {
        label: 'Hals',
        type: 'select',
        options: [
          { value: 'round', label: 'Ronde kraag' },
          { value: 'collar', label: 'Polo kraag' },
          { value: 'v_neck', label: 'V-hals' },
        ],
        default: 'round',
      },
    },
  },
  {
    id: 'tracksuit_generate',
    name: 'Trainingspak',
    icon: '🏃',
    category: 'tracksuit',
    description: 'Genereer een trainingspak met clublogo.',
    inputRequirements: ['logo', 'reference'],
    requiredAssetTypes: ['logo_upload'],
    outputAssetType: 'kit_training',
    creditsCost: 1,
    parameters: {
      style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'modern_slim', label: 'Modern Slim' },
          { value: 'classic', label: 'Klassiek' },
          { value: 'windbreaker', label: 'Windbreaker' },
        ],
        default: 'modern_slim',
      },
      color_scheme: {
        label: 'Kleurschema',
        type: 'select',
        options: [
          { value: 'team_colors', label: 'Clubkleuren' },
          { value: 'black_accent', label: 'Zwart + accent' },
          { value: 'navy_accent', label: 'Navy + accent' },
        ],
        default: 'team_colors',
      },
    },
  },
  {
    id: 'fullbody_in_tenue',
    name: 'Speler Fullbody',
    icon: '🧑‍🤝‍🧑',
    category: 'fullbody',
    description: 'Plaats een persoon in het volledige tenue (transparante achtergrond).',
    inputRequirements: ['person', 'logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'member_in_tenue',
    creditsCost: 2,
    parameters: {
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'short', label: 'Kort' },
          { value: 'long', label: 'Lang' },
        ],
        default: 'short',
      },
      pose: {
        label: 'Pose',
        type: 'select',
        options: [
          { value: 'standing_front', label: 'Staand (vooraan)' },
          { value: 'standing_arms_crossed', label: 'Armen gekruist' },
          { value: 'action_running', label: 'Rennend' },
          { value: 'ball_at_feet', label: 'Bal aan voet' },
        ],
        default: 'standing_front',
      },
      role: {
        label: 'Rol',
        type: 'select',
        options: [
          { value: 'player', label: 'Speler' },
          { value: 'goalkeeper', label: 'Keeper' },
        ],
        default: 'player',
      },
    },
  },
  {
    id: 'closeup_in_tenue',
    name: 'Speler Close-up',
    icon: '📸',
    category: 'closeup',
    description: 'Close-up portret in tenue (transparante achtergrond).',
    inputRequirements: ['person', 'logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'member_closeup',
    creditsCost: 2,
    parameters: {
      neck: {
        label: 'Hals',
        type: 'select',
        options: [
          { value: 'round', label: 'Ronde kraag' },
          { value: 'collar', label: 'Polo kraag' },
          { value: 'v_neck', label: 'V-hals' },
        ],
        default: 'round',
      },
      expression: {
        label: 'Uitdrukking',
        type: 'select',
        options: [
          { value: 'neutral_confident', label: 'Neutraal' },
          { value: 'smiling', label: 'Glimlachend' },
          { value: 'intense', label: 'Intens' },
        ],
        default: 'neutral_confident',
      },
    },
  },
];

/** Get template by ID */
export function getTemplate(id: string): AssetTemplate | undefined {
  return ASSET_TEMPLATES.find((t) => t.id === id);
}

/** Get templates suitable for a specific context */
export function getTemplatesForContext(context: 'club' | 'member'): AssetTemplate[] {
  if (context === 'member') {
    return ASSET_TEMPLATES.filter((t) => ['fullbody', 'closeup'].includes(t.category));
  }
  return ASSET_TEMPLATES.filter((t) => !['fullbody', 'closeup'].includes(t.category));
}
