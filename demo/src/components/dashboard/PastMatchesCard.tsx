/**
 * PastMatchesCard — Shows recent past matches with scores.
 *
 * Tap a match → opens the reusable MatchSheetFlow (same as UpcomingMatchesCard).
 * Each row shows date, title, location, and score (if available).
 */
import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAppSelection } from '../../hooks/useAppSelection';
import { usePastMatches } from '../../hooks/usePastMatches';
import { useMatchSheet } from './useMatchSheet';
import { MatchSheetFlow } from './MatchSheetFlow';
import { buildMatchVanityUrl, buildMatchVanityUrlWithTab } from './ActiveMatchCard';
import type { Match } from './ActiveMatchCard';
import styles from './PastMatchesCard.module.css';

export const PastMatchesCard = memo(function PastMatchesCard() {
  const { context } = useContextSwitcher();
  const hierarchy = useAppSelection();
  const navigate = useNavigate();
  const project = context.project;

  const { data, isLoading } = usePastMatches(project?.id, 5);
  const matches = data?.matches ?? [];

  // Selected match for the MatchSheet
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const sheet = useMatchSheet(selectedMatch);

  const handleSelectMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
    setTimeout(() => sheet.openSheet(), 0);
  }, [sheet.openSheet]);

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
          <History size={16} className={styles.headerIcon} />
          <span>Gespeelde wedstrijden</span>
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
          <History size={16} className={styles.headerIcon} />
          <span>Gespeelde wedstrijden</span>
        </div>
        <div className={styles.emptyState}>
          <History size={32} className={styles.emptyIcon} />
          <span>Nog geen gespeelde wedstrijden</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <History size={16} className={styles.headerIcon} />
          <span>Gespeelde wedstrijden</span>
          <span className={styles.headerCount}>{data?.total ?? matches.length} totaal</span>
        </div>

        <div className={styles.matchList}>
          {matches.map(match => (
            <PastMatchRow
              key={match.id}
              match={match}
              onSelect={handleSelectMatch}
            />
          ))}
        </div>
      </div>

      {selectedMatch && (
        <MatchSheetFlow
          isOpen={sheet.sheetOpen}
          onClose={sheet.closeSheet}
          match={selectedMatch}
          sheet={sheet}
          onNavigateToMatch={handleNavigateToMatch}
        />
      )}
    </>
  );
});

/* ── Past Match Row ────────────────────────────────────────────────── */

interface PastMatchRowProps {
  match: Match;
  onSelect: (match: Match) => void;
}

const PastMatchRow: React.FC<PastMatchRowProps> = memo(function PastMatchRow({ match, onSelect }) {
  const date = new Date(match.start_time);
  const teamName = match.project?.club_name || match.project?.name || 'Team';
  const opponent = match.opponent_project?.club_name || match.opponent_project?.name || match.title?.split(' vs ')?.[1] || 'Tegenstander';
  const isHome = match.metadata?.is_home !== false;

  const homeScore = match.metadata?.home_score as number | undefined;
  const awayScore = match.metadata?.away_score as number | undefined;
  const hasScore = homeScore != null && awayScore != null;

  return (
    <div
      className={styles.matchRow}
      onClick={() => onSelect(match)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(match); } }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.matchInfo}>
        <div className={styles.matchDate}>
          <Calendar size={11} />
          <span>
            {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
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

      <div className={styles.matchScore}>
        {hasScore ? (
          <>
            <span>{homeScore}</span>
            <span className={styles.scoreDash}>–</span>
            <span>{awayScore}</span>
          </>
        ) : (
          <span className={styles.noScore}>Gespeeld</span>
        )}
      </div>

      <ChevronRight size={16} className={styles.chevron} />
    </div>
  );
});
