/**
 * ActiveMatchCard — Shows the most relevant match (closest to now).
 *
 * Logic: fetch recent past + near future matches, pick the one whose
 * start_time is closest to Date.now(). This ensures match-day content
 * creation always has the right match in focus.
 *
 * Clicking the card opens a MatchSheet (iOS-like slide-up panel)
 * with match overview + quick actions instead of navigating away.
 * Match links use vanity URLs built from the active hierarchy context.
 */
import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ChevronRight, MapPin, Clock, CheckCircle2,
  Circle, Trophy, Sparkles, Calendar, Users, ExternalLink,
  FileImage,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { api } from '@/api';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { routes } from '../../routes';
import { useAppSelection } from '../../hooks/useAppSelection';
import { slugify } from '../../utils/periodPath';
import { NavigationSheet } from '../ui/NavigationSheet';
import { LineupSheet } from './LineupSheet';
import { ContentSheet } from './ContentSheet';
import styles from './ActiveMatchCard.module.css';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface Match {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  organisation?: { id: string; name: string; slug: string };
  project: { id: string; name: string; slug?: string; club_name?: string };
  opponent_project?: { name: string; slug?: string; club_name?: string };
  metadata: Record<string, any>;
  period?: { id: string; name: string; parent_period?: { id: string; name: string } };
}

/* ── Vanity URL builder ────────────────────────────────────────────── */

function buildMatchVanityUrl(
  match: Match,
  hierarchy: { orgSlug: string; clubSlugOrId?: string | null; teamSlugOrId?: string | null; seasonSlugOrId?: string | null; competitionSlugOrId?: string | null },
): string {
  const org = hierarchy.orgSlug || match.organisation?.slug;
  const club = hierarchy.clubSlugOrId;
  const team = hierarchy.teamSlugOrId || match.project?.slug;
  const season = hierarchy.seasonSlugOrId || (match.period?.parent_period?.name ? slugify(match.period.parent_period.name) : '');
  const competition = hierarchy.competitionSlugOrId || (match.period?.name ? slugify(match.period.name) : '');
  const matchKey = match.slug || match.id;

  if (org && club && team && season && competition && matchKey) {
    return routes.match({ orgId: org, clubId: club, projectId: team, seasonId: season, competitionId: competition, matchId: matchKey });
  }
  // Fallback to legacy redirect route
  return routes.matchById({ matchId: matchKey });
}

