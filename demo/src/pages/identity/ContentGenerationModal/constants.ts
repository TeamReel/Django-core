/**
 * ContentGenerationModal — Constants
 */
import type { FormationPosition } from './types';

// Asset type labels
export const ASSET_TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Profielfoto',
  legacy_photo: 'Legacy Foto',
  in_tenue: 'In Tenue',
  close_up: 'Close-up',
  short_intro: 'Korte Intro',
  celebration: 'Viering',
  legacy: 'Legacy in Tenue',
};

// Content type definitions — organized by template_type
export const CONTENT_TYPES = {
  pre_match: {
    label: 'Voor de wedstrijd',
    sportRequired: true,
    items: [
      { id: 'flyer', label: 'Wedstrijd Flyer', icon: 'MF', subtype: 'flyer' },
      { id: 'lineup', label: 'Lineup Video', icon: 'LV', subtype: 'lineup' },
      { id: 'lineup_flyer', label: 'Lineup Flyer', icon: 'LF', subtype: 'lineup_flyer' },
      { id: 'match_intro', label: 'Wedstrijd Intro', icon: 'MI', subtype: 'match_intro' },
      { id: 'poster', label: 'Elftalfoto', icon: 'EF', subtype: 'poster' },
      { id: 'walkon', label: 'Walk-on Video', icon: 'WO', subtype: 'walkon' },
      { id: 'anthem', label: 'Anthem Video', icon: 'AV', subtype: 'anthem' },
    ],
  },
  during_match: {
    label: 'Tijdens de wedstrijd',
    sportRequired: true,
    items: [
      { id: 'goal', label: 'Doelpunt Viering', icon: 'GC', subtype: 'goal' },
      { id: 'score_update', label: 'Stand Update', icon: 'SU', subtype: 'score_update' },
    ],
  },
  post_match: {
    label: 'Na de wedstrijd',
    sportRequired: true,
    items: [
      { id: 'end_score', label: 'Eindstand', icon: 'FS', subtype: 'end_score' },
      { id: 'match_summary', label: 'Wedstrijd Samenvatting', icon: 'MS', subtype: 'match_summary' },
      { id: 'highlights', label: 'Hoogtepunten', icon: 'HR', subtype: 'highlights' },
    ],
  },
  season: {
    label: 'Seizoen',
    sportRequired: true,
    items: [
      { id: 'duo_portret_cover', label: 'Duo Portret Cover', icon: 'DC', subtype: 'duo_portret_cover' },
      { id: 'duo_portret_overlay', label: 'Duo Portret Overlay', icon: 'DO', subtype: 'duo_portret_overlay' },
      { id: 'sidebyside_cover', label: 'Toen vs Nu Cover', icon: 'TC', subtype: 'sidebyside_cover' },
      { id: 'sidebyside_overlay', label: 'Toen vs Nu Overlay', icon: 'TO', subtype: 'sidebyside_overlay' },
      { id: 'transformation', label: 'Transformatie', icon: 'TF', subtype: 'transformation' },
      { id: 'walking_composite', label: 'Walking Composite', icon: 'WC', subtype: 'walking_composite' },
    ],
  },
  member: {
    label: 'Leden',
    sportRequired: false,
    items: [
      { id: 'member_intro', label: 'Korte Intro', icon: 'SI', subtype: 'member_intro' },
      { id: 'member_goal_celebration', label: 'Doelpunt Viering', icon: 'GC', subtype: 'member_goal_celebration' },
      { id: 'member_in_tenue', label: 'In Tenue', icon: 'IT', subtype: 'member_in_tenue' },
      { id: 'member_action_photo', label: 'Actiefoto', icon: 'AF', subtype: 'member_action_photo' },
      { id: 'member_legacy_closeup', label: 'Legacy Close-up', icon: 'LC', subtype: 'member_legacy_closeup' },
      { id: 'member_legacy_in_tenue', label: 'Legacy In Tenue', icon: 'LT', subtype: 'member_legacy_in_tenue' },
    ],
  },
  custom: {
    label: 'Aangepast',
    sportRequired: false,
    items: [
      { id: 'custom_logo', label: 'Logo', icon: 'LG', subtype: 'custom_logo' },
      { id: 'custom_tenue', label: 'Tenue', icon: 'TN', subtype: 'custom_tenue' },
      { id: 'custom_tenue_logo', label: 'Tenue + Logo', icon: 'TL', subtype: 'custom_tenue_logo' },
      { id: 'custom_tenue_logo_sponsor', label: 'Tenue + Logo + Sponsor', icon: 'TS', subtype: 'custom_tenue_logo_sponsor' },
    ],
  },
};

// Map template asset_types to teamreel_assets media slot keys
export const ASSET_TYPE_TO_MEDIA_KEY: Record<string, string> = {
  'profile_photo': 'profile',
  'in_tenue': 'kit',
  'close_up': 'closeup',
  'short_intro': 'intro',
  'celebration': 'celebration',
  'legacy_photo': 'legacy_photo',
  'legacy': 'legacy',
  'full_body': 'kit',
  'closeup': 'closeup',
};

// Formation position layout data
export const FORMATION_LAYOUTS: Record<string, { name: string; positions: FormationPosition[] }> = {
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { slot: 1, x: 50, y: 90, label: 'GK' },
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      { slot: 6, x: 30, y: 50, label: 'CM' },
      { slot: 7, x: 50, y: 55, label: 'CDM' },
      { slot: 8, x: 70, y: 50, label: 'CM' },
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { slot: 1, x: 50, y: 90, label: 'GK' },
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      { slot: 6, x: 15, y: 48, label: 'LM' },
      { slot: 7, x: 38, y: 52, label: 'CM' },
      { slot: 8, x: 62, y: 52, label: 'CM' },
      { slot: 9, x: 85, y: 48, label: 'RM' },
      { slot: 10, x: 35, y: 22, label: 'ST' },
      { slot: 11, x: 65, y: 22, label: 'ST' },
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    positions: [
      { slot: 1, x: 50, y: 90, label: 'GK' },
      { slot: 2, x: 25, y: 75, label: 'CB' },
      { slot: 3, x: 50, y: 78, label: 'CB' },
      { slot: 4, x: 75, y: 75, label: 'CB' },
      { slot: 5, x: 15, y: 50, label: 'LWB' },
      { slot: 6, x: 38, y: 55, label: 'CM' },
      { slot: 7, x: 62, y: 55, label: 'CM' },
      { slot: 8, x: 85, y: 50, label: 'RWB' },
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
};
