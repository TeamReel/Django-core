/**
 * HubWedstrijdenTab — iOS-style grouped match list.
 *
 * Sections:
 *   "Komend"  — max 3 upcoming matches (Calendar icon, no score)
 *   Per month — played matches grouped by month, newest first (score badge)
 *
 * Tap navigates to MatchDetailPage. Admin FAB for creating matches.
 */
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Trophy, Swords } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';
import { ListSection } from '../../components/ListSection';
import { periodPathKey } from '../../utils/periodPath';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import type { Period } from '../../types/season';
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
  setIsCreateCompetitionModalOpen?: (v: boolean) => void;
  /** If provided, tapping a match calls this instead of navigating away */
  onMatchTap?: (m: MatchRecord) => void;
  /** Current season name shown as context bar at the top */
  seasonName?: string;
  /** Competitions in the active season — shown as filter pills */
  competitions?: Period[];
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

/** Get venue indicator: 'home' | 'away' | null. */
function getVenue(m: MatchRecord): 'home' | 'away' | null {
  const meta = m.metadata;
  if (!meta) return null;
  if (meta.venue === 'home' || meta.is_home === true) return 'home';
  if (meta.venue === 'away' || meta.is_home === false) return 'away';
  return null;
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
  setIsCreateCompetitionModalOpen,
  onMatchTap,
  seasonName,
  competitions = [],
}) => {
  const navigate = useNavigate();
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu on outside click
  const handleCloseAddMenu = useCallback((e: MouseEvent) => {
    if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
      setAddMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleCloseAddMenu);
      return () => document.removeEventListener('mousedown', handleCloseAddMenu);
    }
  }, [addMenuOpen, handleCloseAddMenu]);

  // Filter matches by selected competition
  const filteredMatches = useMemo(() => {
    if (!selectedCompetitionId) return matches;
    return matches.filter((m) => {
      const pid = String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '');
      return pid === selectedCompetitionId;
    });
  }, [matches, selectedCompetitionId]);

  const grouped = useMemo(() => groupMatches(filteredMatches), [filteredMatches]);

  const goToMatch = (m: MatchRecord) => {
    if (onMatchTap) {
      onMatchTap(m);
    } else {
      const path = getMatchPath(m, isTeamRoute, seasonsBasePath, seasonPathKey);
      navigate(path);
    }
  };

  if (matchesLoading) {
    return <div className={s.empty}>Wedstrijden laden…</div>;
  }

  if (!matches.length) {
    return (
      <div className={s.container}>
        <div className={s.empty}>Nog geen wedstrijden in dit seizoen.</div>
        {userCanEditProject && (
          <div className={s.emptyActions}>
            <button
              type="button"
              className={s.emptyAction}
              onClick={() => setIsCreateMatchModalOpen(true)}
            >
              <AppIcon icon={Swords} size={16} />
              <span>Wedstrijd toevoegen</span>
            </button>
            {setIsCreateCompetitionModalOpen && (
              <button
                type="button"
                className={s.emptyAction}
                onClick={() => setIsCreateCompetitionModalOpen(true)}
              >
                <AppIcon icon={Trophy} size={16} />
                <span>Competitie toevoegen</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={s.container}>
      {/* Header bar: season + filter pills + add button */}
      <div className={s.headerBar}>
        <div className={s.headerLeft}>
          {seasonName && (
            <span className={s.seasonBarLabel}>{seasonName}</span>
          )}
        </div>
        {userCanEditProject && (
          <div className={s.addMenuWrap} ref={addMenuRef}>
            <button
              type="button"
              className={s.addBtn}
              onClick={() => setAddMenuOpen(v => !v)}
              aria-label="Toevoegen"
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
            >
              <AppIcon icon={Plus} size={16} />
            </button>
            {addMenuOpen && (
              <div className={s.addMenu} role="menu">
                <button
                  type="button"
                  className={s.addMenuItem}
                  role="menuitem"
                  onClick={() => { setIsCreateMatchModalOpen(true); setAddMenuOpen(false); }}
                >
                  <AppIcon icon={Swords} size={16} />
                  <span>Wedstrijd</span>
                </button>
                {setIsCreateCompetitionModalOpen && (
                  <button
                    type="button"
                    className={s.addMenuItem}
                    role="menuitem"
                    onClick={() => { setIsCreateCompetitionModalOpen(true); setAddMenuOpen(false); }}
                  >
                    <AppIcon icon={Trophy} size={16} />
                    <span>Competitie</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Competition filter pills */}
      {competitions.length > 0 && (
        <div className={s.filterBar} role="toolbar" aria-label="Filter op competitie">
          <button
            type="button"
            className={s.filterPill}
            data-active={selectedCompetitionId === null ? 'true' : undefined}
            onClick={() => setSelectedCompetitionId(null)}
          >
            Alle
          </button>
          {competitions.map((comp) => {
            const cid = String(comp.id);
            return (
              <button
                key={cid}
                type="button"
                className={s.filterPill}
                data-active={selectedCompetitionId === cid ? 'true' : undefined}
                onClick={() => setSelectedCompetitionId(selectedCompetitionId === cid ? null : cid)}
              >
                {String(comp.name || 'Competitie')}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state when filter yields no results */}
      {filteredMatches.length === 0 && (
        <div className={s.empty}>Geen wedstrijden voor deze competitie.</div>
      )}

      {/* Upcoming matches */}
      {grouped.upcoming.length > 0 && (
        <ListSection title="Komend">
          {grouped.upcoming.map((m) => {
            const d = parseMatchDate(m);
            const venue = getVenue(m);
            return (
              <ListSection.Row
                key={m.id}
                icon={Calendar}
                label={matchDisplayTitle(m)}
                value={
                  <span className={s.rowMeta}>
                    {venue && <span className={venue === 'home' ? s.venueHome : s.venueAway}>{venue === 'home' ? 'T' : 'U'}</span>}
                    {d && <span className={s.matchDate}>{fmtDate(d)}</span>}
                  </span>
                }
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
            const venue = getVenue(m);
            return (
              <ListSection.Row
                key={m.id}
                label={matchDisplayTitle(m)}
                value={
                  <span className={s.rowMeta}>
                    {venue && <span className={venue === 'home' ? s.venueHome : s.venueAway}>{venue === 'home' ? 'T' : 'U'}</span>}
                    {d && <span className={s.matchDate}>{fmtDate(d)}</span>}
                  </span>
                }
                trailing={score ? <span className={s.scoreBadge}>{score}</span> : undefined}
                onTap={() => goToMatch(m)}
              />
            );
          })}
        </ListSection>
      ))}

      {/* No more FAB — add menu is in header */}
    </div>
  );
};
