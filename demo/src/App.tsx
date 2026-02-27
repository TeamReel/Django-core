import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from '@django-core/auth-ui';
import LoadingState from './components/LoadingState';
import {
  ProtectedRoute,
  AdminOnlyRoute,
  OrgAdminRoute,
} from './components/PermissionGuards';

// =============================================================================
// Critical pages (eager load for first-paint performance)
// =============================================================================
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';

// =============================================================================
// Lazy-loaded pages (code-split for better bundle size)
// =============================================================================

// Core navigation pages
const RecentsPage = lazy(() => import('./pages/RecentsPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FilesPage = lazy(() => import('./pages/files'));
const MediaLibraryPage = lazy(() => import('./pages/medialib'));

// Org context pages
const OrgClubsPage = lazy(() => import('./pages/identity/org-context/OrgClubsPage').then(m => ({ default: m.OrgClubsPage })));
const OrgTeamsPage = lazy(() => import('./pages/identity/org-context/OrgTeamsPage').then(m => ({ default: m.OrgTeamsPage })));
const OrgSeasonsPage = lazy(() => import('./pages/identity/org-context/OrgSeasonsPage').then(m => ({ default: m.OrgSeasonsPage })));
const OrgCompetitionsPage = lazy(() => import('./pages/identity/org-context/OrgCompetitionsPage').then(m => ({ default: m.OrgCompetitionsPage })));
const OrgMatchesPage = lazy(() => import('./pages/identity/org-context/OrgMatchesPage').then(m => ({ default: m.OrgMatchesPage })));
const OrgUsersPage = lazy(() => import('./pages/identity/org-context/OrgUsersPage').then(m => ({ default: m.OrgUsersPage })));

// Identity pages
const OrganisationsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationsPage })));
const OrganisationCreatePage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationCreatePage })));
const OrganisationEditPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationEditPage })));
const OrganisationDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationDetailPage })));
const MemberDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.MemberDetailPage })));
const ProjectsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectsPage })));
const ProjectCreatePage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectCreatePage })));
const ProjectEditPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectEditPage })));
const ClubDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ClubDetailPage })));
const TeamDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.TeamDetailPage })));
const SeasonDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.SeasonDetailPage })));
const PermissionsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.PermissionsPage })));
const UsersPage = lazy(() => import('./pages/identity').then(m => ({ default: m.UsersPage })));
const UserDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.UserDetailPage })));
const ProfilePage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProfilePage })));
const DirectoryPage = lazy(() => import('./pages/identity').then(m => ({ default: m.DirectoryPage })));

// Config pages
const AuditLogPage = lazy(() => import('./pages/config').then(m => ({ default: m.AuditLogPage })));
const OrganisationAuditPage = lazy(() => import('./pages/config').then(m => ({ default: m.OrganisationAuditPage })));
const FeatureFlagsPage = lazy(() => import('./pages/config').then(m => ({ default: m.FeatureFlagsPage })));
const CreditsPage = lazy(() => import('./pages/config').then(m => ({ default: m.CreditsPage })));
const PreferencesPage = lazy(() => import('./pages/config').then(m => ({ default: m.PreferencesPage })));
const MembershipsPage = lazy(() => import('./pages/config').then(m => ({ default: m.MembershipsPage })));
const BillingPage = lazy(() => import('./pages/config').then(m => ({ default: m.BillingPage })));
const UsageEventsPage = lazy(() => import('./pages/config/UsageEventsPage'));
const ContentTemplatesPage = lazy(() => import('./pages/config/ContentTemplatesPage'));
const WorkflowTemplatesPage = lazy(() => import('./pages/config/WorkflowTemplatesPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));

// Section Landing Pages
const AppsPage = lazy(() => import('./pages/AppsPage'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const ContentLibraryPage = lazy(() => import('./pages/content/ContentLibraryPage'));
const SettingsLandingPage = lazy(() => import('./pages/SettingsLandingPage'));

// Platform pages
const HealthCheckPage = lazy(() => import('./pages/platform').then(m => ({ default: m.HealthCheckPage })));
const ConstitutionPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ConstitutionPage })));
const SecurityPage = lazy(() => import('./pages/platform').then(m => ({ default: m.SecurityPage })));
const ObservabilityPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ObservabilityPage })));
const ApiDocsPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ApiDocsPage })));
const CachePerformancePage = lazy(() => import('./pages/platform').then(m => ({ default: m.CachePerformancePage })));
const WebSocketTestPage = lazy(() => import('./pages/platform/WebSocketTestPage'));

