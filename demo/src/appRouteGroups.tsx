import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import {
  ProtectedRoute,
  AdminOnlyRoute,
  OrgAdminRoute,
} from './components/PermissionGuards';

import {
  LegacyDirectoryRedirect,
  ClubDetailRedirect,
  TeamDetailRedirect,
  StripOrganisationsPrefix,
  HierarchyRedirect,
} from './appRedirects';

import {
  // Pages
  ProjectSeasonsPage,
  ProjectHierarchySeasonRedirectPage,
  ProjectHierarchyCompetitionRedirectPage,
  ProjectHierarchyMatchRedirectPage,
  SeasonDetailPage,
  MatchDetailPage,
  TeamHubPage,
  ClubDetailPage,
  // Identity
  OrganisationCreatePage,
  OrganisationEditPage,
  OrganisationDetailPage,
  MemberDetailPage,
  ProjectCreatePage,
  ProjectEditPage,
  PermissionsPage,
  UsersPage,
  UserDetailPage,
  // Org context
  OrgClubsPage,
  OrgTeamsPage,
  OrgSeasonsPage,
  OrgCompetitionsPage,
  OrgMatchesPage,
  OrgUsersPage,
  // Config
  AuditLogPage,
  OrganisationAuditPage,
  FeatureFlagsPage,
  CreditsPage,
  ContentTemplatesPage,
  WorkflowTemplatesPage,
  AppBackgroundsPage,
  ApprovalsPage,
  ProfileHubPage,
  MembershipsPage,
  UsageEventsPage,
  NotificationRoutingLogsPage,
  RoutingRulesPage,
  // Platform
  HealthCheckPage,
  ConstitutionPage,
  SecurityPage,
  ObservabilityPage,
  ApiDocsPage,
  CachePerformancePage,
  WebSocketTestPage,
  PlatformStatsPage,
  // Frontend
  DesignSystemPage,
  AuthFlowsPage,
  ContextSwitcherPage,
  ResourceDisplayPage,
  TemplatesPage,
  ThemePage,
  IntegrationPatternsPage,
  // Docs
  DocsPage,
  TasksPage,
  DeploymentPage,
  NotificationsPage,
  ActivityPage,
  // Files / Media
  FilesPage,
  MediaLibraryPage,
  // Member detail (season context)
  ProjectSeasonMemberDetailPage,
} from './appLazyImports';

// =============================================================================
// Route group arrays — spread into <Routes> in App.tsx.
// =============================================================================

// ─── Hierarchy routes ────────────────────────────────────────────────────────
// Project, team, season, competition, match URL patterns
// Canonical routes render pages; legacy patterns use HierarchyRedirect

export function getHierarchyRoutes(): React.ReactNode[] {
  return [
    // ── Project hierarchy: /:orgId/projects/* (canonical pages) ──
    <Route key="h-proj-seasons" path="/:orgId/projects/:projectId/seasons" element={<ProtectedRoute><ProjectSeasonsPage /></ProtectedRoute>} />,
    <Route key="h-proj-season" path="/:orgId/projects/:projectId/:seasonId" element={<ProtectedRoute><ProjectHierarchySeasonRedirectPage /></ProtectedRoute>} />,
    <Route key="h-proj-comp" path="/:orgId/projects/:projectId/:seasonId/:competitionId" element={<ProtectedRoute><ProjectHierarchyCompetitionRedirectPage /></ProtectedRoute>} />,
    <Route key="h-proj-match" path="/:orgId/projects/:projectId/:seasonId/:competitionId/:matchId" element={<ProtectedRoute><ProjectHierarchyMatchRedirectPage /></ProtectedRoute>} />,

    // ── Legacy project hierarchy (with /seasons/, /competitions/, /squad, etc.) — R3 consolidated ──
    <Route key="h-proj-legacy-catch" path="/:orgId/projects/:clubId/teams/*" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,
    <Route key="h-proj-seasons-legacy-catch" path="/:orgId/projects/:projectId/seasons/:seasonId/*" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,
    <Route key="h-proj-season-legacy" path="/:orgId/projects/:projectId/seasons/:seasonId" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,

    // ── Canonical vanity hierarchy: /:orgId/:clubId/:projectId/* ──
    <Route key="h-vanity-team" path="/:orgId/:clubId/:projectId" element={<ProtectedRoute><TeamHubPage /></ProtectedRoute>} />,
    <Route key="h-vanity-season" path="/:orgId/:clubId/:projectId/:seasonId" element={<ProtectedRoute><SeasonDetailPage /></ProtectedRoute>} />,
    <Route key="h-vanity-member" path="/:orgId/:clubId/:projectId/:seasonId/members/:memberId" element={<ProtectedRoute><ProjectSeasonMemberDetailPage /></ProtectedRoute>} />,
    <Route key="h-vanity-match" path="/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId" element={<ProtectedRoute><MatchDetailPage /></ProtectedRoute>} />,

    // ── Legacy vanity (trailing /seasons, /squad, explicit /seasons/ segment, 5-seg competition) — R3 consolidated ──
    <Route key="h-vanity-seasons" path="/:orgId/:clubId/:projectId/seasons" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,
    <Route key="h-vanity-comp" path="/:orgId/:clubId/:projectId/:seasonId/:competitionId" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,
    <Route key="h-bc-seasons-catch" path="/:orgId/:clubId/:projectId/seasons/*" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,
  ];
}

