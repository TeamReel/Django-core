import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrganisationListPage from './pages/organisations/OrganisationListPage';
import OrganisationDetailPage from './pages/organisations/OrganisationDetailPage';
import ProjectListPage from './pages/projects/ProjectListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
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
        path="/organisations/:slug"
        element={
          <ProtectedRoute>
            <OrganisationDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgSlug/projects"
        element={
          <ProtectedRoute>
            <ProjectListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organisations/:orgSlug/projects/:projectSlug"
        element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Catch-all: redirect to dashboard or login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
