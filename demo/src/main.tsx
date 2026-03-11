/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import type { AuthConfig } from '@django-core/auth-ui';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import type { ContextSwitcherConfig } from '@django-core/context-switcher';
import { ThemeProvider, LocalStorageAdapter } from '@django-core/theme-system';
import { logger } from './utils/logger';
import { useReactRouterAdapter } from './adapters/reactRouterAdapter';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider, ToastContainer } from './components/ui/Toast';
import { BackNavigationProvider } from './providers/BackNavigationProvider';
import App from './App';
import '@django-core/design-system/tokens.css';
import '@django-core/theme-system/dist/style.css';
import './index.css';
import './styles/utility.css';

// Initialize theme storage
const themeStorage = new LocalStorageAdapter('django_core_theme');

const authConfig: AuthConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '', // Use env var for prod, relative for dev proxy
  endpoints: {
    signIn: '/api/v1/auth/login/',
    signUp: '/api/v1/auth/register/',
    signOut: '/api/v1/auth/logout/',
    requestPasswordReset: '/api/v1/auth/password-reset/',
    confirmPasswordReset: '/api/v1/auth/password-reset-confirm/',
    me: '/api/v1/auth/me/',
    profile: '/api/v1/auth/profile/'
  },
  routes: {
    login: '/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/login'
  }
};

/**
 * AppWithProviders - Wraps App with all required providers.
 * Separated to allow hooks (useReactRouterAdapter) inside router context.
 */
function AppWithProviders() {
  const routerAdapter = useReactRouterAdapter();
  const location = useLocation();

  const contextConfig: ContextSwitcherConfig = React.useMemo(() => ({
    routerAdapter,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1',
    onContextError: (error: unknown) => {
      logger.warn('Context switch error', error);
      // Handle 401 Unauthorized by redirecting to login
      if ((error as Record<string, unknown>)?.code === 401 || (error as Record<string, unknown>)?.status === 401) {
        window.location.href = '/login';
        return;
      }
      // Silently handle other errors - context switching is optional
    },
  }), [routerAdapter]);

  return (
    <ThemeProvider storage={themeStorage}>
      <AuthProvider config={authConfig}>
        <ContextSwitcherProvider config={contextConfig}>
          <ToastProvider>
            <ConfirmProvider>
              <BackNavigationProvider>
                <ErrorBoundary location={location}>
                  <App />
                </ErrorBoundary>
              </BackNavigationProvider>
              <ToastContainer />
            </ConfirmProvider>
          </ToastProvider>
        </ContextSwitcherProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppWithProviders />
    </BrowserRouter>
  </React.StrictMode>
);
