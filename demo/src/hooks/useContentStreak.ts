/**
 * useContentStreak — Calculate content generation streak across matches.
 *
 * A match is "complete" when it has all 3 base content subtypes:
 * flyer, lineup, and match_summary (or end_score).
 *
 * Streak = consecutive complete matches, newest first.
 *
 * Fetches past matches + their media items, then calculates:
 * - currentStreak: consecutive complete matches from most recent
 * - longestStreak: highest streak ever in the fetched window
 * - nextMatchComplete: whether the closest/active match is complete
 * - isAtRisk: next match starts within 48h and isn't complete yet
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Match } from '../components/dashboard/ActiveMatchCard';
import { queryKeys } from '../utils/queryKeys';

/** Subtypes that must ALL be present for a match to count as "complete" */
const REQUIRED_SUBTYPES = ['flyer', 'lineup', 'match_summary'] as const;

/** Alternative subtypes that satisfy a requirement (e.g. end_score → match_summary) */
const SUBTYPE_ALIASES: Record<string, string[]> = {
  match_summary: ['match_summary', 'end_score'],
};

export interface ContentStreakData {
  /** Current consecutive streak of complete matches (newest first) */
  currentStreak: number;
  /** Longest streak in the fetched window */
  longestStreak: number;
  /** Whether the next/active match already has all required content */
  nextMatchComplete: boolean;
  /** True if next match is within 48h and not yet complete → streak at risk */
  isAtRisk: boolean;
  /** Total past matches checked */
  totalMatchesChecked: number;
}

interface MediaItem {
  id: string;
  extraction_metadata?: { asset_type?: string };
}

/** Normalize asset_type to canonical subtype */
function normalizeSubtype(raw: string): string {
  let normalized = String(raw).replace(/_[a-f0-9]{8}$/i, '');
  if (normalized === 'goal_celebration') normalized = 'goal';
  if (normalized === 'match_flyer') normalized = 'flyer';
  return normalized;
}

/** Check if a match has all required subtypes */
function isMatchComplete(doneSubtypes: Set<string>): boolean {
  return REQUIRED_SUBTYPES.every((req) => {
    const aliases = SUBTYPE_ALIASES[req] ?? [req];
    return aliases.some((alias) => doneSubtypes.has(alias));
  });
}

async function fetchContentStreak(
  projectId: string,
  activeMatchId?: string,
): Promise<ContentStreakData> {
  const now = new Date().toISOString();

  // 1. Fetch past matches (up to 15)
  const pastData = await api.list<Match>('/activities/', {
    params: {
      activity_type: 'match',
      start_time__lte: now,
      ordering: '-start_time',
      ...(projectId ? { project: projectId } : {}),
    },
    pageSize: 15,
  });

  const pastMatches = pastData.results;

  // 2. Fetch next upcoming match (for isAtRisk check)
  let nextMatch: Match | null = null;
  let nextMatchDoneSubtypes = new Set<string>();

  try {
    const futureData = await api.list<Match>('/activities/', {
      params: {
        activity_type: 'match',
        start_time__gte: now,
        ordering: 'start_time',
        ...(projectId ? { project: projectId } : {}),
      },
      pageSize: 1,
    });
    nextMatch = futureData.results[0] ?? null;
  } catch {
    // ignore
  }

  // If there's an explicit active match, include it
  const matchToCheckForNext = activeMatchId
    ? (pastMatches.find((m) => m.id === activeMatchId) ?? nextMatch)
    : nextMatch;

  // 3. Fetch media for all matches in parallel (including next match)
  const allMatchIds = pastMatches.map((m) => m.id);
  if (matchToCheckForNext && !allMatchIds.includes(matchToCheckForNext.id)) {
    allMatchIds.push(matchToCheckForNext.id);
  }

  const mediaByMatch = new Map<string, Set<string>>();

  // Batch fetch media items per match (parallel)
  const mediaResults = await Promise.allSettled(
    allMatchIds.map(async (matchId) => {
      const media = await api.list<MediaItem>('/media/items/', {
        params: { activity: matchId },
        pageSize: 50,
      });
      const subtypes = new Set<string>();
      for (const item of media.results) {
        const raw = item.extraction_metadata?.asset_type;
        if (raw) subtypes.add(normalizeSubtype(String(raw)));
      }
      return { matchId, subtypes };
    }),
  );

  for (const result of mediaResults) {
    if (result.status === 'fulfilled') {
      mediaByMatch.set(result.value.matchId, result.value.subtypes);
    }
  }

  // 4. Calculate next match completeness
  if (matchToCheckForNext) {
    nextMatchDoneSubtypes = mediaByMatch.get(matchToCheckForNext.id) ?? new Set();
  }
  const nextMatchComplete = matchToCheckForNext
    ? isMatchComplete(nextMatchDoneSubtypes)
    : false;

  // 5. isAtRisk: next match within 48h and not complete
  const isAtRisk = (() => {
    if (!matchToCheckForNext || nextMatchComplete) return false;
    const matchTime = new Date(matchToCheckForNext.start_time).getTime();
    const hoursUntil = (matchTime - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= -2 && hoursUntil <= 48; // include ~2h after start too
  })();

  // 6. Calculate streaks from past matches (newest first, already sorted)
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let currentStreakBroken = false;

  for (const match of pastMatches) {
    const subtypes = mediaByMatch.get(match.id) ?? new Set<string>();
    if (isMatchComplete(subtypes)) {
      runningStreak++;
      if (!currentStreakBroken) {
        currentStreak = runningStreak;
      }
    } else {
      if (!currentStreakBroken) {
        currentStreakBroken = true;
      }
      longestStreak = Math.max(longestStreak, runningStreak);
      runningStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, runningStreak);
  if (!currentStreakBroken) {
    currentStreak = runningStreak;
  }

  return {
    currentStreak,
    longestStreak,
    nextMatchComplete,
    isAtRisk,
    totalMatchesChecked: pastMatches.length,
  };
}

/**
 * Hook to calculate content generation streak for a project.
 *
 * @param projectId - Team/project ID to check matches for
 * @param activeMatchId - Currently active match ID (optional)
 */
export function useContentStreak(projectId?: string, activeMatchId?: string) {
  return useQuery({
    queryKey: [...queryKeys.activities.all, 'content-streak', projectId ?? '__none__'],
    queryFn: () => fetchContentStreak(projectId ?? '', activeMatchId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