function buildMatchVanityUrlWithTab(
  match: Match,
  hierarchy: { orgSlug: string; clubSlugOrId?: string | null; teamSlugOrId?: string | null; seasonSlugOrId?: string | null; competitionSlugOrId?: string | null },
  tab: string,
): string {
  const base = buildMatchVanityUrl(match, hierarchy);
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

/* ── Component ─────────────────────────────────────────────────────── */

export const ActiveMatchCard = memo(function ActiveMatchCard() {
  const { context } = useContextSwitcher();
  const hierarchy = useAppSelection();
  const [match, setMatch] = useState<Match | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [lineupCount, setLineupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lineupSheetOpen, setLineupSheetOpen] = useState(false);
  const [contentSheetOpen, setContentSheetOpen] = useState(false);
  const navigate = useNavigate();
  const project = context.project;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();
        const baseParams: Record<string, string> = {
          activity_type: 'match',
        };
        if (project) baseParams.project = project.id;

        // Fetch both recent past and near future matches in parallel
        const [pastData, futureData] = await Promise.all([
          api.list<Match>('/activities/', {
            params: { ...baseParams, start_time__lte: now, ordering: '-start_time' },
            pageSize: 3,
          }),
          api.list<Match>('/activities/', {
            params: { ...baseParams, start_time__gte: now, ordering: 'start_time' },
            pageSize: 3,
          }),
        ]);

        const all = [...pastData.results, ...futureData.results];

        if (all.length === 0) {
          if (!cancelled) setMatch(null);
          return;
        }

        // Pick match closest to now
        const nowMs = Date.now();
        const closest = all.reduce((best, m) => {
          const diff = Math.abs(new Date(m.start_time).getTime() - nowMs);
          const bestDiff = Math.abs(new Date(best.start_time).getTime() - nowMs);
          return diff < bestDiff ? m : best;
        });

        if (!cancelled) setMatch(closest);

        // Count content items & lineup for this match (gracefully handle 500s)
        if (closest) {
          // Lineup from metadata
          const lineupPositions = (closest.metadata?.lineup as any)?.positions;
          if (Array.isArray(lineupPositions) && lineupPositions.length > 0) {
            if (!cancelled) setLineupCount(lineupPositions.length);
          } else {
            // Fallback: fetch participations count
            try {
              const partData = await api.list<any>('/participations/', {
                params: { activity_id: closest.id },
                pageSize: 1,
              });
              if (!cancelled) setLineupCount(partData.count ?? partData.results.length);
            } catch {
              // ignore
            }
          }

          try {
            const mediaData = await api.list<any>('/media/items/', {
              params: { activity: closest.id },
              pageSize: 1,
            });
            if (!cancelled) setContentCount(mediaData.count ?? mediaData.results.length);
          } catch {
            // Media items endpoint may fail — ignore
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [project?.id]);

  // Derived state
  const matchState = useMemo(() => {
    if (!match) return null;
    const now = Date.now();
    const start = new Date(match.start_time).getTime();
    const end = match.end_time ? new Date(match.end_time).getTime() : start + 2 * 60 * 60 * 1000;

    if (now >= start && now <= end) return 'live' as const;
    if (now < start) return 'upcoming' as const;
    return 'played' as const;
  }, [match]);

  // Prefer club name (parent_project) over team name
  const teamName = match?.project?.club_name || match?.project?.name || 'Team';
  const opponent = match?.opponent_project?.club_name || match?.opponent_project?.name || match?.title?.split(' vs ')?.[1] || 'Tegenstander';

  // Vanity URL + navigation (hooks must be before early returns)
  const matchUrl = useMemo(
    () => match ? buildMatchVanityUrl(match, hierarchy) : '',
    [match?.id, match?.slug, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId],
  );

  const handleNavigateToMatch = useCallback((tab?: string) => {
    if (!match) return;
    setSheetOpen(false);
    const url = tab ? buildMatchVanityUrlWithTab(match, hierarchy, tab) : matchUrl;
    navigate(url, { state: { from: 'dashboard' } });
  }, [match?.id, matchUrl, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId, navigate]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loadingState}>
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth40}`} />
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth70Tall}`} />
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth55}`} />
        </div>
      </div>
    );
  }

  if (!match) {
    return null; // Don't show empty card at all — saves space
  }

  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const score = match.metadata?.score || match.metadata?.final_score;
  const isHome = match.metadata?.is_home !== false;
  const lineupFormation = (match.metadata?.lineup as any)?.formation as string | undefined;
  const hasLineup = lineupCount > 0;

  return (
    <>
      <div
        className={`${styles.card} ${styles[matchState || '']}`}
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
      >
        {/* Status badge */}
        <div className={styles.topRow}>
          <span className={`${styles.badge} ${styles[`badge_${matchState}`]}`}>
            {matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
          </span>
          <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
            {relTime}
          </span>
        </div>

        {/* Match teams */}
        <div className={styles.matchRow}>
          <div className={styles.teamSide}>
            <span className={styles.teamName}>{isHome ? teamName : opponent}</span>
          </div>

          <div className={styles.scoreBox}>
            {score ? (
              <span className={styles.score}>{score}</span>
            ) : (
              <span className={styles.vsLabel}>vs</span>
            )}
          </div>

          <div className={`${styles.teamSide} ${styles.teamRight}`}>
            <span className={styles.teamName}>{isHome ? opponent : teamName}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className={styles.metaRow}>
          {match.location && (
            <span className={styles.metaItem}>
              <MapPin size={12} /> {match.location}
            </span>
          )}
          {match.metadata?.venue && !match.location && (
            <span className={styles.metaItem}>
              <MapPin size={12} /> {match.metadata.venue}
            </span>
          )}
          <span className={styles.metaItem}>
            <Clock size={12} />
            {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' '}
            {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Status indicators */}
        <div className={styles.statusRow}>
          <span className={styles.contentBadge}>
            {contentCount > 0 ? (
              <><CheckCircle2 size={14} /> {contentCount} items</>
            ) : (
              <><Circle size={14} /> Nog geen content</>
            )}
          </span>

          <span className={`${styles.lineupBadge} ${hasLineup ? styles.lineupFilled : ''}`}>
            <Users size={14} />
            {hasLineup
              ? <>{lineupCount} spelers{lineupFormation ? ` · ${lineupFormation}` : ''}</>
              : <>Opstelling invullen</>
            }
          </span>
        </div>
      </div>

      {/* ── Match Sheet (iOS-like slide-up panel) ────────────────── */}
      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={match.title || `${teamName} vs ${opponent}`}
        icon={<Trophy size={18} />}
      >
        <div className={styles.sheetContent}>
          {/* Match overview */}
          <div className={styles.sheetMatchHeader}>
            <span className={`${styles.badge} ${styles[`badge_${matchState}`]}`}>
              {matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
            </span>
            <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
              {relTime}
            </span>
          </div>

          <div className={styles.sheetTeams}>
            <div className={styles.sheetTeam}>
              <span className={styles.sheetTeamName}>{isHome ? teamName : opponent}</span>
            </div>
            <div className={styles.sheetScore}>
              {score ? <span>{score}</span> : <span className={styles.vsLabel}>vs</span>}
            </div>
            <div className={styles.sheetTeam}>
              <span className={styles.sheetTeamName}>{isHome ? opponent : teamName}</span>
            </div>
          </div>

          <div className={styles.sheetMeta}>
            {match.location && (
              <span className={styles.metaItem}>
                <MapPin size={14} /> {match.location}
              </span>
            )}
            <span className={styles.metaItem}>
              <Calendar size={14} />
              {date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' om '}
              {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {match.period?.name && (
              <span className={styles.metaItem}>
                <Trophy size={14} /> {match.period.name}
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className={styles.sheetActions}>
            <button className={styles.sheetAction} onClick={() => { setSheetOpen(false); setLineupSheetOpen(true); }}>
              <Users size={18} />
              <div className={styles.sheetActionText}>
                <span className={styles.sheetActionLabel}>Opstelling</span>
                <span className={styles.sheetActionSub}>
                  {hasLineup
                    ? `${lineupCount} spelers${lineupFormation ? ` · ${lineupFormation}` : ''}`
                    : 'Opstelling invullen'
                  }
                </span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button className={styles.sheetAction} onClick={() => { setSheetOpen(false); setContentSheetOpen(true); }}>
              <FileImage size={18} />
              <div className={styles.sheetActionText}>
                <span className={styles.sheetActionLabel}>Content</span>
                <span className={styles.sheetActionSub}>
                  {contentCount > 0 ? `${contentCount} items gemaakt` : 'Content genereren'}
                </span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button
              className={`${styles.sheetAction} ${styles.sheetActionPrimary}`}
              onClick={() => handleNavigateToMatch()}
            >
              <ExternalLink size={18} />
              <div className={styles.sheetActionText}>
                <span className={styles.sheetActionLabel}>Open wedstrijd</span>
                <span className={styles.sheetActionSub}>Volledig wedstrijdoverzicht</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </NavigationSheet>

      {/* ── Lineup Sheet (inline editing from dashboard) ──────── */}
      <LineupSheet
        isOpen={lineupSheetOpen}
        onClose={() => setLineupSheetOpen(false)}
        match={match}
        onBack={() => { setLineupSheetOpen(false); setSheetOpen(true); }}
      />

      {/* ── Content Sheet (inline content from dashboard) ─────── */}
      <ContentSheet
        isOpen={contentSheetOpen}
        onClose={() => setContentSheetOpen(false)}
        match={match}
        onBack={() => { setContentSheetOpen(false); setSheetOpen(true); }}
        organisationId={match?.organisation?.id}
      />
    </>
  );
});
