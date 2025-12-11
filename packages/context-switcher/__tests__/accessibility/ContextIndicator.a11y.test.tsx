/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { ContextIndicator } from '../../src/components/ContextIndicator';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { ContextSwitcherConfig, Organisation, Project } from '../../src/types';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

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

  const mockConfig: ContextSwitcherConfig = {
    routerAdapter: {
      getCurrentPath: () => '/acme-corp',
      navigateTo: jest.fn(),
      buildPathForContext: jest.fn((org, proj) => `/${org}${proj ? `/${proj}` : ''}`),
    },
    apiBaseUrl: API_BASE_URL,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const api = require('../../src/api');
    // Default: return mock org and project
    api.fetchOrganisations.mockResolvedValue([mockOrganisation]);
    api.fetchProjects.mockResolvedValue([mockProject]);
    // Ensure setCurrentContext doesn't throw
    api.setCurrentContext.mockResolvedValue(undefined);
  });

  it('has no axe violations with org context', async () => {
    const config: ContextSwitcherConfig = {
      ...mockConfig,
      routerAdapter: {
        ...mockConfig.routerAdapter,
        getCurrentPath: () => '/acme-corp',
      },
    };

    const { container } = render(
      <ContextSwitcherProvider config={config}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for context to load
    await waitFor(() => {
      expect(container.textContent).toContain('Acme Corporation');
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with org + project context', async () => {
    const config: ContextSwitcherConfig = {
      ...mockConfig,
      routerAdapter: {
        ...mockConfig.routerAdapter,
        getCurrentPath: () => '/acme-corp/website',
      },
    };

    const { container } = render(
      <ContextSwitcherProvider config={config}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for context to load
    await waitFor(() => {
      expect(container.textContent).toContain('Website Project');
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in loading state', async () => {
    const api = require('../../src/api');
    // Mock a slow API response to capture loading state
    api.fetchOrganisations.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Verify we're in loading state
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const api = require('../../src/api');
    api.fetchOrganisations.mockRejectedValue(new Error('Failed to load context'));

    const { container } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for error state
    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('announces context to screen readers with role="status"', async () => {
    const { container } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for context to load
    await waitFor(() => {
      expect(container.textContent).toContain('Acme Corporation');
    });

    // Find the ContextIndicator's status element (not the provider's ARIA live region)
    const statuses = container.querySelectorAll('[role="status"]');
    const indicatorStatus = Array.from(statuses).find(
      el => el.getAttribute('aria-label')?.includes('Currently in')
    );

    expect(indicatorStatus).toBeInTheDocument();
    expect(indicatorStatus).toHaveAttribute('aria-live', 'polite');
  });

  it('has proper aria-label describing current context', async () => {
    const config: ContextSwitcherConfig = {
      ...mockConfig,
      routerAdapter: {
        ...mockConfig.routerAdapter,
        getCurrentPath: () => '/acme-corp/website',
      },
    };

    const { container } = render(
      <ContextSwitcherProvider config={config}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for context to load
    await waitFor(() => {
      expect(container.textContent).toContain('Website Project');
    });

    // Find the ContextIndicator's status element (not the provider's ARIA live region)
    const statuses = container.querySelectorAll('[role="status"]');
    const indicatorStatus = Array.from(statuses).find(
      el => el.getAttribute('aria-label')?.includes('Currently in')
    );

    expect(indicatorStatus).toHaveAttribute(
      'aria-label',
      'Currently in Acme Corporation, Website Project project'
    );
  });

  it('provides title attributes for truncated text', async () => {
    const longOrg: Organisation = {
      ...mockOrganisation,
      name: 'A Very Long Organisation Name That Will Be Truncated',
    };

    const api = require('../../src/api');
    api.fetchOrganisations.mockResolvedValue([longOrg]);
    api.fetchProjects.mockResolvedValue([mockProject]);

    const { getByText } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for context to load
    await waitFor(() => {
      expect(getByText(longOrg.name)).toBeInTheDocument();
    });

    const orgName = getByText(longOrg.name);
    expect(orgName).toHaveAttribute('title', longOrg.name);
  });

  it('loading spinner has appropriate ARIA labels', () => {
    const api = require('../../src/api');
    // Mock slow response to capture loading state
    api.fetchOrganisations.mockImplementation(() => new Promise(() => {}));

    const { getByLabelText } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    expect(getByLabelText('Loading')).toBeInTheDocument();
  });

  it('error alert has role="alert" for immediate announcement', async () => {
    const api = require('../../src/api');
    api.fetchOrganisations.mockRejectedValue(new Error('Failed to load context'));

    const { container } = render(
      <ContextSwitcherProvider config={mockConfig}>
        <ContextIndicator />
      </ContextSwitcherProvider>
    );

    // Wait for error state
    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });
});