// ─── Identity routes ─────────────────────────────────────────────────────────
// Organisation, club, team, user, member CRUD & navigation

export function getIdentityRoutes(): React.ReactNode[] {
  return [
    // Org list & create
    <Route key="i-orgs" path="/organisations" element={<ProtectedRoute><LegacyDirectoryRedirect tab="federations" /></ProtectedRoute>} />,
    <Route key="i-org-create" path="/organisations/create" element={<ProtectedRoute><OrganisationCreatePage /></ProtectedRoute>} />,

    // Org sub-section redirects eliminated in R2 — handled by /organisations/* wildcard

    // Org context pages (canonical /:orgId/<section>)
    <Route key="i-ctx-clubs" path="/:orgId/clubs" element={<ProtectedRoute><OrgClubsPage /></ProtectedRoute>} />,
    <Route key="i-ctx-teams" path="/:orgId/teams" element={<ProtectedRoute><OrgTeamsPage /></ProtectedRoute>} />,
    <Route key="i-ctx-seasons" path="/:orgId/seasons" element={<ProtectedRoute><OrgSeasonsPage /></ProtectedRoute>} />,
    <Route key="i-ctx-competitions" path="/:orgId/competitions" element={<ProtectedRoute><OrgCompetitionsPage /></ProtectedRoute>} />,
    <Route key="i-ctx-matches" path="/:orgId/matches" element={<ProtectedRoute><OrgMatchesPage /></ProtectedRoute>} />,
    <Route key="i-ctx-users" path="/:orgId/users" element={<ProtectedRoute><OrgUsersPage /></ProtectedRoute>} />,
    <Route key="i-ctx-hierarchy" path="/:orgId/hierarchy" element={<ProtectedRoute><HierarchyRedirect /></ProtectedRoute>} />,

    // Org detail (canonical)
    <Route key="i-org-detail" path="/:id" element={<ProtectedRoute><OrganisationDetailPage /></ProtectedRoute>} />,

    // Members & users (canonical)
    <Route key="i-org-member" path="/organisations/:id/members/:memberId" element={<ProtectedRoute><MemberDetailPage /></ProtectedRoute>} />,
    <Route key="i-org-edit" path="/organisations/:id/edit" element={<ProtectedRoute><OrganisationEditPage /></ProtectedRoute>} />,

    // Projects — /organisations/:orgId/projects handled by wildcard (R2)
    <Route key="i-org-proj-create" path="/organisations/:orgId/projects/create" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />,
    <Route key="i-org-proj-edit" path="/organisations/:orgId/projects/:projectId/edit" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />,
    <Route key="i-proj-detail" path="/:orgId/projects/:projectId" element={<ProtectedRoute><ClubDetailRedirect /></ProtectedRoute>} />,

    // Club detail (canonical)
    <Route key="i-club" path="/:orgId/:projectId" element={<ProtectedRoute><ClubDetailPage /></ProtectedRoute>} />,

    // Team detail (legacy /projects/:clubId/teams/:projectId paths)
    <Route key="i-team-legacy" path="/:orgId/projects/:clubId/teams/:projectId" element={<ProtectedRoute><TeamDetailRedirect /></ProtectedRoute>} />,

    // /organisations/* wildcard catch-all — strips prefix -> canonical URL
    <Route key="i-org-wildcard" path="/organisations/*" element={<StripOrganisationsPrefix />} />,

    // Legacy /projects redirect
    <Route key="i-projects" path="/projects" element={<ProtectedRoute><Navigate to="/directory?tab=clubs" replace /></ProtectedRoute>} />,

    // Permissions & users (global)
    <Route key="i-permissions" path="/permissions" element={<AdminOnlyRoute><PermissionsPage /></AdminOnlyRoute>} />,
    <Route key="i-users" path="/users" element={<OrgAdminRoute><UsersPage /></OrgAdminRoute>} />,
    <Route key="i-user-detail" path="/users/:userId" element={<OrgAdminRoute><UserDetailPage /></OrgAdminRoute>} />,

    // Profile hub
    <Route key="i-profile" path="/profile" element={<ProtectedRoute><ProfileHubPage /></ProtectedRoute>} />,
  ];
}

// ─── Admin routes ────────────────────────────────────────────────────────────
// Config, platform, frontend, documentation, tools

