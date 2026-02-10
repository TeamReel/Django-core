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
  /** Only show this parameter if another parameter has a specific value */
  visibleIf?: {
    param: string;
    /** Show if param value is one of these */
    includes?: string[];
    /** Show if param value is NOT one of these */
    excludes?: string[];
  };
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
  /** Output type: 'image' (default) or 'video' */
  outputType?: 'image' | 'video';
  /** Video configuration (only for video templates) */
  videoConfig?: {
    durationSeconds: number;
    aspectRatio: string;
    resolution: string;
  };
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
      shirt_base: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Shirt Kleur',
        type: 'select',
        options: [
          { value: 'auto_home', label: 'Auto (Thuis kleuren)' },
          { value: 'auto_away_contrast', label: 'Contrast (Uit)' },
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'red', label: 'Rood' },
          { value: 'blue', label: 'Blauw' },
          { value: 'green', label: 'Groen' },
          { value: 'yellow', label: 'Geel' },
          { value: 'orange', label: 'Oranje' },
          { value: 'purple', label: 'Paars' },
          { value: 'navy', label: 'Navy' },
          { value: 'maroon', label: 'Roodbruin' },
          { value: 'sky_blue', label: 'Lichtblauw' },
        ],
        default: 'auto_home',
      },
      pattern_style: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Patroon',
        type: 'select',
        options: [
          { value: 'solid', label: 'Effen' },
          { value: 'vertical_stripes', label: 'Verticale Strepen' },
          { value: 'horizontal_hoops', label: 'Horizontale Banen' },
          { value: 'diagonal_sash', label: 'Diagonale baan' },
          { value: 'half_half', label: 'Half/Half' },
          { value: 'pinstripes', label: 'Pinstripes' },
          { value: 'subtle_graphic', label: 'Subtiele Graphic' },
        ],
        default: 'solid',
      },
      shorts_style: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Broek Kleur',
        type: 'select',
        options: [
          { value: 'match_shirt', label: 'Gelijk aan shirt' },
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'navy', label: 'Navy' },
          { value: 'contrast', label: 'Contrast' },
        ],
        default: 'match_shirt',
      },
      socks_style: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Sokken Kleur',
        type: 'select',
        options: [
          { value: 'match_shirt', label: 'Gelijk aan shirt' },
          { value: 'match_shorts', label: 'Gelijk aan broek' },
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'contrast', label: 'Contrast' },
        ],
        default: 'match_shirt',
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
          { value: 'black', label: 'Zwart' },
          { value: 'red', label: 'Rood' },
          { value: 'blue', label: 'Blauw' },
          { value: 'grey', label: 'Grijs' },
        ],
        default: 'neon_green',
      },
      pattern_style: {
        label: 'Patroon',
        type: 'select',
        options: [
          { value: 'solid', label: 'Effen' },
          { value: 'graphic_print', label: 'Graphic Print' },
          { value: 'camo', label: 'Camo' },
          { value: 'geometric', label: 'Geometrisch' },
          { value: 'gradient', label: 'Gradient' },
        ],
        default: 'solid',
      },
      shorts_style: {
        label: 'Broek Kleur',
        type: 'select',
        options: [
          { value: 'match_shirt', label: 'Gelijk aan shirt' },
          { value: 'black', label: 'Zwart' },
          { value: 'contrast', label: 'Contrast' },
        ],
        default: 'match_shirt',
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
          { value: 'hoodie', label: 'Hoodie Set' },
        ],
        default: 'modern_slim',
      },
      tracksuit_color: {
        label: 'Hoofdkleur',
        type: 'select',
        options: [
          { value: 'team_primary', label: 'Teamkleur (Primair)' },
          { value: 'black', label: 'Zwart' },
          { value: 'navy', label: 'Navy' },
          { value: 'grey', label: 'Grijs' },
          { value: 'team_secondary', label: 'Teamkleur (Secundair)' },
          { value: 'red', label: 'Rood' },
          { value: 'blue', label: 'Blauw' },
        ],
        default: 'team_primary',
      },
      accent_color: {
        label: 'Accentkleur',
        type: 'select',
        options: [
          { value: 'team_secondary', label: 'Teamkleur (Secundair)' },
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'neon', label: 'Neon' },
          { value: 'gold', label: 'Goud' },
          { value: 'silver', label: 'Zilver' },
        ],
        default: 'team_secondary',
      },
    },
  },
  {
    id: 'fullbody_in_tenue',
    name: 'Speler Fullbody',
    icon: '🧑‍🤝‍🧑',
    category: 'fullbody',
    description: 'Plaats een persoon in het geselecteerde tenue (transparante achtergrond). Het tenue wordt EXACT overgenomen.',
    inputRequirements: ['person', 'reference'],
    requiredAssetTypes: [],
    outputAssetType: 'member_in_tenue', // Will be suffixed with kit_type (e.g., member_in_tenue_home)
    creditsCost: 2,
    parameters: {
      kit_type: {
        label: 'Tenue Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuistenue' },
          { value: 'away', label: 'Uittenue' },
          { value: 'third', label: 'Derde tenue' },
          { value: 'goalkeeper', label: 'Keeperstenue' },
          { value: 'training', label: 'Trainingstenue' },
        ],
        default: 'home',
      },
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
    description: 'Close-up portret in het geselecteerde tenue (transparante achtergrond). Het tenue wordt EXACT overgenomen.',
    inputRequirements: ['person', 'reference'],
    requiredAssetTypes: [],
    outputAssetType: 'member_closeup', // Will be suffixed with kit_type (e.g., member_closeup_home)
    creditsCost: 2,
    parameters: {
      kit_type: {
        label: 'Tenue Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuistenue' },
          { value: 'away', label: 'Uittenue' },
          { value: 'third', label: 'Derde tenue' },
          { value: 'goalkeeper', label: 'Keeperstenue' },
          { value: 'training', label: 'Trainingstenue' },
        ],
        default: 'home',
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
  // ============================================================================
  // Short Intro Templates (VIDEO - requires player in tenue as input)
  // ============================================================================
  {
    id: 'member_intro',
    name: 'Short Intro Video',
    icon: '🎬',
    category: 'intro',
    description: 'Korte intro video (5-6 sec) van de speler in verschillende poses. Vereist een "Player in Tenue" als input.',
    inputRequirements: ['person'], // person = player in tenue image
    requiredAssetTypes: [],
    outputAssetType: 'member_intro', // Will be suffixed with kit_type and style
    creditsCost: 5,
    outputType: 'video',
    videoConfig: {
      durationSeconds: 6,
      aspectRatio: '9:16',
      resolution: '720p',
    },
    parameters: {
      kit_type: {
        label: 'Tenue Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuistenue' },
          { value: 'away', label: 'Uittenue' },
          { value: 'third', label: 'Derde tenue' },
          { value: 'goalkeeper', label: 'Keeperstenue' },
        ],
        default: 'home',
      },
      style_variant: {
        label: 'Pose Stijl',
        type: 'select',
        options: [
          { value: 'arms_crossed', label: '🙅 Armen over elkaar' },
          { value: 'hand_up', label: '✋ Hand omhoog' },
          { value: 'thumbs_up', label: '👍 Duim omhoog' },
        ],
        default: 'arms_crossed',
      },
    },
  },
  // ============================================================================
  // Goal Celebration Templates (VIDEO - requires player in tenue as input)
  // ============================================================================
  {
    id: 'member_goal_celebration',
    name: 'Goal Celebration Video',
    icon: '🎉',
    category: 'celebration',
    description: 'Korte goal viering video (5-6 sec) van de speler. Vereist een "Player in Tenue" als input.',
    inputRequirements: ['person'], // person = player in tenue image
    requiredAssetTypes: [],
    outputAssetType: 'member_goal_celebration', // Will be suffixed with kit_type and style
    creditsCost: 5,
    outputType: 'video',
    videoConfig: {
      durationSeconds: 6,
      aspectRatio: '9:16',
      resolution: '720p',
    },
    parameters: {
      kit_type: {
        label: 'Tenue Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuistenue' },
          { value: 'away', label: 'Uittenue' },
          { value: 'third', label: 'Derde tenue' },
          { value: 'goalkeeper', label: 'Keeperstenue' },
        ],
        default: 'home',
      },
      style_variant: {
        label: 'Viering Stijl',
        type: 'select',
        options: [
          { value: 'arms_wide', label: '🙌 Armen wijd' },
          { value: 'fist_pump', label: '✊ Vuist omhoog' },
          { value: 'point_to_sky', label: '☝️ Wijs naar hemel' },
          { value: 'slide', label: '🛝 Knieën slide' },
        ],
        default: 'arms_wide',
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
    return ASSET_TEMPLATES.filter((t) => ['fullbody', 'closeup', 'intro', 'celebration'].includes(t.category));
  }
  return ASSET_TEMPLATES.filter((t) => !['fullbody', 'closeup', 'intro', 'celebration'].includes(t.category));
}
