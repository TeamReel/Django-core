/**
 * AppShell — Root layout providing router-dependent context providers
 *
 * With Data Router, providers that need router context (useNavigate, useLocation)
 * must be rendered inside the router. This shell provides those contexts
 * while keeping the router configuration clean.
 *
 * Provider hierarchy:
 * - ThemeProvider (no router dependency — outside in main.tsx)
 * - AuthProvider (no router dependency — outside in main.tsx)
 * - ContextSwitcherProvider (needs router context — here)
 * - ToastProvider (no router dependency)
 * - ConfirmProvider (no router dependency)
 * - BackNavigationProvider (no router dependency)
 */
import React, { useMemo, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import type { ContextSwitcherConfig } from '@django-core/context-switcher';
import { useReactRouterAdapter } from '../adapters/reactRouterAdapter';
import { logger } from '../utils/logger';
import ErrorBoundary from '../components/ErrorBoundary';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { ToastProvider, ToastContainer } from '../components/ui/Toast';
import { BackNavigationProvider } from '../providers/BackNavigationProvider';
import { SkeletonDashboard } from '../components/Skeleton';

export default function AppShell() {
  const routerAdapter = useReactRouterAdapter();
  const location = useLocation();

  const contextConfig: ContextSwitcherConfig = useMemo(() => ({
    routerAdapter,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
      : '/api/v1',
    onContextError: (error: unknown) => {
      logger.warn('Context switch error', error);
      // Handle 401 Unauthorized by redirecting to login
      if (
        (error as Record<string, unknown>)?.code === 401 ||
        (error as Record<string, unknown>)?.status === 401
      ) {
        window.location.href = '/login';
        return;
      }
      // Silently handle other errors - context switching is optional
    },
  }), [routerAdapter]);

  return (
    <ContextSwitcherProvider config={contextConfig}>
      <ToastProvider>
        <ConfirmProvider>
          <BackNavigationProvider>
            <ErrorBoundary location={location}>
              <Suspense fallback={<SkeletonDashboard />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </BackNavigationProvider>
          <ToastContainer />
        </ConfirmProvider>
      </ToastProvider>
    </ContextSwitcherProvider>
  );
}
