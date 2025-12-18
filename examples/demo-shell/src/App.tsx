import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import LoadingState from './components/LoadingState';
import FilesPage from './pages/files';

// Identity pages
import {
  OrganisationsPage,
  OrganisationDetailPage,
  ProjectsPage,
  ProjectDetailPage,
  PermissionsPage,
} from './pages/identity';
import ProfilePage from './pages/identity/ProfilePageSimple';

// Config pages
import {
  AuditLogPage,
  FeatureFlagsPage,
  CreditsPage,
  PreferencesPage,
} from './pages/config';

// Platform pages
import {
  HealthCheckPage,
  ConstitutionPage,
  SecurityPage,
  ObservabilityPage,
  ApiDocsPage,
} from './pages/platform';

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

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

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

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
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
        path="/organisations/:id"
        element={
          <ProtectedRoute>
            <OrganisationDetailPage />
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
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetailPage />
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
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/flags"
        element={
          <ProtectedRoute>
            <FeatureFlagsPage />
          </ProtectedRoute>
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

      {/* Platform routes */}
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <HealthCheckPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/constitution"
        element={
          <ProtectedRoute>
            <ConstitutionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/observability"
        element={
          <ProtectedRoute>
            <ObservabilityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/api-docs"
        element={
          <ProtectedRoute>
            <ApiDocsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integration-status"
        element={
          <ProtectedRoute>
            <IntegrationStatusPage />
          </ProtectedRoute>
        }
      />

      {/* Frontend Resource routes */}
      <Route
        path="/design-system"
        element={
          <ProtectedRoute>
            <DesignSystemPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/auth-flows"
        element={
          <ProtectedRoute>
            <AuthFlowsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/context"
        element={
          <ProtectedRoute>
            <ContextSwitcherPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <ResourceDisplayPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <TemplatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/theme"
        element={
          <ProtectedRoute>
            <ThemePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integration"
        element={
          <ProtectedRoute>
            <IntegrationPatternsPage />
          </ProtectedRoute>
        }
      />

      {/* Documentation routes */}
      <Route
        path="/docs"
        element={
          <ProtectedRoute>
            <DocsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
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
          <ProtectedRoute>
            <DeploymentPage />
          </ProtectedRoute>
        }
      />

      {/* Files Demo */}
      <Route
        path="/demo/files"
        element={
          <ProtectedRoute>
            <FilesPage />
          </ProtectedRoute>
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
