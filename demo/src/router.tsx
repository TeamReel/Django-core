/**
 * router.tsx — Data Router configuration using createBrowserRouter
 *
 * R4 Migration from BrowserRouter to Data Router API.
 * Uses createRoutesFromElements bridge for incremental migration.
 *
 * Benefits:
 * - Route loaders for data pre-fetching
 * - Route-level errorElement
 * - Pending UI with useNavigation
 * - Nested layouts with Outlet
 * - Typed params via useParams
 *
 * @see https://reactrouter.com/en/main/routers/create-browser-router
 */
import React, { Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { routes } from './routes';

import AppShell from './layouts/AppShell';
import MainLayout from './layouts/MainLayout';
import { ProtectedRoute } from './components/PermissionGuards';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { SkeletonDetailPage, SkeletonTablePage, SkeletonGrid } from './components/SkeletonComposites';

// Critical pages (eager load — auth + error only)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';

// Lazy-loaded pages
import {
  DashboardPage,
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
  MultiTeamDashboard,
} from './appLazyImports';

// Route groups (legacy bridge — will be replaced with nested children)
import { getHierarchyRoutes, getIdentityRoutes, getAdminRoutes } from './appRouteGroups';

// =============================================================================
// Auth-aware root redirect
// =============================================================================

function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to={routes.dashboard()} replace /> : <Navigate to="/login" replace />;
}

// =============================================================================
// Router configuration using createRoutesFromElements bridge
// =============================================================================

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />} errorElement={<RouteErrorBoundary />}>
      {/* Root redirect based on auth state */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes with MainLayout */}
      <Route element={<MainLayout />} errorElement={<RouteErrorBoundary />}>
        {/* ── Core navigation ── */}
        <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<SkeletonDetailPage />}><DashboardPage /></Suspense></ProtectedRoute>} />
        <Route path="/recents" element={<ProtectedRoute><RecentsPage /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="/directory" element={<ProtectedRoute><DirectoryPage /></ProtectedRoute>} />
        <Route path="/my-teams" element={<ProtectedRoute><Suspense fallback={<SkeletonGrid columns={3} count={6} />}><MultiTeamDashboard /></Suspense></ProtectedRoute>} />

        {/* Section landing pages */}
        <Route path="/apps" element={<ProtectedRoute><AppsPage /></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute><ContentPage /></ProtectedRoute>} />
        <Route path="/contentlib" element={<Navigate to="/studio?tab=library" replace />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsLandingPage /></ProtectedRoute>} />

        {/* Matches */}
        <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
        <Route path="/matches/:matchId" element={<ProtectedRoute><LegacyMatchRedirectPage /></ProtectedRoute>} />

        {/* Work hierarchy list pages — Suspense: table skeleton */}
        <Route element={<Suspense fallback={<SkeletonTablePage />}><Outlet /></Suspense>}>
          <Route path="/federations" element={<ProtectedRoute><FederationsPage /></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute><ClubsPage /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
          <Route path="/seasons" element={<ProtectedRoute><SeasonsPage /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute><CompetitionsPage /></ProtectedRoute>} />
        </Route>

        {/* AI Studio & search — Suspense: grid skeleton */}
        <Route element={<Suspense fallback={<SkeletonGrid columns={3} count={6} />}><Outlet /></Suspense>}>
          <Route path="/studio" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />
          <Route path="/studio/videos" element={<Navigate to="/approvals?tab=video" replace />} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        </Route>

        {/* ── Route groups — each with feature-specific Suspense boundary ── */}
        <Route element={<Suspense fallback={<SkeletonDetailPage />}><Outlet /></Suspense>}>
          {getHierarchyRoutes()}
        </Route>
        <Route element={<Suspense fallback={<SkeletonDetailPage />}><Outlet /></Suspense>}>
          {getIdentityRoutes()}
        </Route>
        <Route element={<Suspense fallback={<SkeletonTablePage />}><Outlet /></Suspense>}>
          {getAdminRoutes()}
        </Route>

        {/* Error pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  )
);
