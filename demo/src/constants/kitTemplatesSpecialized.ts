/**
 * Kit templates — specialized outfits (keeper, tracksuit, coach).
 */
import type { AssetTemplate } from './assetTemplateTypes';

export const KIT_TEMPLATES_SPECIALIZED: AssetTemplate[] = [
  {
    id: 'keeper_tenue',
    name: 'Keeperstenue',
    icon: 'shield',
    category: 'keeper',
    description: 'Genereer een keeperstenue in contrasterende kleuren.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'kit_goalkeeper',
    creditsCost: 1,
    parameters: {
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'long', label: 'Lang' },
          { value: 'short', label: 'Kort' },
        ],
        default: 'long',
      },
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
    icon: 'activity',
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
    id: 'coach_outfit',
    name: 'Coach Outfit',
    icon: 'briefcase',
    category: 'coach',
    description: 'Genereer een coach/trainer outfit: net pak, sweater, coltrui, polo of windbreaker.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'kit_coach',
    creditsCost: 1,
    parameters: {
      outfit_style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'net_pak', label: 'Net Pak (Formeel)' },
          { value: 'trainings_sweater', label: 'Trainings Sweater' },
          { value: 'coltrui', label: 'Coltrui' },
          { value: 'polo', label: 'Polo' },
          { value: 'windbreaker', label: 'Windbreaker' },
        ],
        default: 'net_pak',
      },
      outfit_color: {
        label: 'Hoofdkleur',
        type: 'select',
        options: [
          { value: 'team_primary', label: 'Teamkleur (Primair)' },
          { value: 'black', label: 'Zwart' },
          { value: 'navy', label: 'Navy' },
          { value: 'charcoal', label: 'Antraciet' },
          { value: 'grey', label: 'Grijs' },
          { value: 'team_secondary', label: 'Teamkleur (Secundair)' },
        ],
        default: 'black',
      },
      accent_color: {
        label: 'Accentkleur',
        type: 'select',
        options: [
          { value: 'team_secondary', label: 'Teamkleur (Secundair)' },
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'gold', label: 'Goud' },
          { value: 'silver', label: 'Zilver' },
        ],
        default: 'team_secondary',
      },
    },
  },
];
