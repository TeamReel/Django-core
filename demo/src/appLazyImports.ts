import { lazy } from 'react';

// =============================================================================
// Lazy-loaded pages (code-split for better bundle size)
// All page components used by App route definitions.
// =============================================================================

// Core navigation pages
export const RecentsPage = lazy(() => import('./pages/RecentsPage'));
export const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
export const SearchPage = lazy(() => import('./pages/SearchPage'));
export const FilesPage = lazy(() => import('./pages/files'));
export const MediaLibraryPage = lazy(() => import('./pages/medialib'));

// Org context pages
export const OrgClubsPage = lazy(() => import('./pages/identity/org-context/OrgClubsPage').then(m => ({ default: m.OrgClubsPage })));
export const OrgTeamsPage = lazy(() => import('./pages/identity/org-context/OrgTeamsPage').then(m => ({ default: m.OrgTeamsPage })));
export const OrgSeasonsPage = lazy(() => import('./pages/identity/org-context/OrgSeasonsPage').then(m => ({ default: m.OrgSeasonsPage })));
export const OrgCompetitionsPage = lazy(() => import('./pages/identity/org-context/OrgCompetitionsPage').then(m => ({ default: m.OrgCompetitionsPage })));
export const OrgMatchesPage = lazy(() => import('./pages/identity/org-context/OrgMatchesPage').then(m => ({ default: m.OrgMatchesPage })));
export const OrgUsersPage = lazy(() => import('./pages/identity/org-context/OrgUsersPage').then(m => ({ default: m.OrgUsersPage })));

// Identity pages
export const OrganisationsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationsPage })));
export const OrganisationCreatePage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationCreatePage })));
export const OrganisationEditPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationEditPage })));
export const OrganisationDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.OrganisationDetailPage })));
export const MemberDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.MemberDetailPage })));
export const ProjectsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectsPage })));
export const ProjectCreatePage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectCreatePage })));
export const ProjectEditPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProjectEditPage })));
export const ClubDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.ClubDetailPage })));
export const TeamDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.TeamDetailPage })));
export const SeasonDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.SeasonDetailPage })));
export const PermissionsPage = lazy(() => import('./pages/identity').then(m => ({ default: m.PermissionsPage })));
export const UsersPage = lazy(() => import('./pages/identity').then(m => ({ default: m.UsersPage })));
export const UserDetailPage = lazy(() => import('./pages/identity').then(m => ({ default: m.UserDetailPage })));
export const ProfilePage = lazy(() => import('./pages/identity').then(m => ({ default: m.ProfilePage })));
export const DirectoryPage = lazy(() => import('./pages/identity').then(m => ({ default: m.DirectoryPage })));

// Config pages
export const AuditLogPage = lazy(() => import('./pages/config').then(m => ({ default: m.AuditLogPage })));
export const OrganisationAuditPage = lazy(() => import('./pages/config').then(m => ({ default: m.OrganisationAuditPage })));
export const FeatureFlagsPage = lazy(() => import('./pages/config').then(m => ({ default: m.FeatureFlagsPage })));
export const CreditsPage = lazy(() => import('./pages/config').then(m => ({ default: m.CreditsPage })));
export const PreferencesPage = lazy(() => import('./pages/config').then(m => ({ default: m.PreferencesPage })));
export const MembershipsPage = lazy(() => import('./pages/config').then(m => ({ default: m.MembershipsPage })));
export const BillingPage = lazy(() => import('./pages/config').then(m => ({ default: m.BillingPage })));
export const UsageEventsPage = lazy(() => import('./pages/config/UsageEventsPage'));
export const ContentTemplatesPage = lazy(() => import('./pages/config/ContentTemplatesPage'));
export const WorkflowTemplatesPage = lazy(() => import('./pages/config/WorkflowTemplatesPage'));
export const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));

// Profile Hub
export const ProfileHubPage = lazy(() => import('./pages/ProfileHubPage'));

// Section Landing Pages
export const AppsPage = lazy(() => import('./pages/AppsPage'));
export const ContentPage = lazy(() => import('./pages/ContentPage'));
export const ContentLibraryPage = lazy(() => import('./pages/content/ContentLibraryPage'));
export const SettingsLandingPage = lazy(() => import('./pages/SettingsLandingPage'));

// Platform pages
export const HealthCheckPage = lazy(() => import('./pages/platform').then(m => ({ default: m.HealthCheckPage })));
export const ConstitutionPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ConstitutionPage })));
export const SecurityPage = lazy(() => import('./pages/platform').then(m => ({ default: m.SecurityPage })));
export const ObservabilityPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ObservabilityPage })));
export const ApiDocsPage = lazy(() => import('./pages/platform').then(m => ({ default: m.ApiDocsPage })));
export const CachePerformancePage = lazy(() => import('./pages/platform').then(m => ({ default: m.CachePerformancePage })));
export const WebSocketTestPage = lazy(() => import('./pages/platform/WebSocketTestPage'));


// Frontend pages
export const DesignSystemPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.DesignSystemPage })));
export const AuthFlowsPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.AuthFlowsPage })));
export const ContextSwitcherPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ContextSwitcherPage })));
export const ResourceDisplayPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ResourceDisplayPage })));
export const TemplatesPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.TemplatesPage })));
export const ThemePage = lazy(() => import('./pages/frontend').then(m => ({ default: m.ThemePage })));
export const IntegrationPatternsPage = lazy(() => import('./pages/frontend').then(m => ({ default: m.IntegrationPatternsPage })));

// Docs pages
export const DocsPage = lazy(() => import('./pages/docs').then(m => ({ default: m.DocsPage })));
export const TasksPage = lazy(() => import('./pages/docs').then(m => ({ default: m.TasksPage })));
export const DeploymentPage = lazy(() => import('./pages/docs').then(m => ({ default: m.DeploymentPage })));
export const NotificationRoutingLogsPage = lazy(() => import('./pages/docs/NotificationRoutingLogsPage'));
export const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
export const RoutingRulesPage = lazy(() => import('./pages/config/RoutingRulesPage'));

// Activity / Match pages
export const MatchDetailPage = lazy(() => import('./pages/activities/MatchDetailWrapper'));
export const ProjectHierarchyMatchRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchyMatchRedirectPage'));
export const ProjectHierarchySeasonRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchySeasonRedirectPage'));
export const ProjectHierarchyCompetitionRedirectPage = lazy(() => import('./pages/activities/ProjectHierarchyCompetitionRedirectPage'));
export const LegacyMatchRedirectPage = lazy(() => import('./pages/activities/LegacyMatchRedirectPage'));
export const AIStudioPage = lazy(() => import('./pages/aistudio/AIStudioPage'));

// Period (Season/Competition) pages
export const ProjectSeasonsPage = lazy(() => import('./pages/periods/ProjectSeasonsPage'));
export const ProjectCompetitionDetailPage = lazy(() => import('./pages/periods/CompetitionDetailWrapper'));

// Work hierarchy pages
export const ClubsPage = lazy(() => import('./pages/work/ClubsPage'));
export const TeamsPage = lazy(() => import('./pages/work/TeamsPage'));
export const SeasonsPage = lazy(() => import('./pages/work/SeasonsPage'));
export const CompetitionsPage = lazy(() => import('./pages/work/CompetitionsPage'));
export const FederationsPage = lazy(() => import('./pages/work/FederationsPage'));
export const MatchesPage = lazy(() => import('./pages/work/MatchesPage'));
