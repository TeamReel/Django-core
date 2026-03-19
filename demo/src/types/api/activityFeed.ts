/**
 * Activity Feed Types (B62 → F17)
 *
 * TypeScript interfaces for the B62 Activity Feed API responses.
 * API: /api/v1/activity-feed/
 *
 * @see src/activity_feed/api/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Verb constants                                                     */
/* ------------------------------------------------------------------ */

/**
 * Known activity verbs — mirrors `VerbChoices` in the backend.
 * Using a const object + type union for exhaustive checking.
 */
export const ActivityVerb = {
  CONTENT_CREATED: 'content.created',
  CONTENT_APPROVED: 'content.approved',
  CONTENT_REJECTED: 'content.rejected',
  MEMBER_ADDED: 'member.added',
  MEMBER_CONFIRMED: 'member.confirmed',
  MATCH_CREATED: 'match.created',
  MATCH_LINEUP_SET: 'match.lineup_set',
  SEASON_STARTED: 'season.started',
  LINEUP_PUBLISHED: 'lineup.published',
} as const;

export type ActivityVerbValue = (typeof ActivityVerb)[keyof typeof ActivityVerb];

/**
 * Verb categories for grouping in filter UI.
 */
export const VERB_CATEGORIES = {
  content: [ActivityVerb.CONTENT_CREATED, ActivityVerb.CONTENT_APPROVED, ActivityVerb.CONTENT_REJECTED],
  member: [ActivityVerb.MEMBER_ADDED, ActivityVerb.MEMBER_CONFIRMED],
  match: [ActivityVerb.MATCH_CREATED, ActivityVerb.MATCH_LINEUP_SET, ActivityVerb.LINEUP_PUBLISHED],
  season: [ActivityVerb.SEASON_STARTED],
} as const;

export type VerbCategory = keyof typeof VERB_CATEGORIES;

/* ------------------------------------------------------------------ */
/*  Verb display labels (NL)                                           */
/* ------------------------------------------------------------------ */

/**
 * Human-readable Dutch labels for each verb.
 * Used in timeline items: "{actor} {label}".
 */
export const VERB_LABELS: Record<ActivityVerbValue, string> = {
  [ActivityVerb.CONTENT_CREATED]: 'heeft content aangemaakt',
  [ActivityVerb.CONTENT_APPROVED]: 'heeft content goedgekeurd',
  [ActivityVerb.CONTENT_REJECTED]: 'heeft content afgekeurd',
  [ActivityVerb.MEMBER_ADDED]: 'is toegevoegd als lid',
  [ActivityVerb.MEMBER_CONFIRMED]: 'heeft beschikbaarheid bevestigd',
  [ActivityVerb.MATCH_CREATED]: 'heeft een wedstrijd aangemaakt',
  [ActivityVerb.MATCH_LINEUP_SET]: 'heeft de opstelling ingesteld',
  [ActivityVerb.SEASON_STARTED]: 'heeft het seizoen gestart',
  [ActivityVerb.LINEUP_PUBLISHED]: 'heeft de opstelling gepubliceerd',
};

/**
 * Short labels for grouped display: "3 {short label}".
 */
export const VERB_GROUP_LABELS: Record<ActivityVerbValue, string> = {
  [ActivityVerb.CONTENT_CREATED]: 'content items aangemaakt',
  [ActivityVerb.CONTENT_APPROVED]: 'content items goedgekeurd',
  [ActivityVerb.CONTENT_REJECTED]: 'content items afgekeurd',
  [ActivityVerb.MEMBER_ADDED]: 'leden toegevoegd',
  [ActivityVerb.MEMBER_CONFIRMED]: 'spelers bevestigd',
  [ActivityVerb.MATCH_CREATED]: 'wedstrijden aangemaakt',
  [ActivityVerb.MATCH_LINEUP_SET]: 'opstellingen ingesteld',
  [ActivityVerb.SEASON_STARTED]: 'seizoenen gestart',
  [ActivityVerb.LINEUP_PUBLISHED]: 'opstellingen gepubliceerd',
};

/**
 * Verb → Lucide icon name mapping for the timeline UI.
 */
export const VERB_ICONS: Record<ActivityVerbValue, string> = {
  [ActivityVerb.CONTENT_CREATED]: 'file-plus',
  [ActivityVerb.CONTENT_APPROVED]: 'check-circle-2',
  [ActivityVerb.CONTENT_REJECTED]: 'x-circle',
  [ActivityVerb.MEMBER_ADDED]: 'user-plus',
  [ActivityVerb.MEMBER_CONFIRMED]: 'user-check',
  [ActivityVerb.MATCH_CREATED]: 'calendar-plus',
  [ActivityVerb.MATCH_LINEUP_SET]: 'users',
  [ActivityVerb.SEASON_STARTED]: 'play-circle',
  [ActivityVerb.LINEUP_PUBLISHED]: 'megaphone',
};

/* ------------------------------------------------------------------ */
/*  API response types                                                 */
/* ------------------------------------------------------------------ */

/** Single activity log item from /api/v1/activity-feed/ */
export interface ActivityLogItem {
  id: string;
  actor: string | null;
  actor_email: string | null;
  verb: ActivityVerbValue;
  target_content_type: number | null;
  target_object_id: string | null;
  target_type: string | null;
  organisation: string;
  project: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
}

/** Grouped activity events (5-min window aggregation) */
export interface ActivityLogGroup {
  verb: ActivityVerbValue;
  count: number;
  events: ActivityLogItem[];
  first_at: string;
  last_at: string;
}

/** Cursor-paginated response from DRF CursorPagination */
export interface CursorPaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Activity feed list response (ungrouped) */
export type ActivityFeedResponse = CursorPaginatedResponse<ActivityLogItem>;

/** Activity feed grouped response */
export type ActivityFeedGroupedResponse = CursorPaginatedResponse<ActivityLogGroup>;

/** Unread count response from /api/v1/activity-feed/unread-count/ */
export interface ActivityUnreadCount {
  unread_count: number;
  last_read_at: string | null;
}

/** Mark-read response from POST /api/v1/activity-feed/mark-read/ */
export interface ActivityMarkReadResult {
  last_read_at: string;
  created: boolean;
}

/* ------------------------------------------------------------------ */
/*  Filter params for the hook                                         */
/* ------------------------------------------------------------------ */

export interface ActivityFeedFilters {
  project?: string;
  verb?: ActivityVerbValue;
  actor?: string;
  grouped?: boolean;
  page_size?: number;
}
