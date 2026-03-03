/**
 * Display label constants and helpers for ContentAvailabilityCard.
 */

// Display name mappings for better readability
export const TYPE_LABELS: Record<string, string> = {
  during_match: 'During Match',
  pre_match: 'Pre Match',
  post_match: 'Post Match',
  member: 'Member',
  season: 'Season',
};

export const SUBTYPE_LABELS: Record<string, string> = {
  goal: 'Goal Celebration',
  end_score: 'Final Score',
  score_update: 'Score Update',
  lineup: 'Lineup',
  preview: 'Match Preview',
  recap: 'Match Recap',
  highlights: 'Highlights',
  stats: 'Statistics',
  profile: 'Profile',
  welcome: 'Welcome',
  birthday: 'Birthday',
  achievement: 'Achievement',
  announcement: 'Announcement',
  summary: 'Summary',
  review: 'Review',
};

export const titleCase = (value: string): string =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

export const getDisplayLabel = (value: string, labelMap: Record<string, string>): string => {
  const key = String(value || '').toLowerCase().replace(/\s+/g, '_');
  return labelMap[key] || titleCase(value);
};
