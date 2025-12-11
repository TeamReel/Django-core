import React from 'react';
import { AuthProvider } from '@django-core/auth-ui';
import { ContextProvider } from '@django-core/context-switcher';

interface TestProvidersProps {
  children: React.ReactNode;
  authValue?: {
    user: { id: string; email: string; displayName: string };
    isAuthenticated: boolean;
  };
  contextValue?: {
    orgId: string;
    projectId?: string;
    organisationName: string;
    projectName?: string;
  };
}

export function TestProviders({
  children,
  authValue,
  contextValue
}: TestProvidersProps) {
  const defaultAuth = {
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
    isAuthenticated: true,
  };

  const defaultContext = {
    orgId: 'org-123',
    organisationName: 'Test Organisation',
  };

  return (
    <AuthProvider value={authValue || defaultAuth}>
      <ContextProvider value={contextValue || defaultContext}>
        {children}
      </ContextProvider>
    </AuthProvider>
  );
}
