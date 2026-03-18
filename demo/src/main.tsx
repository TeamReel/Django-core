/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import type { AuthConfig } from '@django-core/auth-ui';
import { ThemeProvider, LocalStorageAdapter } from '@django-core/theme-system';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';
import { routes } from './routes';
import '@django-core/design-system/tokens.css';
import '@django-core/theme-system/dist/style.css';
import './index.css';
import './styles/utility.css';
import './styles/micro-animations.css';

// Initialize theme storage
const themeStorage = new LocalStorageAdapter('django_core_theme');

const authConfig: AuthConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '') + '/api/v1', // Centralised prefix — endpoints are relative to /api/v1
  endpoints: {
    signIn: '/auth/login/',
    signUp: '/auth/register/',
    signOut: '/auth/logout/',
    requestPasswordReset: '/auth/password-reset/',
    confirmPasswordReset: '/auth/password-reset-confirm/',
    me: '/auth/me/',
    profile: '/auth/profile/'
  },
  routes: {
    login: '/login',
    defaultAfterLogin: routes.dashboard(),
    afterLogout: '/login'
  }
};

// =============================================================================
// Data Router configuration
//
// Provider hierarchy:
// - ThemeProvider     (no router deps — here)
// - AuthProvider      (no router deps — here)
// - RouterProvider    (creates router context)
//   └─ AppShell       (router-dependent providers: ContextSwitcher, Toast, etc.)
//      └─ MainLayout  (app chrome with Sidebar, Nav)
//         └─ Pages
// =============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider storage={themeStorage}>
      <QueryProvider>
        <AuthProvider config={authConfig}>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
