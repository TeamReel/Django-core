/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContextIndicator } from '../../src/components/ContextIndicator';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { RouterAdapter } from '../../src/types/router';
import type { Organisation, Project } from '../../src/types';
import * as api from '../../src/api';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

// Mock the design system components
jest.mock('@django-core/design-system', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner" data-size={size}>Loading...</div>,
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
}));

// Mock the API calls
jest.mock('../../src/api');

const mockedApi = api as jest.Mocked<typeof api>;

describe('ContextIndicator', () => {
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

    // Default mock responses - APIs return arrays directly
    mockedApi.fetchOrganisations.mockResolvedValue([mockOrganisation]);
    mockedApi.fetchProjects.mockResolvedValue([]);
  });

  it('renders organisation name when only org context exists', async () => {
    mockedApi.fetchProjects.mockResolvedValue([]);

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('renders org + project names when both exist', async () => {
    // Mock router to return path with project
    const routerWithProject: RouterAdapter = {
      getCurrentPath: () => '/acme-corp/website',
      navigateTo: jest.fn(),
      buildPathForContext: jest.fn(),
    };

    mockedApi.fetchProjects.mockResolvedValue([mockProject]);

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: routerWithProject,
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Website Project')).toBeInTheDocument();
  });

  it('shows loading state with spinner initially', () => {
    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('data-size', 'sm');
  });

  it('shows error state when API fails', async () => {
    mockedApi.fetchOrganisations.mockRejectedValue(new Error('API Error'));

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      const alert = screen.queryByTestId('alert');
      expect(alert).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('truncates long names with ellipsis', async () => {
    const longOrg: Organisation = {
      ...mockOrganisation,
      name: 'A'.repeat(100), // Very long name
    };

    mockedApi.fetchOrganisations.mockResolvedValue([longOrg]);

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: {
            ...mockRouterAdapter,
            getCurrentPath: () => `/${longOrg.slug}`,
          },
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const orgName = screen.getByText('A'.repeat(100));
    expect(orgName).toBeInTheDocument();
    // Check that truncation styles are applied
    expect(orgName).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '200px',
    });
  });

  it('adds title attribute for full name on hover', async () => {
    mockedApi.fetchProjects.mockResolvedValue([mockProject]);

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: {
            ...mockRouterAdapter,
            getCurrentPath: () => '/acme-corp/website',
          },
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const orgName = screen.getByText('Acme Corporation');
    expect(orgName).toHaveAttribute('title', 'Acme Corporation');

    const projectName = screen.getByText('Website Project');
    expect(projectName).toHaveAttribute('title', 'Website Project');
  });

  it('adds ARIA labels for screen readers', async () => {
    mockedApi.fetchProjects.mockResolvedValue([mockProject]);

    const { container } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: {
            ...mockRouterAdapter,
            getCurrentPath: () => '/acme-corp/website',
          },
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toBeInTheDocument();
    expect(statusDiv).toHaveAttribute('aria-live', 'polite');
    expect(statusDiv).toHaveAttribute(
      'aria-label',
      'Currently in Acme Corporation, Website Project project'
    );
  });

  it('updates aria-label for org-only context', async () => {
    const { container } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: API_BASE_URL,
        }}
      >
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveAttribute(
      'aria-label',
      'Currently in Acme Corporation'
    );
  });
});
