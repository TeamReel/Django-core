/**
 * Content generation constant data.
 *
 * Asset mapping tables, formation layouts, and content type definitions.
 */

import type { FormationPosition } from './types';

// Asset type labels
export const ASSET_TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  legacy_photo: 'Legacy Photo',
  in_tenue: 'In Tenue',
  close_up: 'Close-up',
  short_intro: 'Short Intro',
  celebration: 'Celebration',
  legacy: 'Legacy in Tenue',
};

// Asset type to media key mapping
export const ASSET_TYPE_TO_MEDIA_KEY: Record<string, string> = {
  profile_photo: 'profile_photo',
  legacy_photo: 'legacy_photo',
  in_tenue: 'in_tenue',
  'in-tenue': 'in_tenue',
  close_up: 'close_up',
  'close-up': 'close_up',
  closeup: 'close_up',
  short_intro: 'short_intro',
  celebration: 'celebration',
  legacy: 'legacy',
};

// Formation layouts for different formations
export const FORMATION_LAYOUTS: Record<string, { name: string; positions: FormationPosition[] }> = {
  '4-3-3': {
    name: '4-3-3',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (4)
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      // Midfield (3)
      { slot: 6, x: 30, y: 50, label: 'CM' },
      { slot: 7, x: 50, y: 55, label: 'CDM' },
      { slot: 8, x: 70, y: 50, label: 'CM' },
      // Attack (3)
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (4)
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      // Midfield (4)
      { slot: 6, x: 15, y: 48, label: 'LM' },
      { slot: 7, x: 38, y: 52, label: 'CM' },
      { slot: 8, x: 62, y: 52, label: 'CM' },
      { slot: 9, x: 85, y: 48, label: 'RM' },
      // Attack (2)
      { slot: 10, x: 35, y: 22, label: 'ST' },
      { slot: 11, x: 65, y: 22, label: 'ST' },
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (3)
      { slot: 2, x: 25, y: 75, label: 'CB' },
      { slot: 3, x: 50, y: 78, label: 'CB' },
      { slot: 4, x: 75, y: 75, label: 'CB' },
      // Midfield (4)
      { slot: 5, x: 15, y: 50, label: 'LWB' },
      { slot: 6, x: 38, y: 55, label: 'CM' },
      { slot: 7, x: 62, y: 55, label: 'CM' },
      { slot: 8, x: 85, y: 50, label: 'RWB' },
      // Attack (3)
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
};

// Content type definitions - organized by template_type, with items having template_subtype
// Labels match backend TemplateSubtype choices
export const CONTENT_TYPES = {
  pre_match: {
    label: 'Pre-match',
    sportRequired: true,
    items: [
      { id: 'flyer', label: 'Match Flyer', icon: 'megaphone', subtype: 'flyer' },
      { id: 'lineup', label: 'Lineup Video', icon: 'film', subtype: 'lineup' },
      { id: 'lineup_flyer', label: 'Lineup Flyer', icon: 'clipboard-list', subtype: 'lineup_flyer' },
      { id: 'match_intro', label: 'Match Intro', icon: 'video', subtype: 'match_intro' },
      { id: 'poster', label: 'Elftalfoto', icon: 'camera', subtype: 'poster' },
      { id: 'walkon', label: 'Walk-on Video', icon: 'footprints', subtype: 'walkon' },
      { id: 'anthem', label: 'Anthem Video', icon: 'music', subtype: 'anthem' },
    ],
  },
  during_match: {
    label: 'During match',
    sportRequired: true,
    items: [
      { id: 'goal', label: 'Goal Celebration', icon: 'circle-dot', subtype: 'goal' },
      { id: 'score_update', label: 'Score Update', icon: 'hash', subtype: 'score_update' },
    ],
  },
  post_match: {
    label: 'Post-match',
    sportRequired: true,
    items: [
      { id: 'end_score', label: 'Final Score', icon: 'flag', subtype: 'end_score' },
      { id: 'match_summary', label: 'Match Summary', icon: 'bar-chart', subtype: 'match_summary' },
      { id: 'highlights', label: 'Highlights Reel', icon: 'film', subtype: 'highlights' },
    ],
  },
  season: {
    label: 'Season',
    sportRequired: true,
    items: [
      { id: 'duo_portret_cover', label: 'Duo Portret Cover', icon: 'users', subtype: 'duo_portret_cover' },
      { id: 'duo_portret_overlay', label: 'Duo Portret Overlay', icon: 'users', subtype: 'duo_portret_overlay' },
      { id: 'sidebyside_cover', label: 'Then vs Now Cover', icon: 'rewind', subtype: 'sidebyside_cover' },
      { id: 'sidebyside_overlay', label: 'Then vs Now Overlay', icon: 'rewind', subtype: 'sidebyside_overlay' },
      { id: 'transformation', label: 'Transformation', icon: 'refresh-cw', subtype: 'transformation' },
      { id: 'walking_composite', label: 'Walking Composite', icon: 'footprints', subtype: 'walking_composite' },
    ],
  },
  member: {
    label: 'Member',
    sportRequired: false, // Member templates don't require sport selection
    items: [
      { id: 'member_intro', label: 'Short Intro', icon: 'hand', subtype: 'member_intro' },
      { id: 'member_goal_celebration', label: 'Goal Celebration', icon: 'circle-dot', subtype: 'member_goal_celebration' },
      { id: 'member_in_tenue', label: 'In Tenue', icon: 'shirt', subtype: 'member_in_tenue' },
      { id: 'member_action_photo', label: 'Actiefoto', icon: 'zap', subtype: 'member_action_photo' },
      { id: 'member_legacy_closeup', label: 'Legacy Closeup', icon: 'camera', subtype: 'member_legacy_closeup' },
      { id: 'member_legacy_in_tenue', label: 'Legacy In Tenue', icon: 'shirt', subtype: 'member_legacy_in_tenue' },
    ],
  },
  custom: {
    label: 'Custom',
    sportRequired: false, // Custom templates don't require sport selection
    items: [
      { id: 'custom_logo', label: 'Logo', icon: 'tag', subtype: 'custom_logo' },
      { id: 'custom_tenue', label: 'Tenue', icon: 'shirt', subtype: 'custom_tenue' },
      { id: 'custom_tenue_logo', label: 'Tenue + Logo', icon: 'sparkles', subtype: 'custom_tenue_logo' },
      { id: 'custom_tenue_logo_sponsor', label: 'Tenue + Logo + Sponsor', icon: 'trophy', subtype: 'custom_tenue_logo_sponsor' },
    ],
  },
};
