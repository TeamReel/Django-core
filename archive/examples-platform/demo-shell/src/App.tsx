import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import LoadingState from './components/LoadingState';
import FilesPage from './pages/files';
import {
  ProtectedRoute,
  AdminOnlyRoute,
  OrgAdminRoute,
  SecurityRoute,
} from './components/PermissionGuards';

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
  ProjectDetailPage,
  PermissionsPage,
  UsersPage,
  UserDetailPage,
  ProfilePage,
} from './pages/identity';

// Config pages
import {
  AuditLogPage,
  FeatureFlagsPage,
  CreditsPage,
  PreferencesPage,
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
  NotificationsPage,
  DeploymentPage,
} from './pages/docs';
import NotificationRoutingLogsPage from './pages/docs/NotificationRoutingLogsPage';

export default function App() {
  const { user } = useAuth();

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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
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
            <OrganisationsPage />
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
        path="/organisations/:id"
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
        path="/organisations/:orgId/users/:userId"
        element={
          <ProtectedRoute>
            <UserDetailPage />
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
            <ProjectsPage />
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
            <ProjectDetailPage />
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
            <ProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/permissions"
        element={
          <ProtectedRoute>
            <PermissionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId"
        element={
          <ProtectedRoute>
            <UserDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
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
        path="/flags"
        element={
          <OrgAdminRoute>
            <FeatureFlagsPage />
          </OrgAdminRoute>
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
        path="/usage-events"
        element={
          <OrgAdminRoute>
            <UsageEventsPage />
          </OrgAdminRoute>
        }
      />

      <Route
        path="/routing-logs"
        element={
          <SecurityRoute>
            <NotificationRoutingLogsPage />
          </SecurityRoute>
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
          <SecurityRoute>
            <SecurityPage />
          </SecurityRoute>
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
    </Routes>
  );
}
