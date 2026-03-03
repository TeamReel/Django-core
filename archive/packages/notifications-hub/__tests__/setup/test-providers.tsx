import React from 'react';
import { AuthContext, type AuthContextValue } from '@django-core/auth-ui';
import { ContextSwitcherContext, type ContextSwitcherContextValue } from '@django-core/context-switcher';
import type { Organisation, Project } from '@django-core/context-switcher';

interface TestProvidersProps {
  children: React.ReactNode;
  authValue?: Partial<AuthContextValue>;
  contextValue?: Partial<{
    orgId: string;
    projectId?: string;
    organisationName: string;
    projectName?: string;
  }>;
}

export function TestProviders({
  children,
  authValue,
  contextValue
}: TestProvidersProps) {
  // Default auth context value
  const defaultAuthValue: AuthContextValue = {
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
    status: 'authenticated',
    isLoading: false,
    error: null,
    lastVerified: Date.now(),
    config: {
      apiBaseUrl: '/api/v1',
      endpoints: {
        signIn: '/auth/sign-in/',
        signOut: '/auth/sign-out/',
        me: '/auth/me/',
        requestPasswordReset: '/auth/password-reset/request/',
        confirmPasswordReset: '/auth/password-reset/confirm/',
        updateProfile: '/auth/profile/',
      },
      routes: {
        login: '/login',
        defaultAfterLogin: '/dashboard',
        afterLogout: '/',
      },
      security: {
        csrfCookieName: 'csrftoken',
        csrfHeaderName: 'X-CSRFToken',
      },
    },
    initializeSession: jest.fn().mockResolvedValue(null),
    clearAuth: jest.fn(),
    handleApiError: jest.fn(),
    setUser: jest.fn(),
    ...authValue,
  };

  // Convert shorthand context value to full ContextSwitcherContextValue structure
  const defaultContext = contextValue || { orgId: 'org-123', organisationName: 'Test Organisation' };

  const organisation: Organisation | null = defaultContext.orgId
    ? {
        id: defaultContext.orgId,
        name: defaultContext.organisationName || 'Test Organisation',
        slug: defaultContext.orgId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      }
    : null;

  const project: Project | null = defaultContext.projectId
    ? {
        id: defaultContext.projectId,
        name: defaultContext.projectName || 'Test Project',
        slug: defaultContext.projectId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        organisationId: defaultContext.orgId,
      }
    : null;

  const defaultContextValue: ContextSwitcherContextValue = {
    context: {
      organisation,
      project,
      isLoading: false,
      error: null,
    },
    organisations: organisation ? [organisation] : [],
    projects: project ? [project] : [],
    switchContext: jest.fn().mockResolvedValue(undefined),
    switchProject: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
    isSwitching: false,
  };

  return (
    <AuthContext.Provider value={defaultAuthValue}>
      <ContextSwitcherContext.Provider value={defaultContextValue}>
        {children}
      </ContextSwitcherContext.Provider>
    </AuthContext.Provider>
  );
}
