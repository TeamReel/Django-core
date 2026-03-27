/**
 * MatchesCard — Combined upcoming + past matches with tab switcher.
 *
 * Default tab: "Komend" (upcoming matches with readiness).
 * Second tab: "Gespeeld" (past matches with scores).
 * Tap a match → opens the reusable MatchSheetFlow.
 */
import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, History, ChevronRight, MapPin, Calendar, Plus,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { formatRelativeTime } from '../../utils/relativeTime';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useUpcomingMatches } from '../../hooks/useUpcomingMatches';
import { usePastMatches } from '../../hooks/usePastMatches';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import { useMatchSheet } from './useMatchSheet';
import { MatchSheetFlow } from './MatchSheetFlow';
import { ReadinessRing } from './ReadinessRing';
import { buildMatchVanityUrl, buildMatchVanityUrlWithTab } from './ActiveMatchCard';
import type { Match } from './ActiveMatchCard';
import { useMatchListReadiness, type ReadinessMap } from '../../hooks/useMatchListReadiness';
import { Avatar } from '../ui/Avatar';
import styles from './MatchesCard.module.css';

type Tab = 'upcoming' | 'past';

export const MatchesCard = memo(function MatchesCard() {
  const { context } = useContextSwitcher();
  const { user } = useAuth();
  const hierarchy = useAppSelection();
  const navigate = useNavigate();
  const project = context.project;
  const org = context.organisation;

  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const upcoming = useUpcomingMatches(project?.id, 5);
  const past = usePastMatches(project?.id, 5);

  // Club logo fallback for match rows where metadata logos are missing
  const myClub = user?.projects?.find(p => p.parent == null);
  const { getAssetUrl: getClubAssetUrl } = useBrandProfile({
    organisationId: org?.id?.toString(),
    projectId: myClub?.id || project?.id,
  });
  const clubLogoUrl = getClubAssetUrl('logo') ?? undefined;

  const upcomingMatches = upcoming.data?.matches ?? [];
  const pastMatches = past.data?.matches ?? [];
  const allMatches = [...upcomingMatches, ...pastMatches];
  const { data: readinessMap } = useMatchListReadiness(allMatches);
  const isLoading = activeTab === 'upcoming' ? upcoming.isLoading : past.isLoading;
  const matches = activeTab === 'upcoming' ? upcomingMatches : pastMatches;
  const total = activeTab === 'upcoming'
    ? (upcoming.data?.total ?? upcomingMatches.length)
    : (past.data?.total ?? pastMatches.length);

  // Selected match for MatchSheet
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

  return (
    <>
      <div className={styles.card}>
        {/* ── Header with tabs ──────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.tabs} role="tablist" aria-label="Wedstrijden weergave">
            <button
              role="tab"
              aria-selected={activeTab === 'upcoming'}
              className={`${styles.tab} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <CalendarDays size={14} />
              Komend
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'past'}
              className={`${styles.tab} ${activeTab === 'past' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('past')}
            >
              <History size={14} />
              Gespeeld
            </button>
          </div>

          {!isLoading && matches.length > 0 && (
            <span className={styles.headerCount}>{total} totaal</span>
          )}

          <button
            className={styles.addMatchBtn}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', { detail: { flow: 'match' } }));
            }}
            aria-label="Wedstrijd toevoegen"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div role="tabpanel" aria-label={activeTab === 'upcoming' ? 'Komende wedstrijden' : 'Gespeelde wedstrijden'}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.shimmerLine} />
              <div className={styles.shimmerLine} />
              <div className={styles.shimmerLine} />
            </div>
          ) : matches.length === 0 ? (
            <div className={styles.emptyState}>
              {activeTab === 'upcoming' ? (
                <>
                  <CalendarDays size={32} className={styles.emptyIcon} />
                  <span>Geen wedstrijden gepland</span>
                </>
              ) : (
                <>
                  <History size={32} className={styles.emptyIcon} />
                  <span>Nog geen gespeelde wedstrijden</span>
                </>
              )}
            </div>
          ) : (
            <div className={styles.matchList}>
              {matches.map(match => (
                activeTab === 'upcoming' ? (
                  <UpcomingMatchRow key={match.id} match={match} onSelect={handleSelectMatch} readinessMap={readinessMap} clubLogoUrl={clubLogoUrl} />
                ) : (
                  <PastMatchRow key={match.id} match={match} onSelect={handleSelectMatch} readinessMap={readinessMap} clubLogoUrl={clubLogoUrl} />
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified Match Sheet Flow */}
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

/* ── Upcoming Match Row (with readiness ring) ──────────────────────── */

interface MatchRowProps {
  match: Match;
  onSelect: (match: Match) => void;
  readinessMap?: ReadinessMap;
  clubLogoUrl?: string;
}

const UpcomingMatchRow: React.FC<MatchRowProps> = memo(function UpcomingMatchRow({ match, onSelect, readinessMap, clubLogoUrl }) {
  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const teamName = match.project?.club_name || match.project?.name || 'Team';
  const opponent = match.opponent_project?.club_name || match.opponent_project?.name || match.title?.split(' vs ')?.[1] || 'Tegenstander';
  const isHome = match.metadata?.is_home !== false;

  const homeLogo = (match.metadata?.identity?.home_team_logo_url as string | undefined) || (isHome ? clubLogoUrl : undefined);
  const awayLogo = (match.metadata?.identity?.away_team_logo_url as string | undefined) || (!isHome ? clubLogoUrl : undefined);
  const homeName = isHome ? teamName : opponent;
  const awayName = isHome ? opponent : teamName;

  const readiness = readinessMap?.get(match.id)?.percent ?? 0;

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
            {' · '}
            {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span> · {relTime}</span>
        </div>
        <div className={styles.matchTeams}>
          <Avatar src={homeLogo} name={homeName} size="xs" alt={`${homeName} logo`} />
          <span className={styles.matchTitle}>{homeName}</span>
          <span className={styles.matchVs}>vs</span>
          <Avatar src={awayLogo} name={awayName} size="xs" alt={`${awayName} logo`} />
          <span className={styles.matchTitle}>{awayName}</span>
        </div>
        {match.location && (
          <div className={styles.matchLocation}>
            <MapPin size={11} />
            <span>{match.location}</span>
          </div>
        )}
      </div>

      <div className={styles.matchReadiness}>
        <ReadinessRing percent={readiness} size={32} showLabel={false} />
      </div>

      <ChevronRight size={16} className={styles.chevron} />
    </div>
  );
});

/* ── Past Match Row (with score) ───────────────────────────────────── */

const PastMatchRow: React.FC<MatchRowProps> = memo(function PastMatchRow({ match, onSelect, readinessMap, clubLogoUrl }) {
  const date = new Date(match.start_time);
  const teamName = match.project?.club_name || match.project?.name || 'Team';
  const opponent = match.opponent_project?.club_name || match.opponent_project?.name || match.title?.split(' vs ')?.[1] || 'Tegenstander';
  const isHome = match.metadata?.is_home !== false;

  const homeLogo = (match.metadata?.identity?.home_team_logo_url as string | undefined) || (isHome ? clubLogoUrl : undefined);
  const awayLogo = (match.metadata?.identity?.away_team_logo_url as string | undefined) || (!isHome ? clubLogoUrl : undefined);
  const homeName = isHome ? teamName : opponent;
  const awayName = isHome ? opponent : teamName;

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
        <div className={styles.matchTeams}>
          <Avatar src={homeLogo} name={homeName} size="xs" alt={`${homeName} logo`} />
          <span className={styles.matchTitle}>{homeName}</span>
          <span className={styles.matchVs}>vs</span>
          <Avatar src={awayLogo} name={awayName} size="xs" alt={`${awayName} logo`} />
          <span className={styles.matchTitle}>{awayName}</span>
        </div>
        {match.location && (
          <div className={styles.matchLocation}>
            <MapPin size={11} />
            <span>{match.location}</span>
          </div>
        )}
      </div>

      <div className={styles.matchMeta}>
        {hasScore && (
          <div className={styles.matchScore}>
            <span>{homeScore}</span>
            <span className={styles.scoreDash}>–</span>
            <span>{awayScore}</span>
          </div>
        )}
        <ReadinessRing percent={readinessMap?.get(match.id)?.percent ?? 0} size={32} showLabel={false} />
      </div>

      <ChevronRight size={16} className={styles.chevron} />
    </div>
  );
});
