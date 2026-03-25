/**
 * HubWedstrijdenTab — Accordion-style match list grouped by competition.
 *
 * Structure:
 *   Header — Season name + add menu (wedstrijd / competitie)
 *   "Komend" — max 3 upcoming matches across all competitions
 *   Per competition — collapsible accordion sections (like Assets tab)
 *   "Overig" — matches without a competition
 */
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Trophy, Swords, ChevronDown } from 'lucide-react';
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
  onMatchTap?: (m: MatchRecord) => void;
  seasonName?: string;
  competitions?: Period[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseMatchDate(m: MatchRecord): Date | null {
  const raw = m.start_time || m.date || m.metadata?.date;
  if (!raw) return null;
  const d = new Date(raw as string);
  return isNaN(d.getTime()) ? null : d;
}

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

function getScore(m: MatchRecord): string | null {
  const meta = m.metadata;
  if (!meta) return null;
  const tr = meta.teamreel as Record<string, Record<string, unknown>> | undefined;
  const home = meta.score_home ?? tr?.match_context?.score_home;
  const away = meta.score_away ?? tr?.match_context?.score_away;
  if (home != null && away != null) return `${home}-${away}`;
  return null;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getVenue(m: MatchRecord): 'home' | 'away' | null {
  const meta = m.metadata;
  if (!meta) return null;
  if (meta.venue === 'home' || meta.is_home === true) return 'home';
  if (meta.venue === 'away' || meta.is_home === false) return 'away';
  return null;
}

function isUpcoming(m: MatchRecord): boolean {
  const d = parseMatchDate(m);
  const score = getScore(m);
  const status = String(m.metadata?.status || 'scheduled').toLowerCase();
  return !score && status !== 'finished' && status !== 'completed' && !!d && d.getTime() > Date.now();
}

// ── Grouping ─────────────────────────────────────────────────────────────────

interface CompetitionGroup {
  competition: Period;
  matches: MatchRecord[];
  played: number;
}

interface GroupedData {
  upcoming: MatchRecord[];
  groups: CompetitionGroup[];
  ungrouped: MatchRecord[];
}

function groupByCompetition(
  matches: MatchRecord[],
  competitions: Period[],
): GroupedData {
  const upcoming: MatchRecord[] = [];
  const compMap = new Map<string, MatchRecord[]>();
  const ungrouped: MatchRecord[] = [];

  for (const m of matches) {
    if (isUpcoming(m)) upcoming.push(m);

    const compId = String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '').trim();
    if (compId) {
      if (!compMap.has(compId)) compMap.set(compId, []);
      compMap.get(compId)!.push(m);
    } else {
      ungrouped.push(m);
    }
  }

  // Sort upcoming by date (soonest first), max 3
  upcoming.sort((a, b) => (parseMatchDate(a)?.getTime() ?? 0) - (parseMatchDate(b)?.getTime() ?? 0));

  // Build groups per competition, maintaining competition order
  const groups: CompetitionGroup[] = [];
  for (const comp of competitions) {
    const cid = String(comp.id);
    const compMatches = compMap.get(cid) || [];
    if (compMatches.length === 0) continue;
    // Sort: upcoming first (by date asc), then played (by date desc)
    compMatches.sort((a, b) => {
      const aUp = isUpcoming(a);
      const bUp = isUpcoming(b);
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      const ta = parseMatchDate(a)?.getTime() ?? 0;
      const tb = parseMatchDate(b)?.getTime() ?? 0;
      return aUp ? ta - tb : tb - ta;
    });
    const played = compMatches.filter((m) => !isUpcoming(m)).length;
    groups.push({ competition: comp, matches: compMatches, played });
  }

  // Check for matches in competitions not in the `competitions` array
  const knownCompIds = new Set(competitions.map((c) => String(c.id)));
  for (const [cid, ms] of compMap) {
    if (!knownCompIds.has(cid)) ungrouped.push(...ms);
  }

  // Sort ungrouped by date desc
  ungrouped.sort((a, b) => (parseMatchDate(b)?.getTime() ?? 0) - (parseMatchDate(a)?.getTime() ?? 0));

  return { upcoming: upcoming.slice(0, 3), groups, ungrouped };
}

// ── CompetitionSection ───────────────────────────────────────────────────────

interface CompetitionSectionProps {
  group: CompetitionGroup;
  defaultOpen: boolean;
  matchDisplayTitle: (m: MatchRecord) => string;
  onMatchTap: (m: MatchRecord) => void;
}

const CompetitionSection: React.FC<CompetitionSectionProps> = ({
  group, defaultOpen, matchDisplayTitle, onMatchTap,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const total = group.matches.length;

  return (
    <div className={s.compSection}>
      <button
        type="button"
        className={s.compHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={s.compHeaderLeft}>
          <AppIcon icon={Trophy} size={14} />
          <span className={s.compName}>{group.competition.name || 'Competitie'}</span>
        </span>
        <span className={s.compHeaderRight}>
          <span className={s.compCount}>{group.played}/{total}</span>
          <span className={`${s.chevron} ${open ? s.chevronOpen : ''}`}>
            <AppIcon icon={ChevronDown} size={14} />
          </span>
        </span>
      </button>
      {open && (
        <div className={s.compBody}>
          {group.matches.map((m) => {
            const d = parseMatchDate(m);
            const score = getScore(m);
            const venue = getVenue(m);
            const upcoming = isUpcoming(m);
            return (
              <button
                key={m.id}
                type="button"
                className={s.matchRow}
                onClick={() => onMatchTap(m)}
              >
                <span className={s.matchMain}>
                  {venue && (
                    <span className={venue === 'home' ? s.venueHome : s.venueAway}>
                      {venue === 'home' ? 'T' : 'U'}
                    </span>
                  )}
                  <span className={s.matchTitle}>{matchDisplayTitle(m)}</span>
                </span>
                <span className={s.matchMeta}>
                  {d && (
                    <span className={s.matchDate}>
                      {upcoming ? fmtDate(d) : fmtDateShort(d)}
                    </span>
                  )}
                  {score && <span className={s.scoreBadge}>{score}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [addMenuOpen]);

  const data = useMemo(
    () => groupByCompetition(matches, competitions),
    [matches, competitions],
  );

  const goToMatch = useCallback((m: MatchRecord) => {
    if (onMatchTap) {
      onMatchTap(m);
    } else {
      navigate(getMatchPath(m, isTeamRoute, seasonsBasePath, seasonPathKey));
    }
  }, [onMatchTap, navigate, isTeamRoute, seasonsBasePath, seasonPathKey]);

  if (matchesLoading) {
    return <div className={s.empty}>Wedstrijden laden…</div>;
  }

  if (!matches.length) {
    return (
      <div className={s.container}>
        <div className={s.empty}>Nog geen wedstrijden in dit seizoen.</div>
        {userCanEditProject && (
          <div className={s.emptyActions}>
            <button type="button" className={s.emptyAction} onClick={() => setIsCreateMatchModalOpen(true)}>
              <AppIcon icon={Swords} size={16} />
              <span>Wedstrijd toevoegen</span>
            </button>
            {setIsCreateCompetitionModalOpen && (
              <button type="button" className={s.emptyAction} onClick={() => setIsCreateCompetitionModalOpen(true)}>
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
      {/* Header: season name + add menu */}
      <div className={s.headerBar}>
        <div className={s.headerLeft}>
          {seasonName && <span className={s.seasonBarLabel}>{seasonName}</span>}
        </div>
        {userCanEditProject && (
          <div className={s.addMenuWrap} ref={addMenuRef}>
            <button
              type="button"
              className={s.addBtn}
              onClick={() => setAddMenuOpen((v) => !v)}
              aria-label="Toevoegen"
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
            >
              <AppIcon icon={Plus} size={16} />
            </button>
            {addMenuOpen && (
              <div className={s.addMenu} role="menu">
                <button type="button" className={s.addMenuItem} role="menuitem"
                  onClick={() => { setIsCreateMatchModalOpen(true); setAddMenuOpen(false); }}
                >
                  <AppIcon icon={Swords} size={16} /><span>Wedstrijd</span>
                </button>
                {setIsCreateCompetitionModalOpen && (
                  <button type="button" className={s.addMenuItem} role="menuitem"
                    onClick={() => { setIsCreateCompetitionModalOpen(true); setAddMenuOpen(false); }}
                  >
                    <AppIcon icon={Trophy} size={16} /><span>Competitie</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming matches — always visible, cross-competition */}
      {data.upcoming.length > 0 && (
        <ListSection title="Komend">
          {data.upcoming.map((m) => {
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

      {/* Per-competition accordion sections */}
      {data.groups.map((group, i) => (
        <CompetitionSection
          key={String(group.competition.id)}
          group={group}
          defaultOpen={i === 0}
          matchDisplayTitle={matchDisplayTitle}
          onMatchTap={goToMatch}
        />
      ))}

      {/* Ungrouped matches */}
      {data.ungrouped.length > 0 && (
        <ListSection title="Overig">
          {data.ungrouped.map((m) => {
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
                    {d && <span className={s.matchDate}>{fmtDateShort(d)}</span>}
                  </span>
                }
                trailing={score ? <span className={s.scoreBadge}>{score}</span> : undefined}
                onTap={() => goToMatch(m)}
              />
            );
          })}
        </ListSection>
      )}
    </div>
  );
};
