import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import LoadingState from './components/LoadingState';

// Identity pages
import {
  OrganisationsPage,
  OrganisationDetailPage,
  ProjectsPage,
  ProjectDetailPage,
  PermissionsPage,
  ProfilePage,
} from './pages/identity';

// Config pages
import {
  AuditLogPage,
  FeatureFlagsPage,
  CreditsPage,
  PreferencesPage,
} from './pages/config';

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

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Catch-all: 404 for unknown routes */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
