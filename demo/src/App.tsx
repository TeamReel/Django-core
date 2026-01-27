import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecentsPage from './pages/RecentsPage';
import FavoritesPage from './pages/FavoritesPage';
import SearchPage from './pages/SearchPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import LoadingState from './components/LoadingState';
import FilesPage from './pages/files';
import {
  ProtectedRoute,
  AdminOnlyRoute,
  OrgAdminRoute,
} from './components/PermissionGuards';

import { OrgClubsPage } from './pages/identity/org-context/OrgClubsPage';
import { OrgTeamsPage } from './pages/identity/org-context/OrgTeamsPage';
import { OrgSeasonsPage } from './pages/identity/org-context/OrgSeasonsPage';
import { OrgCompetitionsPage } from './pages/identity/org-context/OrgCompetitionsPage';
import { OrgMatchesPage } from './pages/identity/org-context/OrgMatchesPage';
import { OrgUsersPage } from './pages/identity/org-context/OrgUsersPage';

// Identity pages
import {
  OrganisationsPage,

  OrganisationCreatePage,
  OrganisationEditPage,
  OrganisationDetailPage,
  MemberDetailPage,
  ProjectsPage,
  ProjectCreatePage,
  ProjectEditPage,
  ClubDetailPage,
  TeamDetailPage,
  SeasonDetailPage,
  PermissionsPage,
  UsersPage,
  UserDetailPage,
  ProfilePage,
  DirectoryPage,
} from './pages/identity';

// Config pages
import {
  AuditLogPage,
  OrganisationAuditPage,
  FeatureFlagsPage,
  CreditsPage,
  PreferencesPage,
  MembershipsPage,
  BillingPage,
} from './pages/config';
import UsageEventsPage from './pages/config/UsageEventsPage';

// Platform pages
import {
  HealthCheckPage,
  ConstitutionPage,
  SecurityPage,
  ObservabilityPage,
  ApiDocsPage,
  CachePerformancePage,
} from './pages/platform';

import WebSocketTestPage from './pages/platform/WebSocketTestPage';

// Integration Status
import IntegrationStatusPage from './pages/IntegrationStatusPage';

// Frontend pages
import {
  DesignSystemPage,
  AuthFlowsPage,
  ContextSwitcherPage,
  ResourceDisplayPage,
  TemplatesPage,
  ThemePage,
  IntegrationPatternsPage,
} from './pages/frontend';

// Docs pages
import {
  DocsPage,
  TasksPage,
  DeploymentPage,
} from './pages/docs';
import NotificationRoutingLogsPage from './pages/docs/NotificationRoutingLogsPage';
import NotificationsPage from './pages/NotificationsPage';
import RoutingRulesPage from './pages/config/RoutingRulesPage';
import MatchDetailPage from './pages/activities/MatchDetailPage';
import HierarchyMatchDetailPage from './pages/activities/HierarchyMatchDetailPage';
import ProjectHierarchyMatchRedirectPage from './pages/activities/ProjectHierarchyMatchRedirectPage';
import ProjectHierarchySeasonRedirectPage from './pages/activities/ProjectHierarchySeasonRedirectPage';
import ProjectHierarchyCompetitionRedirectPage from './pages/activities/ProjectHierarchyCompetitionRedirectPage';
import LegacyMatchRedirectPage from './pages/activities/LegacyMatchRedirectPage';
import AIStudioPage from './pages/aistudio/AIStudioPage';
import ContentLibraryPage from './pages/content/ContentLibraryPage';

// Period (Season/Competition) pages
import ProjectSeasonsPage from './pages/periods/ProjectSeasonsPage';
import ProjectCompetitionDetailPage from './pages/periods/ProjectCompetitionDetailPage';

// Work hierarchy pages
import ClubsPage from './pages/work/ClubsPage';
import TeamsPage from './pages/work/TeamsPage';
import SeasonsPage from './pages/work/SeasonsPage';
import CompetitionsPage from './pages/work/CompetitionsPage';
import FederationsPage from './pages/work/FederationsPage';
import MatchesPage from './pages/work/MatchesPage';


