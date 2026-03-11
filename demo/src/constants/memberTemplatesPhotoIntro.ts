/**
 * Member templates — photo & intro categories (fullbody, closeup, intro, celebration).
 */
import type { AssetTemplate } from './assetTemplateTypes';

export const MEMBER_TEMPLATES_PHOTO_INTRO: AssetTemplate[] = [
  // ── Player photos ──
  {
    id: 'fullbody_in_tenue',
    name: 'Speler Fullbody',
    icon: 'shirt',
    category: 'fullbody',
    description: 'Plaats een persoon in het geselecteerde tenue (transparante achtergrond). Het tenue wordt EXACT overgenomen.',
    inputRequirements: ['person', 'reference'],
    requiredAssetTypes: [],
    outputAssetType: 'member_in_tenue',
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
          { value: 'coach', label: 'Trainerspak' },
          { value: 'assistant', label: 'Assistentpak' },
          { value: 'training', label: 'Trainingstenue' },
          { value: 'legacy', label: 'Legacy Tenue' },
        ],
        default: 'home',
      },
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'long', label: 'Lang' },
          { value: 'short', label: 'Kort' },
        ],
        default: 'long',
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
          { value: 'coach', label: 'Trainer' },
          { value: 'assistant', label: 'Assistent' },
        ],
        default: 'player',
      },
    },
  },
  {
    id: 'closeup_in_tenue',
    name: 'Speler Close-up',
    icon: 'camera',
    category: 'closeup',
    description: 'Close-up portret in het geselecteerde tenue (transparante achtergrond). Het tenue wordt EXACT overgenomen.',
    inputRequirements: ['person', 'reference'],
    requiredAssetTypes: [],
    outputAssetType: 'member_closeup',
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
          { value: 'coach', label: 'Trainerspak' },
          { value: 'assistant', label: 'Assistentpak' },
          { value: 'training', label: 'Trainingstenue' },
          { value: 'legacy', label: 'Legacy Tenue' },
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
  // ── Short Intro Videos ──
  {
    id: 'member_intro',
    name: 'Short Intro Video',
    icon: 'clapperboard',
    category: 'intro',
    description: 'Korte intro video (5-6 sec) van de speler in verschillende poses. Vereist een "Player in Tenue" als input.',
    inputRequirements: ['person'],
    requiredAssetTypes: [],
    outputAssetType: 'member_intro',
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
          { value: 'arms_crossed', label: 'Armen over elkaar' },
          { value: 'hand_up', label: 'Hand omhoog' },
          { value: 'thumbs_up', label: 'Duim omhoog' },
        ],
        default: 'arms_crossed',
      },
    },
  },
  // ── Goal Celebration Videos ──
  {
    id: 'member_goal_celebration',
    name: 'Goal Celebration Video',
    icon: 'party-popper',
    category: 'celebration',
    description: 'Korte goal viering video (5-6 sec) van de speler. Vereist een "Player in Tenue" als input.',
    inputRequirements: ['person'],
    requiredAssetTypes: [],
    outputAssetType: 'member_goal_celebration',
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
          { value: 'arms_wide', label: 'Armen wijd' },
          { value: 'fist_pump', label: 'Vuist omhoog' },
          { value: 'point_to_sky', label: 'Wijs naar hemel' },
          { value: 'slide', label: 'Knieën slide' },
        ],
        default: 'arms_wide',
      },
    },
  },
];
