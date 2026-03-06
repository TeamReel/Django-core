import { lazyWithRetry } from './utils/lazyWithRetry';

// =============================================================================
// Lazy-loaded pages (code-split for better bundle size)
// All page components used by App route definitions.
// =============================================================================

// Core navigation pages
export const RecentsPage = lazyWithRetry(() => import('./pages/RecentsPage'));
export const FavoritesPage = lazyWithRetry(() => import('./pages/FavoritesPage'));
export const SearchPage = lazyWithRetry(() => import('./pages/SearchPage'));
export const FilesPage = lazyWithRetry(() => import('./pages/files'));
export const MediaLibraryPage = lazyWithRetry(() => import('./pages/medialib'));

// Org context pages
export const OrgClubsPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgClubsPage').then(m => ({ default: m.OrgClubsPage })));
export const OrgTeamsPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgTeamsPage').then(m => ({ default: m.OrgTeamsPage })));
export const OrgSeasonsPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgSeasonsPage').then(m => ({ default: m.OrgSeasonsPage })));
export const OrgCompetitionsPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgCompetitionsPage').then(m => ({ default: m.OrgCompetitionsPage })));
export const OrgMatchesPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgMatchesPage').then(m => ({ default: m.OrgMatchesPage })));
export const OrgUsersPage = lazyWithRetry(() => import('./pages/identity/org-context/OrgUsersPage').then(m => ({ default: m.OrgUsersPage })));

// Identity pages
export const OrganisationsPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.OrganisationsPage })));
export const OrganisationCreatePage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.OrganisationCreatePage })));
export const OrganisationEditPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.OrganisationEditPage })));
export const OrganisationDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.OrganisationDetailPage })));
export const MemberDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.MemberDetailPage })));
export const ProjectsPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.ProjectsPage })));
export const ProjectCreatePage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.ProjectCreatePage })));
export const ProjectEditPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.ProjectEditPage })));
export const ClubDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.ClubDetailPage })));
export const TeamDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.TeamDetailPage })));
export const SeasonDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.SeasonDetailPage })));
export const PermissionsPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.PermissionsPage })));
export const UsersPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.UsersPage })));
export const UserDetailPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.UserDetailPage })));
export const ProfilePage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.ProfilePage })));
export const DirectoryPage = lazyWithRetry(() => import('./pages/identity').then(m => ({ default: m.DirectoryPage })));

// Config pages
export const AuditLogPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.AuditLogPage })));
export const OrganisationAuditPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.OrganisationAuditPage })));
export const FeatureFlagsPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.FeatureFlagsPage })));
export const CreditsPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.CreditsPage })));
export const PreferencesPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.PreferencesPage })));
export const MembershipsPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.MembershipsPage })));
export const BillingPage = lazyWithRetry(() => import('./pages/config').then(m => ({ default: m.BillingPage })));
export const UsageEventsPage = lazyWithRetry(() => import('./pages/config/UsageEventsPage'));
export const ContentTemplatesPage = lazyWithRetry(() => import('./pages/config/ContentTemplatesPage'));
export const WorkflowTemplatesPage = lazyWithRetry(() => import('./pages/config/WorkflowTemplatesPage'));
export const ApprovalsPage = lazyWithRetry(() => import('./pages/ApprovalsPage'));

// Profile Hub
export const ProfileHubPage = lazyWithRetry(() => import('./pages/ProfileHubPage'));

// Section Landing Pages
export const AppsPage = lazyWithRetry(() => import('./pages/AppsPage'));
export const ContentPage = lazyWithRetry(() => import('./pages/ContentPage'));
export const ContentLibraryPage = lazyWithRetry(() => import('./pages/content/ContentLibraryPage'));
export const SettingsLandingPage = lazyWithRetry(() => import('./pages/SettingsLandingPage'));

// Platform pages
export const HealthCheckPage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.HealthCheckPage })));
export const ConstitutionPage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.ConstitutionPage })));
export const SecurityPage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.SecurityPage })));
export const ObservabilityPage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.ObservabilityPage })));
export const ApiDocsPage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.ApiDocsPage })));
export const CachePerformancePage = lazyWithRetry(() => import('./pages/platform').then(m => ({ default: m.CachePerformancePage })));
export const WebSocketTestPage = lazyWithRetry(() => import('./pages/platform/WebSocketTestPage'));


// Frontend pages
export const DesignSystemPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.DesignSystemPage })));
export const AuthFlowsPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.AuthFlowsPage })));
export const ContextSwitcherPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.ContextSwitcherPage })));
export const ResourceDisplayPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.ResourceDisplayPage })));
export const TemplatesPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.TemplatesPage })));
export const ThemePage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.ThemePage })));
export const IntegrationPatternsPage = lazyWithRetry(() => import('./pages/frontend').then(m => ({ default: m.IntegrationPatternsPage })));

// Docs pages
export const DocsPage = lazyWithRetry(() => import('./pages/docs').then(m => ({ default: m.DocsPage })));
export const TasksPage = lazyWithRetry(() => import('./pages/docs').then(m => ({ default: m.TasksPage })));
export const DeploymentPage = lazyWithRetry(() => import('./pages/docs').then(m => ({ default: m.DeploymentPage })));
export const NotificationRoutingLogsPage = lazyWithRetry(() => import('./pages/docs/NotificationRoutingLogsPage'));
export const NotificationsPage = lazyWithRetry(() => import('./pages/NotificationsPage'));
export const RoutingRulesPage = lazyWithRetry(() => import('./pages/config/RoutingRulesPage'));

// Activity / Match pages
export const MatchDetailPage = lazyWithRetry(() => import('./pages/activities/MatchDetailWrapper'));
export const ProjectHierarchyMatchRedirectPage = lazyWithRetry(() => import('./pages/activities/ProjectHierarchyMatchRedirectPage'));
export const ProjectHierarchySeasonRedirectPage = lazyWithRetry(() => import('./pages/activities/ProjectHierarchySeasonRedirectPage'));
export const ProjectHierarchyCompetitionRedirectPage = lazyWithRetry(() => import('./pages/activities/ProjectHierarchyCompetitionRedirectPage'));
export const LegacyMatchRedirectPage = lazyWithRetry(() => import('./pages/activities/LegacyMatchRedirectPage'));
export const AIStudioPage = lazyWithRetry(() => import('./pages/aistudio/AIStudioPage'));

// Period (Season/Competition) pages
export const ProjectSeasonsPage = lazyWithRetry(() => import('./pages/periods/ProjectSeasonsPage'));
export const ProjectCompetitionDetailPage = lazyWithRetry(() => import('./pages/periods/CompetitionDetailWrapper'));
export const ProjectSeasonMemberDetailPage = lazyWithRetry(() => import('./pages/periods/ProjectSeasonMemberDetailPage'));

// Work hierarchy pages
export const ClubsPage = lazyWithRetry(() => import('./pages/work/ClubsPage'));
export const TeamsPage = lazyWithRetry(() => import('./pages/work/TeamsPage'));
export const SeasonsPage = lazyWithRetry(() => import('./pages/work/SeasonsPage'));
export const CompetitionsPage = lazyWithRetry(() => import('./pages/work/CompetitionsPage'));
export const FederationsPage = lazyWithRetry(() => import('./pages/work/FederationsPage'));
export const MatchesPage = lazyWithRetry(() => import('./pages/work/MatchesPage'));
