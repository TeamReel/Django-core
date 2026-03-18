/**
 * matchReadiness — Shared utility for calculating match content readiness.
 *
 * Extracts the readiness calculation that was duplicated across
 * ActiveMatchCard, MatchesCard, UpcomingMatchesCard, and NextMatchHero
 * into a single reusable function.
 *
 * @module utils/matchReadiness
 */
import { CONTENT_TYPES } from '../pages/identity/ContentGenerationModal';

/** Result of a match readiness calculation */
export interface MatchReadinessResult {
  /** Readiness percentage 0-100 */
  percent: number;
  /** Number of completed enabled content items */
  done: number;
  /** Total enabled content items */
  total: number;
}

/**
 * Calculate match content readiness percentage.
 *
 * Counts enabled CONTENT_TYPES (pre/during/post_match) and compares
 * against the list of done subtypes. Excludes disabled items and
 * the "goal" subtype when no score exists.
 *
 * @param contentDoneSubtypes - Array of subtype strings already generated
 * @param match - Match object with metadata (needs home_score, away_score)
 * @returns Readiness result with percent, done count, and total count
 */
export function calculateMatchReadiness(
  contentDoneSubtypes: string[],
  match?: { metadata?: Record<string, unknown> } | null,
): MatchReadinessResult {
  const hasGoals = Boolean(
    (match?.metadata?.home_score as number | undefined) ||
    (match?.metadata?.away_score as number | undefined),
  );

  const excludedFromReadiness = new Set(
    (['pre_match', 'during_match', 'post_match'] as const).flatMap(key => {
      const phase = CONTENT_TYPES[key];
      if (!phase) return [];
      return phase.items
        .filter(i => !i.enabled || (i.subtype === 'goal' && !hasGoals))
        .map(i => i.subtype);
    }),
  );

  const total = (['pre_match', 'during_match', 'post_match'] as const).reduce(
    (sum, key) => {
      const phase = CONTENT_TYPES[key];
      if (!phase) return sum;
      return sum + phase.items.filter(i => !excludedFromReadiness.has(i.subtype)).length;
    },
    0,
  );

  const done = contentDoneSubtypes.filter(
    s => !excludedFromReadiness.has(s),
  ).length;

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return { percent, done, total };
}
