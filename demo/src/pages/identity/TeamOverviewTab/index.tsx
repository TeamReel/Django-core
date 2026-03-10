/**
 * TeamOverviewTab - Team overview dashboard with multiple cards
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import {
  HeroCard,
  BrandAssetsCard,
  MediaAssetsCard,
  SeasonsCard,
  MatchesCard,
  MembersCard,
  TeamDetailsCard,
} from './TeamOverviewCards';
import type { TeamOverviewTabProps, MatchRecord } from './types';
import ov from '../TeamOverviewTab.module.css';

// Re-export types
export type {
  TeamOverviewTabProps,
  HierarchyData,
  OverviewMembersData,
  RouteKeys,
  BrandContentData,
  TeamMatchData,
} from './types';

export function TeamOverviewTab({
  hierarchy,
  overviewMembers,
  routeKeys,
  team,
  club,
  org,
  makeTabHref,
  brand,
  matchData,
}: TeamOverviewTabProps) {
  const navigate = useNavigate();

  const {
    seasons: hierarchySeasons,
    competitionsBySeasonId: hierarchyCompetitionsBySeasonId,
    matchesCountBySeasonId: hierarchyMatchesCountBySeasonId,
    loading: hierarchyLoading,
    error: hierarchyError,
  } = hierarchy;

  const {
    members: overviewMembersList,
    count: overviewMembersCount,
    loading: overviewMembersLoading,
    error: overviewMembersError,
  } = overviewMembers;

  const { brandAssets, assetStats, fullMembersLoading, contentCount, contentCountLoading } = brand;
  const { matches: teamMatches, loading: teamMatchesLoading } = matchData;

  const totalCompetitions = Object.values(hierarchyCompetitionsBySeasonId || {}).reduce(
    (sum, list) => sum + (list?.length || 0),
    0
  );

  // Compute overall assets % from tracked slots
  const overallAssetPct = useMemo(() => {
    if (!assetStats.length) return 0;
    const totalDone = assetStats.reduce((s, a) => s + a.done, 0);
    const totalAll = assetStats.reduce((s, a) => s + a.total, 0);
    return totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  }, [assetStats]);

  // Recent matches (past, sorted most recent first)
  const recentMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return teamMatches
      .filter((m: MatchRecord) => {
        const d = m.start_time || m.date || m.metadata?.date;
        if (!d) return false;
        return new Date(d) < now;
      })
      .sort((a: MatchRecord, b: MatchRecord) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date).getTime();
        return db - da;
      })
      .slice(0, 4);
  }, [teamMatches]);

  // Upcoming matches (future or today, sorted soonest first)
  const upcomingMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return teamMatches
      .filter((m: MatchRecord) => {
        const d = m.start_time || m.date || m.metadata?.date;
        if (!d) return false;
        return new Date(d) >= now;
      })
      .sort((a: MatchRecord, b: MatchRecord) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date).getTime();
        return da - db;
      })
      .slice(0, 3);
  }, [teamMatches]);

  return (
    <div className={ov.overviewRoot}>
      {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}
      {overviewMembersError && <Alert variant="error">{overviewMembersError}</Alert>}

      <HeroCard
        team={team}
        club={club}
        org={org}
        membersCount={overviewMembersCount}
        membersLoading={overviewMembersLoading}
        seasonsCount={hierarchySeasons.length}
        seasonsLoading={hierarchyLoading}
        contentCount={contentCount}
        contentLoading={contentCountLoading}
        overallAssetPct={overallAssetPct}
        assetsLoading={fullMembersLoading}
      />

      <BrandAssetsCard
        brandAssets={brandAssets}
        onNavigate={() => navigate(makeTabHref('identity'))}
      />

      <MediaAssetsCard
        assetStats={assetStats}
        loading={fullMembersLoading}
        onNavigate={() => navigate(makeTabHref('media'))}
      />

      <SeasonsCard
        seasons={hierarchySeasons}
        competitionsBySeasonId={hierarchyCompetitionsBySeasonId}
        matchesCountBySeasonId={hierarchyMatchesCountBySeasonId}
        loading={hierarchyLoading}
        routeKeys={routeKeys}
        onNavigate={() => navigate(makeTabHref('hierarchy'))}
        onSeasonClick={(path) => navigate(path)}
      />

      {(upcomingMatches.length > 0 || teamMatchesLoading) && (
        <MatchesCard
          title="Aankomend"
          matches={upcomingMatches}
          loading={teamMatchesLoading}
          showLink
          onNavigate={() => navigate(makeTabHref('hierarchy'))}
        />
      )}

      {recentMatches.length > 0 && (
        <MatchesCard
          title="Recente wedstrijden"
          matches={recentMatches}
          loading={false}
        />
      )}

      <MembersCard
        members={overviewMembersList}
        loading={overviewMembersLoading}
        onNavigate={() => navigate(makeTabHref('members'))}
      />

      <TeamDetailsCard
        team={team}
        club={club}
        org={org}
        totalCompetitions={totalCompetitions}
        loading={hierarchyLoading}
      />
    </div>
  );
}