export function getAdminRoutes(): React.ReactNode[] {
  return [
    // Config
    <Route key="a-audit" path="/audit" element={<OrgAdminRoute><AuditLogPage /></OrgAdminRoute>} />,
    <Route key="a-org-audit" path="/organisation/audit" element={<OrgAdminRoute><OrganisationAuditPage /></OrgAdminRoute>} />,
    <Route key="a-flags" path="/flags" element={<AdminOnlyRoute><FeatureFlagsPage /></AdminOnlyRoute>} />,
    <Route key="a-credits" path="/credits" element={<ProtectedRoute><CreditsPage /></ProtectedRoute>} />,
    <Route key="a-content-templates" path="/content-templates" element={<ProtectedRoute><ContentTemplatesPage /></ProtectedRoute>} />,
    <Route key="a-workflow-templates" path="/workflow-templates" element={<ProtectedRoute><WorkflowTemplatesPage /></ProtectedRoute>} />,
    <Route key="a-app-backgrounds" path="/app-backgrounds" element={<AdminOnlyRoute><AppBackgroundsPage /></AdminOnlyRoute>} />,
    <Route key="a-approvals" path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />,
    <Route key="a-preferences" path="/preferences" element={<ProtectedRoute><Navigate to="/profile" replace /></ProtectedRoute>} />,
    <Route key="a-memberships" path="/memberships" element={<ProtectedRoute><MembershipsPage /></ProtectedRoute>} />,
    <Route key="a-billing" path="/billing" element={<ProtectedRoute><Navigate to="/profile" replace /></ProtectedRoute>} />,
    <Route key="a-usage-events" path="/usage-events" element={<AdminOnlyRoute><UsageEventsPage /></AdminOnlyRoute>} />,
    <Route key="a-routing-logs" path="/routing-logs" element={<AdminOnlyRoute><NotificationRoutingLogsPage /></AdminOnlyRoute>} />,
    <Route key="a-routing-rules" path="/routing-rules" element={<OrgAdminRoute><RoutingRulesPage /></OrgAdminRoute>} />,

    // Platform
    <Route key="a-health" path="/health" element={<AdminOnlyRoute><HealthCheckPage /></AdminOnlyRoute>} />,
    <Route key="a-constitution" path="/constitution" element={<AdminOnlyRoute><ConstitutionPage /></AdminOnlyRoute>} />,
    <Route key="a-security" path="/security" element={<AdminOnlyRoute><SecurityPage /></AdminOnlyRoute>} />,
    <Route key="a-observability" path="/observability" element={<AdminOnlyRoute><ObservabilityPage /></AdminOnlyRoute>} />,
    <Route key="a-platform-stats" path="/platform-stats" element={<AdminOnlyRoute><PlatformStatsPage /></AdminOnlyRoute>} />,
    <Route key="a-api-docs" path="/api-docs" element={<AdminOnlyRoute><ApiDocsPage /></AdminOnlyRoute>} />,
    <Route key="a-demo-ws" path="/demo/websockets" element={<AdminOnlyRoute><WebSocketTestPage /></AdminOnlyRoute>} />,
    <Route key="a-demo-perf" path="/demo/performance" element={<AdminOnlyRoute><CachePerformancePage /></AdminOnlyRoute>} />,

    // Frontend resource pages
    <Route key="a-design-system" path="/design-system" element={<AdminOnlyRoute><DesignSystemPage /></AdminOnlyRoute>} />,
    <Route key="a-auth-flows" path="/auth-flows" element={<AdminOnlyRoute><AuthFlowsPage /></AdminOnlyRoute>} />,
    <Route key="a-context" path="/context" element={<AdminOnlyRoute><ContextSwitcherPage /></AdminOnlyRoute>} />,
    <Route key="a-resources" path="/resources" element={<AdminOnlyRoute><ResourceDisplayPage /></AdminOnlyRoute>} />,
    <Route key="a-templates" path="/templates" element={<AdminOnlyRoute><TemplatesPage /></AdminOnlyRoute>} />,
    <Route key="a-theme" path="/theme" element={<AdminOnlyRoute><ThemePage /></AdminOnlyRoute>} />,
    <Route key="a-integration" path="/integration" element={<AdminOnlyRoute><IntegrationPatternsPage /></AdminOnlyRoute>} />,

    // Documentation
    <Route key="a-docs" path="/docs" element={<AdminOnlyRoute><DocsPage /></AdminOnlyRoute>} />,
    <Route key="a-tasks" path="/tasks" element={<AdminOnlyRoute><TasksPage /></AdminOnlyRoute>} />,
    <Route key="a-notifications" path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />,
    <Route key="a-activity" path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />,
    <Route key="a-deployment" path="/deployment" element={<AdminOnlyRoute><DeploymentPage /></AdminOnlyRoute>} />,

    // Files & Media
    <Route key="a-demo-files" path="/demo/files" element={<AdminOnlyRoute><FilesPage /></AdminOnlyRoute>} />,
    <Route key="a-medialib" path="/medialib" element={<ProtectedRoute><MediaLibraryPage /></ProtectedRoute>} />,
  ];
}
