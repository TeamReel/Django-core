import type { MatchRecord } from '../periods/SeasonMatchesTab';
import type { Match } from '../../components/dashboard/ActiveMatchCard';

/** Convert MatchRecord (nullable fields) → Match (required fields) for MatchSheetFlow. */
export function matchRecordToMatch(r: MatchRecord, org?: { id: string; name: string; slug: string }): Match {
  return {
    id: r.id,
    title: r.title || '',
    slug: r.slug,
    start_time: r.start_time || r.date || '',
    end_time: r.end_time,
    location: (r.metadata?.venue as string) || undefined,
    organisation: org,
    project: {
      id: r.project?.id || '',
      name: r.project?.name || '',
      slug: r.project?.slug,
      club_name: r.project?.club_name,
      ...((r.project as Record<string, unknown> | undefined)?.logo_url
        ? { logo_url: (r.project as Record<string, unknown>).logo_url }
        : {}),
    },
    opponent_project: r.opponent_project
      ? {
          name: r.opponent_project.name || '',
          slug: r.opponent_project.slug,
          club_name: r.opponent_project.club_name,
          ...((r.opponent_project as Record<string, unknown>)?.logo_url
            ? { logo_url: (r.opponent_project as Record<string, unknown>).logo_url }
            : {}),
        }
      : undefined,
    metadata: (r.metadata || {}) as Record<string, unknown>,
    period: r.period ? { id: String(r.period.id || ''), name: r.period.name || '' } : undefined,
  };
}