export default function App() {
  const { user } = useAuth();

  const LegacyDirectoryRedirect = ({ tab }: { tab: string }) => {
    const location = useLocation();
    const nextSearchParams = new URLSearchParams(location.search);
    nextSearchParams.set('tab', tab);
    const nextSearch = nextSearchParams.toString();
    return <Navigate to={`/directory${nextSearch ? `?${nextSearch}` : ''}`} replace />;
  };

  const LegacyOrgContextRedirect = ({ section }: { section: string }) => {
    const { orgId } = useParams<{ orgId: string }>();
    const orgKey = String(orgId || '').trim();
    const s = String(section || '').trim().toLowerCase();
    if (!orgKey || !s) return <Navigate to="/directory?tab=federations" replace />;
    return <Navigate to={`/${encodeURIComponent(orgKey)}/${encodeURIComponent(s)}`} replace />;
  };

  const OrgHierarchyRedirect = () => {
    const { orgId } = useParams<{ orgId: string }>();
    const orgKey = String(orgId || '').trim();
    if (!orgKey) return <Navigate to="/directory?tab=federations" replace />;
    return <Navigate to={`/${encodeURIComponent(orgKey)}?tab=hierarchy`} replace />;
  };

  const OrgProjectsRedirect = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return (
      <Navigate
        to={`/directory?tab=clubs&org_id=${encodeURIComponent(String(orgId || ''))}`}
        replace
      />
    );
  };

  const SeasonSquadRedirect = () => {
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

    const basePath = clubSlugOrId
      ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}`
      : `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}`;

    return <Navigate to={`${basePath}?tab=squad`} replace />;
  };

  const CompetitionMatchesRedirect = () => {
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
      ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}`
      : `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}`;

    const nextSearchParams = new URLSearchParams(location.search);
    nextSearchParams.set('tab', 'matches');
    const nextSearch = nextSearchParams.toString();
    return <Navigate to={`${basePath}${nextSearch ? `?${nextSearch}` : ''}`} replace />;
  };

  const CompetitionUsersRedirect = () => {
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
      ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}`
      : `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}`;

    const nextSearchParams = new URLSearchParams(location.search);
    nextSearchParams.set('tab', 'users');
    const nextSearch = nextSearchParams.toString();
    return <Navigate to={`${basePath}${nextSearch ? `?${nextSearch}` : ''}`} replace />;
  };

  // TeamReel hierarchy redirects to canonical entity-only routes
  const ClubDetailRedirect = () => {
    const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
    const location = useLocation();
    const orgSlugOrId = String(orgId || '').trim();
    const projectSlugOrId = String(projectId || '').trim();
    return <Navigate to={`/${orgSlugOrId}/${projectSlugOrId}${location.search || ''}`} replace />;
  };

  const TeamDetailRedirect = () => {
    const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
    const location = useLocation();
    const orgSlugOrId = String(orgId || '').trim();
    const clubSlugOrId = String(clubId || '').trim();
    const projectSlugOrId = String(projectId || '').trim();
    return (
      <Navigate
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const TeamSeasonsRedirect = () => {
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
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}${nextSearch ? `?${nextSearch}` : ''}`}
        replace
      />
    );
  };

  const TeamSeasonRedirect = () => {
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
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const ProjectSeasonRedirect = () => {
    const { orgId, projectId, seasonId } = useParams<{ orgId: string; projectId: string; seasonId: string }>();
    const location = useLocation();
    const orgSlugOrId = String(orgId || '').trim();
    const projectSlugOrId = String(projectId || '').trim();
    const seasonKeyOrId = String(seasonId || '').trim();
    return <Navigate to={`/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}${location.search || ''}`} replace />;
  };

  const ProjectCompetitionRedirect = () => {
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
        to={`/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const ProjectMatchRedirect = () => {
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
        to={`/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const TeamCompetitionRedirect = () => {
    const { orgId, clubId, projectId, seasonId, competitionId } = useParams<{
      orgId: string;
      clubId: string;
      projectId: string;
      seasonId: string;
      competitionId: string;
    }>();
    const location = useLocation();
    const orgSlugOrId = String(orgId || '').trim();
    const clubSlugOrId = String(clubId || '').trim();
    const projectSlugOrId = String(projectId || '').trim();
    const seasonKeyOrId = String(seasonId || '').trim();
    const competitionKeyOrId = String(competitionId || '').trim();
    return (
      <Navigate
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const TeamMatchRedirect = () => {
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
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}${location.search || ''}`}
        replace
      />
    );
  };

  const OrganisationDetailRedirect = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const orgSlugOrId = String(id || '').trim();
    return <Navigate to={`/${orgSlugOrId}${location.search || ''}`} replace />;
  };

  return (
    <Routes>
      {/* Redirect root based on auth state */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<MainLayout />}>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recents"
        element={
          <ProtectedRoute>
            <RecentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/directory"
        element={
          <ProtectedRoute>
            <DirectoryPage />
          </ProtectedRoute>
        }
      />

      {/* Activity / Match Routes */}
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <MatchesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/matches/:matchId"
        element={
          <ProtectedRoute>
            <LegacyMatchRedirectPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/federations"
        element={
          <ProtectedRoute>
            <FederationsPage />
          </ProtectedRoute>
        }
      />

      {/* Work hierarchy list pages */}
      <Route
        path="/clubs"
        element={
          <ProtectedRoute>
            <ClubsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seasons"
        element={
          <ProtectedRoute>
            <SeasonsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/competitions"
        element={
          <ProtectedRoute>
            <CompetitionsPage />
          </ProtectedRoute>
        }
      />

      {/* TeamReel hierarchy: Seasons/Competitions under a Project */}
      <Route
        path="/:orgId/projects/:projectId/seasons"
        element={
          <ProtectedRoute>
            <ProjectSeasonsPage />
          </ProtectedRoute>
        }
      />

      {/* Canonical project hierarchy (no /seasons /competitions /matches segments) */}
      <Route
        path="/:orgId/projects/:projectId/:seasonId"
        element={
          <ProtectedRoute>
            <ProjectHierarchySeasonRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/:seasonId/:competitionId"
        element={
          <ProtectedRoute>
            <ProjectHierarchyCompetitionRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/:seasonId/:competitionId/:matchId"
        element={
          <ProtectedRoute>
            <ProjectHierarchyMatchRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons"
        element={
          <ProtectedRoute>
            <TeamSeasonsRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <ProjectSeasonRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <TeamSeasonRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId/squad"
        element={
          <ProtectedRoute>
            <SeasonSquadRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/squad"
        element={
          <ProtectedRoute>
            <SeasonSquadRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId"
        element={
          <ProtectedRoute>
            <ProjectCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId"
        element={
          <ProtectedRoute>
            <TeamCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches"
        element={
          <ProtectedRoute>
            <CompetitionMatchesRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches"
        element={
          <ProtectedRoute>
            <CompetitionMatchesRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId"
        element={
          <ProtectedRoute>
            <ProjectHierarchyMatchRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId"
        element={
          <ProtectedRoute>
            <TeamMatchRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/squad"
        element={
          <ProtectedRoute>
            <CompetitionUsersRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/squad"
        element={
          <ProtectedRoute>
            <CompetitionUsersRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/:projectId/seasons"
        element={
          <ProtectedRoute>
            <ProjectSeasonsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons"
        element={
          <ProtectedRoute>
            <TeamSeasonsRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <ProjectSeasonRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <TeamSeasonRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId/squad"
        element={
          <ProtectedRoute>
            <SeasonSquadRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/squad"
        element={
          <ProtectedRoute>
            <SeasonSquadRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId"
        element={
          <ProtectedRoute>
            <ProjectCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId"
        element={
          <ProtectedRoute>
            <TeamCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches"
        element={
          <ProtectedRoute>
            <CompetitionMatchesRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches"
        element={
          <ProtectedRoute>
            <CompetitionMatchesRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId"
        element={
          <ProtectedRoute>
            <ProjectHierarchyMatchRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId"
        element={
          <ProtectedRoute>
            <TeamMatchRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/squad"
        element={
          <ProtectedRoute>
            <CompetitionUsersRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/squad"
        element={
          <ProtectedRoute>
            <CompetitionUsersRedirect />
          </ProtectedRoute>
        }
      />

      {/* Canonical TeamReel hierarchy (no projects/teams/seasons/competitions/matches segments) */}
      <Route
        path="/:orgId/:clubId/:projectId"
        element={
          <ProtectedRoute>
            <TeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/seasons"
        element={
          <ProtectedRoute>
            <TeamSeasonsRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/:seasonId"
        element={
          <ProtectedRoute>
            <SeasonDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/:seasonId/:competitionId"
        element={
          <ProtectedRoute>
            <ProjectCompetitionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId"
        element={
          <ProtectedRoute>
            <HierarchyMatchDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/:clubId/:projectId"
        element={
          <ProtectedRoute>
            <TeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/seasons"
        element={
          <ProtectedRoute>
            <TeamSeasonsRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/:seasonId"
        element={
          <ProtectedRoute>
            <SeasonDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId"
        element={
          <ProtectedRoute>
            <ProjectCompetitionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId"
        element={
          <ProtectedRoute>
            <HierarchyMatchDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Back-compat: old canonical vanity routes with a literal /seasons segment */}
      <Route
        path="/:orgId/:clubId/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <TeamSeasonRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId"
        element={
          <ProtectedRoute>
            <TeamCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId/:matchId"
        element={
          <ProtectedRoute>
            <TeamMatchRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/:clubId/:projectId/seasons/:seasonId"
        element={
          <ProtectedRoute>
            <TeamSeasonRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId"
        element={
          <ProtectedRoute>
            <TeamCompetitionRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId/:matchId"
        element={
          <ProtectedRoute>
            <TeamMatchRedirect />
          </ProtectedRoute>
        }
      />

      {/* AI Studio & Content */}
      <Route
        path="/studio/create"
        element={
          <ProtectedRoute>
            <AIStudioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <ContentLibraryPage />
          </ProtectedRoute>
        }
      />



      {/* Search route */}
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      {/* Identity routes */}
      <Route
        path="/organisations"
        element={
          <ProtectedRoute>
            <LegacyDirectoryRedirect tab="federations" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/create"
        element={
          <ProtectedRoute>
            <OrganisationCreatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/clubs"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="clubs" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/teams"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="teams" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/seasons"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="seasons" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/competitions"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="competitions" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/matches"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="matches" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisations/:orgId/users"
        element={
          <ProtectedRoute>
            <LegacyOrgContextRedirect section="users" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/clubs"
        element={
          <ProtectedRoute>
            <OrgClubsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/teams"
        element={
          <ProtectedRoute>
            <OrgTeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/seasons"
        element={
          <ProtectedRoute>
            <OrgSeasonsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/competitions"
        element={
          <ProtectedRoute>
            <OrgCompetitionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/matches"
        element={
          <ProtectedRoute>
            <OrgMatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:orgId/users"
        element={
          <ProtectedRoute>
            <OrgUsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/hierarchy"
        element={
          <ProtectedRoute>
            <OrgHierarchyRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:id"
        element={
          <ProtectedRoute>
            <OrganisationDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:id"
        element={
          <ProtectedRoute>
            <OrganisationDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:id/members/:memberId"
        element={
          <ProtectedRoute>
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:id/edit"
        element={
          <ProtectedRoute>
            <OrganisationEditPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects"
        element={
          <ProtectedRoute>
            <OrgProjectsRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/create"
        element={
          <ProtectedRoute>
            <ProjectCreatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/:projectId"
        element={
          <ProtectedRoute>
            <ClubDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/projects/:projectId"
        element={
          <ProtectedRoute>
            <ClubDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/:projectId"
        element={
          <ProtectedRoute>
            <ClubDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/:projectId"
        element={
          <ProtectedRoute>
            <ClubDetailPage />
          </ProtectedRoute>
        }
      />

      {/* TeamReel hierarchy: Team (Project child) under a Club */}
      <Route
        path="/organisations/:orgId/projects/:clubId/teams/:projectId"
        element={
          <ProtectedRoute>
              <TeamDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/:orgId/projects/:clubId/teams/:projectId"
        element={
          <ProtectedRoute>
              <TeamDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgId/projects/:projectId/edit"
        element={
          <ProtectedRoute>
            <ProjectEditPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Navigate to="/directory?tab=clubs" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/permissions"
        element={
          <AdminOnlyRoute>
            <PermissionsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/users"
        element={
          <OrgAdminRoute>
            <UsersPage />
          </OrgAdminRoute>
        }
      />

      <Route
        path="/users/:userId"
        element={
          <OrgAdminRoute>
            <UserDetailPage />
          </OrgAdminRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Navigate to="/preferences?tab=profile" replace />
          </ProtectedRoute>
        }
      />

      {/* Config routes */}
      <Route
        path="/audit"
        element={
          <OrgAdminRoute>
            <AuditLogPage />
          </OrgAdminRoute>
        }
      />

      <Route
        path="/organisation/audit"
        element={
          <OrgAdminRoute>
            <OrganisationAuditPage />
          </OrgAdminRoute>
        }
      />

      <Route
        path="/flags"
        element={
          <AdminOnlyRoute>
            <FeatureFlagsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/credits"
        element={
          <ProtectedRoute>
            <CreditsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/preferences"
        element={
          <ProtectedRoute>
            <PreferencesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/memberships"
        element={
          <ProtectedRoute>
            <MembershipsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usage-events"
        element={
          <AdminOnlyRoute>
            <UsageEventsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/routing-logs"
        element={
          <AdminOnlyRoute>
            <NotificationRoutingLogsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/routing-rules"
        element={
          <OrgAdminRoute>
            <RoutingRulesPage />
          </OrgAdminRoute>
        }
      />

      {/* Platform routes */}
      <Route
        path="/health"
        element={
          <AdminOnlyRoute>
            <HealthCheckPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/constitution"
        element={
          <AdminOnlyRoute>
            <ConstitutionPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/security"
        element={
          <AdminOnlyRoute>
            <SecurityPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/observability"
        element={
          <AdminOnlyRoute>
            <ObservabilityPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/api-docs"
        element={
          <AdminOnlyRoute>
            <ApiDocsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/demo/websockets"
        element={
          <AdminOnlyRoute>
            <WebSocketTestPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/demo/performance"
        element={
          <AdminOnlyRoute>
            <CachePerformancePage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/integration-status"
        element={
          <AdminOnlyRoute>
            <IntegrationStatusPage />
          </AdminOnlyRoute>
        }
      />

      {/* Frontend Resource routes */}
      <Route
        path="/design-system"
        element={
          <AdminOnlyRoute>
            <DesignSystemPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/auth-flows"
        element={
          <AdminOnlyRoute>
            <AuthFlowsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/context"
        element={
          <AdminOnlyRoute>
            <ContextSwitcherPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/resources"
        element={
          <AdminOnlyRoute>
            <ResourceDisplayPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/templates"
        element={
          <AdminOnlyRoute>
            <TemplatesPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/theme"
        element={
          <AdminOnlyRoute>
            <ThemePage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/integration"
        element={
          <AdminOnlyRoute>
            <IntegrationPatternsPage />
          </AdminOnlyRoute>
        }
      />

      {/* Documentation routes */}
      <Route
        path="/docs"
        element={
          <AdminOnlyRoute>
            <DocsPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <AdminOnlyRoute>
            <TasksPage />
          </AdminOnlyRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/deployment"
        element={
          <AdminOnlyRoute>
            <DeploymentPage />
          </AdminOnlyRoute>
        }
      />

      {/* Files Demo */}
      <Route
        path="/demo/files"
        element={
          <AdminOnlyRoute>
            <FilesPage />
          </AdminOnlyRoute>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Catch-all: 404 for unknown routes */}
      <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
