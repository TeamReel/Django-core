/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import type { AuthConfig } from '@django-core/auth-ui';
import { ThemeProvider, LocalStorageAdapter } from '@django-core/theme-system';
import { router } from './router';
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
      <AuthProvider config={authConfig}>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
