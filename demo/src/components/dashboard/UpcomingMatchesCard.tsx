/**
 * UpcomingMatchesCard — Shows next 5 upcoming matches with readiness %.
 *
 * Tap a match → opens the reusable MatchSheet (same as ActiveMatchCard).
 * Each row shows date, title, location, and a readiness progress bar.
 */
import React, { memo, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { formatRelativeTime } from '../../utils/relativeTime';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useUpcomingMatches } from '../../hooks/useUpcomingMatches';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import { useMatchSheet } from './useMatchSheet';
import { MatchSheet } from './MatchSheet';
import { LineupSheet } from './LineupSheet';
import { ContentSheet } from './ContentSheet';
import { buildMatchVanityUrl, buildMatchVanityUrlWithTab } from './ActiveMatchCard';
import type { Match } from './ActiveMatchCard';
import styles from './UpcomingMatchesCard.module.css';

// Total match content items (pre + during + post)
const TOTAL_MATCH_ITEMS =
  (CONTENT_TYPES.pre_match?.items.length ?? 0) +
  (CONTENT_TYPES.during_match?.items.length ?? 0) +
  (CONTENT_TYPES.post_match?.items.length ?? 0);

export const UpcomingMatchesCard = memo(function UpcomingMatchesCard() {
  const { context } = useContextSwitcher();
  const hierarchy = useAppSelection();
  const navigate = useNavigate();
  const project = context.project;

  const { data, isLoading } = useUpcomingMatches(project?.id, 5);
  const matches = data?.matches ?? [];

  // Selected match for the MatchSheet
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const sheet = useMatchSheet(selectedMatch);

  const handleSelectMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
    // Need to open sheet after state update — use setTimeout to ensure sync
    setTimeout(() => sheet.openSheet(), 0);
  }, [sheet.openSheet]);

  // We need a stable ref to selectedMatch for navigation
  const handleNavigateToMatch = useCallback((tab?: string) => {
    if (!selectedMatch) return;
    sheet.closeSheet();
    const url = tab
      ? buildMatchVanityUrlWithTab(selectedMatch, hierarchy, tab)
      : buildMatchVanityUrl(selectedMatch, hierarchy);
    navigate(url, { state: { from: 'dashboard' } });
  }, [selectedMatch, hierarchy, navigate, sheet.closeSheet]);

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <CalendarDays size={16} className={styles.headerIcon} />
          <span>Komende wedstrijden</span>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.shimmerLine} />
          <div className={styles.shimmerLine} />
          <div className={styles.shimmerLine} />
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <CalendarDays size={16} className={styles.headerIcon} />
          <span>Komende wedstrijden</span>
        </div>
        <div className={styles.emptyState}>
          <CalendarDays size={32} className={styles.emptyIcon} />
          <span>Geen wedstrijden gepland</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <CalendarDays size={16} className={styles.headerIcon} />
          <span>Komende wedstrijden</span>
          <span className={styles.headerCount}>{data?.total ?? matches.length} totaal</span>
        </div>

        <div className={styles.matchList}>
          {matches.map(match => (
            <MatchRow
              key={match.id}
              match={match}
              onSelect={handleSelectMatch}
            />
          ))}
        </div>
      </div>

      {/* Reusable MatchSheet — opens when a match is tapped */}
      {selectedMatch && (
        <>
          <MatchSheet
            match={selectedMatch}
            sheet={sheet}
            onNavigateToMatch={handleNavigateToMatch}
          />
          <LineupSheet
            isOpen={sheet.lineupSheetOpen}
            onClose={sheet.closeLineupSheet}
            match={selectedMatch}
            onBack={() => { sheet.closeLineupSheet(); sheet.openSheet(); }}
            onLineupSaved={sheet.handleLineupSaved}
          />
          <ContentSheet
            isOpen={sheet.contentSheetOpen}
            onClose={sheet.closeContentSheet}
            match={selectedMatch}
            onBack={() => { sheet.closeContentSheet(); sheet.openSheet(); }}
            organisationId={selectedMatch?.organisation?.id}
            onContentGenerated={sheet.handleContentGenerated}
          />
        </>
      )}
    </>
  );
});

/* ── Match Row ─────────────────────────────────────────────────────── */

interface MatchRowProps {
  match: Match;
  onSelect: (match: Match) => void;
}

const MatchRow: React.FC<MatchRowProps> = memo(function MatchRow({ match, onSelect }) {
  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const teamName = match.project?.club_name || match.project?.name || 'Team';
  const opponent = match.opponent_project?.club_name || match.opponent_project?.name || match.title?.split(' vs ')?.[1] || 'Tegenstander';
  const isHome = match.metadata?.is_home !== false;

  // Calculate readiness from metadata (basic: check if lineup exists)
  const lineupData = match.metadata?.lineup as any;
  const hasLineup = lineupData && (
    (Array.isArray(lineupData.goalkeeper) && lineupData.goalkeeper.length > 0) ||
    (Array.isArray(lineupData.player) && lineupData.player.length > 0) ||
    (Array.isArray(lineupData.positions) && lineupData.positions.length > 0)
  );

  // Readiness estimate: simple version — lineup counts as ~20% of readiness
  // Full readiness requires media item fetch (done when sheet opens via useMatchSheet)
  const readiness: number = hasLineup ? 20 : 0;

  return (
    <div
      className={styles.matchRow}
      onClick={() => onSelect(match)}
      role="button"
      tabIndex={0}
    >
      <div className={styles.matchInfo}>
        <div className={styles.matchDate}>
          <Calendar size={11} />
          <span>
            {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}
            {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span> · {relTime}</span>
        </div>
        <div className={styles.matchTitle}>
          {isHome ? teamName : opponent} vs {isHome ? opponent : teamName}
        </div>
        {match.location && (
          <div className={styles.matchLocation}>
            <MapPin size={11} />
            <span>{match.location}</span>
          </div>
        )}
      </div>

      <div className={styles.matchReadiness}>
        <span
          className={styles.readinessPercent}
          data-ready={readiness === 100 ? 'true' : 'false'}
        >
          {readiness}%
        </span>
        <div className={styles.readinessBar}>
          <div
            className={styles.readinessFill}
            style={{ width: `${readiness}%` }}
            data-ready={readiness === 100 ? 'true' : 'false'}
          />
        </div>
      </div>

      <ChevronRight size={16} className={styles.chevron} />
    </div>
  );
});
