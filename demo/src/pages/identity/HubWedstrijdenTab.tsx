/**
 * HubWedstrijdenTab — iOS-style grouped match list.
 *
 * Sections:
 *   "Komend"  — max 3 upcoming matches (Calendar icon, no score)
 *   Per month — played matches grouped by month, newest first (score badge)
 *
 * Tap navigates to MatchDetailPage. Admin FAB for creating matches.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';
import { ListSection } from '../../components/ListSection';
import { periodPathKey } from '../../utils/periodPath';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import s from './HubWedstrijdenTab.module.css';

// ── Props ────────────────────────────────────────────────────────────────────

interface HubWedstrijdenTabProps {
  matches: MatchRecord[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  matchDisplayTitle: (m: MatchRecord) => string;
  setIsCreateMatchModalOpen: (v: boolean) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse match date from available fields. */
function parseMatchDate(m: MatchRecord): Date | null {
  const raw = m.start_time || m.date || m.metadata?.date;
  if (!raw) return null;
  const d = new Date(raw as string);
  return isNaN(d.getTime()) ? null : d;
}

/** Build match detail path (same logic as SeasonMatchesTab). */
function getMatchPath(
  match: MatchRecord,
  isTeamRoute: boolean,
  seasonsBasePath: string,
  seasonPathKey: string,
): string {
  const compId = String(match.period_id || match.period?.id || match.period || '').trim();
  const compKey = periodPathKey(match.period || null) || compId;
  const matchKey = match.slug || match.id;
  return isTeamRoute
    ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
    : `/matches/${String(matchKey)}`;
}

/** Get score string or null. */
function getScore(m: MatchRecord): string | null {
  const meta = m.metadata;
  if (!meta) return null;
  const tr = meta.teamreel as Record<string, Record<string, unknown>> | undefined;
  const home = meta.score_home ?? tr?.match_context?.score_home;
  const away = meta.score_away ?? tr?.match_context?.score_away;
  if (home != null && away != null) return `${home}-${away}`;
  return null;
}

/** Format date for row subtitle. */
function fmtDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Month label in Dutch, uppercase. */
function monthLabel(d: Date): string {
  return d
    .toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

interface MonthGroup {
  label: string;
  /** Sort key — descending (newest first). */
  sortKey: number;
  matches: MatchRecord[];
}

interface GroupedMatches {
  upcoming: MatchRecord[];
  months: MonthGroup[];
}

/** Split matches into upcoming (max 3) and per-month played groups. */
function groupMatches(matches: MatchRecord[]): GroupedMatches {
  const now = Date.now();
  const upcoming: { m: MatchRecord; ts: number }[] = [];
  const played: { m: MatchRecord; d: Date }[] = [];

  for (const m of matches) {
    const d = parseMatchDate(m);
    const score = getScore(m);
    const status = String(m.metadata?.status || 'scheduled').toLowerCase();
    const isFinished = status === 'finished' || status === 'completed';

    if (!isFinished && !score && d && d.getTime() > now) {
      upcoming.push({ m, ts: d.getTime() });
    } else if (d) {
      played.push({ m, d });
    } else {
      // No date — treat as played, group under "Overig"
      played.push({ m, d: new Date(0) });
    }
  }

  // Upcoming: sorted soonest first, max 3
  upcoming.sort((a, b) => a.ts - b.ts);
  const upcomingMatches = upcoming.slice(0, 3).map((u) => u.m);

  // Played: group by month, newest month first
  const monthMap = new Map<string, MonthGroup>();
  for (const { m, d } of played) {
    const key = d.getTime() === 0 ? 'OVERIG' : monthLabel(d);
    const sortKey = d.getTime() === 0 ? -1 : d.getFullYear() * 100 + d.getMonth();
    let group = monthMap.get(key);
    if (!group) {
      group = { label: key, sortKey, matches: [] };
      monthMap.set(key, group);
    }
    group.matches.push(m);
  }

  const months = Array.from(monthMap.values()).sort((a, b) => b.sortKey - a.sortKey);
  // Within each month: newest first
  for (const g of months) {
    g.matches.sort((a, b) => {
      const da = parseMatchDate(a)?.getTime() ?? 0;
      const db = parseMatchDate(b)?.getTime() ?? 0;
      return db - da;
    });
  }

  return { upcoming: upcomingMatches, months };
}

// ── Component ────────────────────────────────────────────────────────────────

export const HubWedstrijdenTab: React.FC<HubWedstrijdenTabProps> = ({
  matches,
  matchesLoading,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  userCanEditProject,
  matchDisplayTitle,
  setIsCreateMatchModalOpen,
}) => {
  const navigate = useNavigate();

  const grouped = useMemo(() => groupMatches(matches), [matches]);

  const goToMatch = (m: MatchRecord) => {
    const path = getMatchPath(m, isTeamRoute, seasonsBasePath, seasonPathKey);
    navigate(path);
  };

  if (matchesLoading) {
    return <div className={s.empty}>Wedstrijden laden…</div>;
  }

  if (!matches.length) {
    return (
      <div className={s.container}>
        <div className={s.empty}>Nog geen wedstrijden in dit seizoen.</div>
        {userCanEditProject && (
          <button
            className={s.fab}
            onClick={() => setIsCreateMatchModalOpen(true)}
            aria-label="Wedstrijd toevoegen"
            type="button"
          >
            <AppIcon icon={Plus} size={24} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={s.container}>
      {/* Upcoming matches */}
      {grouped.upcoming.length > 0 && (
        <ListSection title="Komend">
          {grouped.upcoming.map((m) => {
            const d = parseMatchDate(m);
            return (
              <ListSection.Row
                key={m.id}
                icon={Calendar}
                label={matchDisplayTitle(m)}
                value={d ? <span className={s.matchDate}>{fmtDate(d)}</span> : undefined}
                onTap={() => goToMatch(m)}
              />
            );
          })}
        </ListSection>
      )}

      {/* Per-month played matches */}
      {grouped.months.map((group) => (
        <ListSection key={group.label} title={group.label}>
          {group.matches.map((m) => {
            const d = parseMatchDate(m);
            const score = getScore(m);
            return (
              <ListSection.Row
                key={m.id}
                label={matchDisplayTitle(m)}
                value={d ? <span className={s.matchDate}>{fmtDate(d)}</span> : undefined}
                trailing={score ? <span className={s.scoreBadge}>{score}</span> : undefined}
                onTap={() => goToMatch(m)}
              />
            );
          })}
        </ListSection>
      ))}

      {/* Admin FAB */}
      {userCanEditProject && (
        <button
          className={s.fab}
          onClick={() => setIsCreateMatchModalOpen(true)}
          aria-label="Wedstrijd toevoegen"
          type="button"
        >
          <AppIcon icon={Plus} size={24} />
        </button>
      )}
    </div>
  );
};
