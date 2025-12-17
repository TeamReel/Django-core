import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrganisationListPage from './pages/organisations/OrganisationListPage';
import OrganisationDetailPage from './pages/organisations/OrganisationDetailPage';
import ProjectListPage from './pages/projects/ProjectListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ResourcesPage from './pages/resources/ResourcesPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import IntegrationStatusPage from './pages/IntegrationStatusPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import HealthStatusPage from './pages/status/HealthStatusPage';
import PermissionsStatusPage from './pages/status/PermissionsStatusPage';
import LoadingState from './components/LoadingState';

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

      <Route
        path="/organisations"
        element={
          <ProtectedRoute>
            <OrganisationListPage />
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
        path="/organisations/:orgId/projects"
        element={
          <ProtectedRoute>
            <ProjectListPage />
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
        path="/resources"
        element={
          <ProtectedRoute>
            <ResourcesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
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
        path="/integration-status"
        element={
          <ProtectedRoute>
            <IntegrationStatusPage />
          </ProtectedRoute>
        }
      />

      {/* Status pages (dev/debug) */}
      <Route
        path="/status/health"
        element={
          <ProtectedRoute>
            <HealthStatusPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/status/permissions"
        element={
          <ProtectedRoute>
            <PermissionsStatusPage />
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
