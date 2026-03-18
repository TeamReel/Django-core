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
import React, { memo, useMemo, useCallback } from 'react';
import { Spinner } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, CheckCircle2, Circle, Users,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { routes } from '../../routes';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useClosestMatch } from '../../hooks/useClosestMatch';
import { slugify } from '../../utils/periodPath';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import { calculateMatchReadiness } from '../../utils/matchReadiness';
import { useMatchSheet } from './useMatchSheet';
import { MatchSheetFlow } from './MatchSheetFlow';
import { ReadinessRing } from './ReadinessRing';
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

export function buildMatchVanityUrl(
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

export function buildMatchVanityUrlWithTab(
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
  const navigate = useNavigate();
  const project = context.project;

  // ── Data via TanStack Query (D4) ──
  const { data: matchData, isLoading: loading } = useClosestMatch(project?.id);
  const match = matchData?.match ?? null;

  // ── Shared sheet state (H2 extraction) ──
  const sheet = useMatchSheet(match, matchData);

  // Vanity URL + navigation
  const matchUrl = useMemo(
    () => match ? buildMatchVanityUrl(match, hierarchy) : '',
    [match?.id, match?.slug, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId],
  );

  const handleNavigateToMatch = useCallback((tab?: string) => {
    if (!match) return;
    sheet.closeSheet();
    const url = tab ? buildMatchVanityUrlWithTab(match, hierarchy, tab) : matchUrl;
    navigate(url, { state: { from: 'dashboard' } });
  }, [match?.id, matchUrl, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId, navigate, sheet.closeSheet]);

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

  // Readiness calculation — shared utility
  const { percent: readinessPercent } = calculateMatchReadiness(
    sheet.contentDoneSubtypes,
    match,
  );

  return (
    <>
      <div
        className={`${styles.card} ${styles[sheet.matchState || '']}`}
        onClick={sheet.openSheet}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sheet.openSheet(); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={sheet.sheetOpen}
      >
        {/* Status badge + readiness ring */}
        <div className={styles.topRow}>
          <span className={`${styles.badge} ${styles[`badge_${sheet.matchState}`]}`}>
            {sheet.matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : sheet.matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
          </span>
          <div className={styles.topRowRight}>
            <ReadinessRing percent={readinessPercent} size={48} />
            <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
              {relTime}
            </span>
          </div>
        </div>

        {/* Match teams */}
        <div className={styles.matchRow}>
          <div className={styles.teamSide}>
            <span className={styles.teamName}>{sheet.isHome ? sheet.teamName : sheet.opponent}</span>
          </div>

          <div className={styles.scoreBox}>
            {sheet.score ? (
              <span className={styles.score}>{sheet.score}</span>
            ) : (
              <span className={styles.vsLabel}>vs</span>
            )}
          </div>

          <div className={`${styles.teamSide} ${styles.teamRight}`}>
            <span className={styles.teamName}>{sheet.isHome ? sheet.opponent : sheet.teamName}</span>
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
          <span className={`${styles.contentBadge} ${sheet.badgeBump === 'content' ? styles.badgeBump : ''}`}>
            {sheet.contentCount > 0 ? (
              <><CheckCircle2 size={14} /> {sheet.contentCount} items</>
            ) : (
              <><Circle size={14} /> Nog geen content</>
            )}
          </span>

          <span className={`${styles.lineupBadge} ${sheet.lineupCount > 0 ? styles.lineupFilled : ''} ${sheet.badgeBump === 'lineup' ? styles.badgeBump : ''}`}>
            <Users size={14} />
            {sheet.lineupCount > 0
              ? <>{sheet.lineupCount} spelers{sheet.lineupFormation ? ` · ${sheet.lineupFormation}` : ''}</>
              : <>Opstelling invullen</>
            }
          </span>
        </div>
      </div>

      {/* ── Unified Match Sheet Flow (overview + lineup + content creation) ── */}
      <MatchSheetFlow
        isOpen={sheet.sheetOpen}
        onClose={sheet.closeSheet}
        match={match}
        sheet={sheet}
        onNavigateToMatch={handleNavigateToMatch}
      />
    </>
  );
});
