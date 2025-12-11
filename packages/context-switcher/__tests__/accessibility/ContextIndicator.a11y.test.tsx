/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { ContextIndicator } from '../../src/components/ContextIndicator';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { RouterAdapter } from '../../src/types/router';
import type { Organisation, Project } from '../../src/types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the design system components
jest.mock('@django-core/design-system', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Spinner: ({ size }: { size?: string }) => (
    <div role="status" aria-label="Loading" data-size={size}>
      Loading...
    </div>
  ),
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

// Mock the API calls
jest.mock('../../src/api', () => ({
  fetchOrganisations: jest.fn(),
  fetchProjects: jest.fn(),
  setCurrentContext: jest.fn(),
}));

describe('ContextIndicator accessibility', () => {
  const mockOrganisation: Organisation = {
    id: 'org-1',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    metadata: {},
  };

  const mockProject: Project = {
    id: 'proj-1',
    slug: 'website',
    name: 'Website Project',
    organisationId: 'org-1',
    metadata: {},
  };

  const mockRouterAdapter: RouterAdapter = {
    getCurrentPath: () => '/acme-corp',
    navigateTo: jest.fn(),
    buildPathForContext: jest.fn((org, proj) => `/${org}${proj ? `/${proj}` : ''}`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has no axe violations with org context', async () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: mockOrganisation,
          project: null,
          isLoading: false,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with org + project context', async () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: mockOrganisation,
          project: mockProject,
          isLoading: false,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in loading state', async () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: null,
          project: null,
          isLoading: true,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: null,
          project: null,
          isLoading: false,
          error: {
            code: 500,
            message: 'Failed to load context',
          },
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('announces context to screen readers with role="status"', () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: mockOrganisation,
          project: null,
          isLoading: false,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const status = container.querySelector('[role="status"]');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('has proper aria-label describing current context', () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: mockOrganisation,
          project: mockProject,
          isLoading: false,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute(
      'aria-label',
      'Currently in Acme Corporation, Website Project project'
    );
  });

  it('provides title attributes for truncated text', () => {
    const longOrg: Organisation = {
      ...mockOrganisation,
      name: 'A Very Long Organisation Name That Will Be Truncated',
    };

    const { getByText } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: longOrg,
          project: null,
          isLoading: false,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const orgName = getByText(longOrg.name);
    expect(orgName).toHaveAttribute('title', longOrg.name);
  });

  it('loading spinner has appropriate ARIA labels', () => {
    const { getByLabelText } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: null,
          project: null,
          isLoading: true,
          error: null,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    expect(getByLabelText('Loading')).toBeInTheDocument();
  });

  it('error alert has role="alert" for immediate announcement', () => {
    const { container } = render(
      <ContextSwitcherProvider
        routerAdapter={mockRouterAdapter}
        initialContext={{
          organisation: null,
          project: null,
          isLoading: false,
          error: {
            code: 500,
            message: 'Failed to load context',
          },
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });
});
