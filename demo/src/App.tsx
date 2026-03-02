import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from '@django-core/auth-ui';
import LoadingState from './components/LoadingState';
import { ProtectedRoute } from './components/PermissionGuards';

// Critical pages (eager load for first-paint performance)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';

// Lazy-loaded pages
import {
  RecentsPage,
  FavoritesPage,
  SearchPage,
  DirectoryPage,
  AppsPage,
  ContentPage,
  SettingsLandingPage,
  MatchesPage,
  LegacyMatchRedirectPage,
  FederationsPage,
  ClubsPage,
  TeamsPage,
  SeasonsPage,
  CompetitionsPage,
  AIStudioPage,
} from './appLazyImports';

// Route groups
import { getHierarchyRoutes, getIdentityRoutes, getAdminRoutes } from './appRouteGroups';

// =============================================================================
// App — thin routing shell
// All redirect components live in appRedirects.tsx
// All lazy imports live in appLazyImports.ts
// Route groups (hierarchy, identity, admin) live in appRouteGroups.tsx
// =============================================================================

export default function App() {
  const { user } = useAuth();

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
        {/* ── Core navigation ── */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/recents" element={<ProtectedRoute><RecentsPage /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="/directory" element={<ProtectedRoute><DirectoryPage /></ProtectedRoute>} />

        {/* Section landing pages */}
        <Route path="/apps" element={<ProtectedRoute><AppsPage /></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute><ContentPage /></ProtectedRoute>} />
        <Route path="/contentlib" element={<Navigate to="/studio?tab=library" replace />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsLandingPage /></ProtectedRoute>} />

        {/* Matches */}
        <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
        <Route path="/matches/:matchId" element={<ProtectedRoute><LegacyMatchRedirectPage /></ProtectedRoute>} />

        {/* Work hierarchy list pages */}
        <Route path="/federations" element={<ProtectedRoute><FederationsPage /></ProtectedRoute>} />
        <Route path="/clubs" element={<ProtectedRoute><ClubsPage /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
        <Route path="/seasons" element={<ProtectedRoute><SeasonsPage /></ProtectedRoute>} />
        <Route path="/competitions" element={<ProtectedRoute><CompetitionsPage /></ProtectedRoute>} />

        {/* AI Studio & search */}
        <Route path="/studio" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />
        <Route path="/studio/videos" element={<Navigate to="/approvals?tab=video" replace />} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />

        {/* ── Route groups ── */}
        {getHierarchyRoutes()}
        {getIdentityRoutes()}
        {getAdminRoutes()}

        {/* Error pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
