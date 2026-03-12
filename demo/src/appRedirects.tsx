import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { routes } from './routes';

// =============================================================================
// Redirect components for legacy / back-compat URL patterns.
// Extracted from App.tsx — each maps an old URL to a canonical one.
// All URL construction uses routes.ts helpers.
// =============================================================================

export function LegacyDirectoryRedirect({ tab }: { tab: string }) {
  const location = useLocation();
  const nextSearchParams = new URLSearchParams(location.search);
  nextSearchParams.set('tab', tab);
  const nextSearch = nextSearchParams.toString();
  return <Navigate to={`/directory${nextSearch ? `?${nextSearch}` : ''}`} replace />;
}

export function LegacyOrgContextRedirect({ section }: { section: string }) {
  const { orgId } = useParams<{ orgId: string }>();
  const orgKey = String(orgId || '').trim();
  const s = String(section || '').trim().toLowerCase();
  if (!orgKey || !s) return <Navigate to={routes.directory({ tab: 'federations' })} replace />;
  return <Navigate to={`/${encodeURIComponent(orgKey)}/${encodeURIComponent(s)}`} replace />;
}

export function OrgHierarchyRedirect() {
  const { orgId } = useParams<{ orgId: string }>();
  const orgKey = String(orgId || '').trim();
  if (!orgKey) return <Navigate to={routes.directory({ tab: 'federations' })} replace />;
  return <Navigate to={routes.orgHierarchy({ orgId: orgKey })} replace />;
}

export function OrgProjectsRedirect() {
  const { orgId } = useParams<{ orgId: string }>();
  return (
    <Navigate
      to={routes.directory({ tab: 'clubs', orgId: String(orgId || '') })}
      replace
    />
  );
}

export function SeasonSquadRedirect() {
  const { orgId, projectId, seasonId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    clubId?: string;
  }>();

  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();

  const to = clubSlugOrId
    ? routes.seasonWithTab({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, tab: 'squad' })
    : `${routes.projectSeason({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId })}?tab=squad`;

  return <Navigate to={to} replace />;
}

export function CompetitionMatchesRedirect() {
  const { orgId, projectId, seasonId, competitionId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    clubId?: string;
  }>();

  const location = useLocation();

  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();

  const basePath = clubSlugOrId
    ? routes.competition({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId })
    : routes.projectCompetition({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId });

  const nextSearchParams = new URLSearchParams(location.search);
  nextSearchParams.set('tab', 'matches');
  const nextSearch = nextSearchParams.toString();
  return <Navigate to={`${basePath}${nextSearch ? `?${nextSearch}` : ''}`} replace />;
}

export function CompetitionUsersRedirect() {
  const { orgId, projectId, seasonId, competitionId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    clubId?: string;
  }>();

  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();

  const location = useLocation();
  const basePath = clubSlugOrId
    ? routes.competition({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId })
    : routes.projectCompetition({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId });

  const nextSearchParams = new URLSearchParams(location.search);
  nextSearchParams.set('tab', 'users');
  const nextSearch = nextSearchParams.toString();
  return <Navigate to={`${basePath}${nextSearch ? `?${nextSearch}` : ''}`} replace />;
}

export function ClubDetailRedirect() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  return <Navigate to={`${routes.club({ orgId: orgSlugOrId, clubId: projectSlugOrId })}${location.search || ''}`} replace />;
}

export function TeamDetailRedirect() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  return (
    <Navigate
      to={`${routes.team({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId })}${location.search || ''}`}
      replace
    />
  );
}

export function TeamSeasonsRedirect() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const nextSearchParams = new URLSearchParams(location.search);
  nextSearchParams.set('tab', 'seasons');
  const nextSearch = nextSearchParams.toString();
  return (
    <Navigate
      to={`${routes.team({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId })}${nextSearch ? `?${nextSearch}` : ''}`}
      replace
    />
  );
}

export function TeamSeasonRedirect() {
  const { orgId, clubId, projectId, seasonId } = useParams<{
    orgId: string;
    clubId: string;
    projectId: string;
    seasonId: string;
  }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  return (
    <Navigate
      to={`${routes.season({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId })}${location.search || ''}`}
      replace
    />
  );
}

export function ProjectSeasonRedirect() {
  const { orgId, projectId, seasonId } = useParams<{ orgId: string; projectId: string; seasonId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  return <Navigate to={`${routes.projectSeason({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId })}${location.search || ''}`} replace />;
}

export function ProjectCompetitionRedirect() {
  const { orgId, projectId, seasonId, competitionId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
  }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  return (
    <Navigate
      to={`${routes.projectCompetition({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId })}${location.search || ''}`}
      replace
    />
  );
}

export function ProjectMatchRedirect() {
  const { orgId, projectId, seasonId, competitionId, matchId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
  }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  const matchKeyOrId = String(matchId || '').trim();
  return (
    <Navigate
      to={`${routes.projectMatch({ orgId: orgSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId, matchId: matchKeyOrId })}${location.search || ''}`}
      replace
    />
  );
}

export function TeamCompetitionRedirect() {
  const { orgId, clubId, projectId, seasonId } = useParams<{
    orgId: string;
    clubId: string;
    projectId: string;
    seasonId: string;
  }>();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  return (
    <Navigate
      to={routes.seasonWithTab({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, tab: 'competitions' })}
      replace
    />
  );
}

export function TeamMatchRedirect() {
  const { orgId, clubId, projectId, seasonId, competitionId, matchId } = useParams<{
    orgId: string;
    clubId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
  }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  const matchKeyOrId = String(matchId || '').trim();
  return (
    <Navigate
      to={`${routes.match({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId, seasonId: seasonKeyOrId, competitionId: competitionKeyOrId, matchId: matchKeyOrId })}${location.search || ''}`}
      replace
    />
  );
}

export function OrganisationDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const orgSlugOrId = String(id || '').trim();
  return <Navigate to={`${routes.orgDetail({ orgId: orgSlugOrId })}${location.search || ''}`} replace />;
}