// Integration Status
const IntegrationStatusPage = lazy(() => import('./pages/IntegrationStatusPage'));

// Frontend pages
const DesignSystemPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.DesignSystemPage })));
const AuthFlowsPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.AuthFlowsPage })));
const ContextSwitcherPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ContextSwitcherPage })));
const ResourceDisplayPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ResourceDisplayPage })));
const TemplatesPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.TemplatesPage })));
const ThemePage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ThemePage })));
const IntegrationPatternsPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.IntegrationPatternsPage })));

// Docs pages
const DocsPage = lazy(() => import('./pages/docs').then(m => ({ default: m.DocsPage })));
const TasksPage = lazy(() => import('./pages/docs').then(m => ({ default: m.TasksPage })));
const DeploymentPage = lazy(() => import('./pages/docs').then(m => ({ default: m.DeploymentPage })));
const NotificationRoutingLogsPage = lazy(() => import('./pages/docs/NotificationRoutingLogsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const RoutingRulesPage = lazy(() => import('./pages/config/RoutingRulesPage'));

// Activity / Match pages (large, definitely lazy-load)
const MatchDetailPage = lazy(() => import('./pages/activities/MatchDetailPage'));
const ProjectHierarchyMatchRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchyMatchRedirectPage'));
const ProjectHierarchySeasonRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchySeasonRedirectPage'));
const ProjectHierarchyCompetitionRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchyCompetitionRedirectPage'));
const LegacyMatchRedirectPage = lazy(() => import('./pages/activities/LegacyMatchRedirectPage'));
const AIStudioPage = lazy(() => import('./pages/aistudio/AIStudioPage'));

// Period (Season/Competition) pages
const ProjectSeasonsPage = lazy(() => import('./pages/periods/ProjectSeasonsPage'));
const ProjectCompetitionDetailPage = lazy(() => import('./pages/periods/ProjectCompetitionDetailPage'));

// Work hierarchy pages
const ClubsPage = lazy(() => import('./pages/work/ClubsPage'));
const TeamsPage = lazy(() => import('./pages/work/TeamsPage'));
const SeasonsPage = lazy(() => import('./pages/work/SeasonsPage'));
const CompetitionsPage = lazy(() => import('./pages/work/CompetitionsPage'));
const FederationsPage = lazy(() => import('./pages/work/FederationsPage'));
const MatchesPage = lazy(() => import('./pages/work/MatchesPage'));

// =============================================================================
// Suspense wrapper for lazy-loaded components
// =============================================================================
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState message="Loading page..." />}>
      {children}
    </Suspense>
  );
}

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
    <Suspense fallback={<LoadingState message="Loading..." />}>
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

      {/* Section Landing Pages */}
      <Route
        path="/apps"
        element={
          <ProtectedRoute>
            <AppsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <ContentPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy route - redirect to AI Studio library tab */}
      <Route
        path="/contentlib"
        element={
          <Navigate to="/studio?tab=library" replace />
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsLandingPage />
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
            <MatchDetailPage />
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
            <MatchDetailPage />
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
        path="/studio"
        element={
          <ProtectedRoute>
            <AIStudioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studio/videos"
        element={<Navigate to="/approvals?tab=video" replace />}
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
        path="/content-templates"
        element={
          <ProtectedRoute>
            <ContentTemplatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflow-templates"
        element={
          <ProtectedRoute>
            <WorkflowTemplatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalsPage />
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

      {/* Media Library */}
      <Route
        path="/medialib"
        element={
          <ProtectedRoute>
            <MediaLibraryPage />
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Catch-all: 404 for unknown routes */}
      <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
