// ============================================================================
// Types
// ============================================================================

export interface InputRequirements {
  players?: {
    source?: string;
    formation?: string;
    count?: number;
    use_formation?: boolean;
    min_count?: number;
    max_count?: number;
    positions?: Array<{
      slot: number;
      position: string;
      functional_role: string;
      label: string;
    }>;
    member_fields?: string[];
    required_assets?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  };
  staff?: {
    source?: string;
    members?: Array<{
      role: string;
      functional_role: string;
      label: string;
      required: boolean;
    }>;
    member_fields?: string[];
    required_assets?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  } | Array<{
    role: string;
    required: boolean;
    count: number;
  }>;
  assets?: Array<{
    type: string;
    required: boolean;
  }>;
  organisation_assets?: {
    source?: string;
    required?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
    optional?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  };
  match_data?: {
    source?: string;
    required?: string[];
    optional?: string[];
  };
  output?: {
    type: string;
    format: string;
    dimensions?: {
      width: number;
      height: number;
      aspect_ratio: string;
    };
    duration_seconds?: number;
    fps?: number;
  };
}

export interface FormationDetail {
  id: number;
  code: string;
  name: string;
}

export interface SportDetail {
  id: number;
  name: string;
  slug: string;
}

export interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  sport_type: string | null;
  sport: number | null;
  sport_detail: SportDetail | null;
  formation: number | null;
  formation_detail: FormationDetail | null;
  style_variant: string | null;
  input_requirements: InputRequirements;
  ai_workflow_id: string;
  template_settings: Record<string, any>;
  is_active: boolean;
  credits_required: number;
  organisation: number | null;
  project: number | null;
  created_at: string;
  updated_at: string;
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
  is_category: boolean;
  is_variant: boolean;
  parent_sport_id: number | null;
  category_name: string | null;
}

export interface Formation {
  id: number;
  code: string;
  name: string;
  sport_config: number;
  sport_name: string;
  sport_id: number;
}

// ============================================================================
// Constants
// ============================================================================

export const TEMPLATE_CATEGORIES = [
  {
    id: 'all',
    label: 'All Templates',
    icon: '\u{1f4cb}',
    types: null as string[] | null,
  },
  {
    id: 'season',
    label: 'Season',
    icon: '\u{1f4c5}',
    types: ['season'],
    subtypes: ['transformation', 'season_recap'],
  },
  {
    id: 'pre_match',
    label: 'Pre-Match',
    icon: '\u{1f3ac}',
    types: ['pre_match'],
    subtypes: ['flyer', 'lineup', 'walkon', 'anthem'],
  },
  {
    id: 'during_match',
    label: 'During Match',
    icon: '\u26bd',
    types: ['during_match'],
    subtypes: ['goal', 'score_update'],
  },
  {
    id: 'post_match',
    label: 'Post-Match',
    icon: '\u{1f3c6}',
    types: ['post_match'],
    subtypes: ['end_score', 'match_summary', 'highlights'],
  },
  {
    id: 'member',
    label: 'Member',
    icon: '\u{1f464}',
    types: ['member'],
    subtypes: ['profile_photo', 'legacy_photo', 'closeup', 'member_intro', 'member_goal_celebration', 'member_in_tenue', 'member_legacy_closeup', 'member_legacy_in_tenue'],
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '\u{1f3a8}',
    types: ['custom'],
    subtypes: ['custom_logo', 'custom_tenue', 'custom_tenue_logo', 'custom_tenue_logo_sponsor'],
  },
];

export const SUBTYPE_LABELS: Record<string, string> = {
  flyer: 'Match Flyer',
  lineup: 'Lineup Announcement',
  walkon: 'Walk-on Video',
  anthem: 'Anthem Video',
  goal: 'Goal Celebration',
  score_update: 'Score Update',
  end_score: 'Final Score',
  match_summary: 'Match Summary',
  highlights: 'Highlights Reel',
  transformation: 'Transformation',
  season_recap: 'Season Recap',
  profile_photo: 'Profile Photo',
  legacy_photo: 'Legacy Photo',
  closeup: 'Close-up',
  member_intro: 'Short Intro',
  member_goal_celebration: 'Goal Celebration',
  member_in_tenue: 'In Tenue',
  member_legacy_closeup: 'Legacy Closeup',
  member_legacy_in_tenue: 'Legacy In Tenue',
  custom_logo: 'Logo',
  custom_tenue: 'Tenue',
  custom_tenue_logo: 'Tenue + Logo',
  custom_tenue_logo_sponsor: 'Tenue + Logo + Sponsor',
};

export const TYPE_LABELS: Record<string, string> = {
  pre_match: 'Pre-Match',
  during_match: 'During Match',
  post_match: 'Post-Match',
  season: 'Season',
  member: 'Member',
  custom: 'Custom',
};

// ============================================================================
// Helpers
// ============================================================================
