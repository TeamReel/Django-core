/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import type { AuthConfig } from '@django-core/auth-ui';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import type { ContextSwitcherConfig } from '@django-core/context-switcher';
// import { PermissionsProvider } from '@django-core/permissions';
import { ThemeProvider } from '@django-core/design-system';
import { useReactRouterAdapter } from './adapters/reactRouterAdapter';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';
import '@django-core/design-system/tokens.css';

const authConfig: AuthConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  endpoints: {
    signIn: '/api/v1/auth/login/',
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

  const contextConfig: ContextSwitcherConfig = {
    routerAdapter,
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '') + '/api/v1',
    onContextError: (error) => {
      console.warn('Context switch error (non-critical):', error.message);
      // Silently handle - context switching is optional
    },
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider config={authConfig}>
          <ContextSwitcherProvider config={contextConfig}>
            <App />
          </ContextSwitcherProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithProviders />
    </BrowserRouter>
  </React.StrictMode>
);
