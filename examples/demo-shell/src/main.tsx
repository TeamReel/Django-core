/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import type { AuthConfig } from '@django-core/auth-ui';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import type { ContextSwitcherConfig } from '@django-core/context-switcher';
import { useReactRouterAdapter } from './adapters/reactRouterAdapter';
import App from './App';
import './index.css';

const authConfig: AuthConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  endpoints: {
    signIn: '/auth/sign-in/',
    signOut: '/auth/sign-out/',
    requestPasswordReset: '/auth/password-reset/request/',
    confirmPasswordReset: '/auth/password-reset/confirm/',
    me: '/auth/me/',
    profile: '/auth/profile/'
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
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  };

  return (
    <AuthProvider config={authConfig}>
      <ContextSwitcherProvider config={contextConfig}>
        <App />
      </ContextSwitcherProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithProviders />
    </BrowserRouter>
  </React.StrictMode>
);
