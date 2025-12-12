import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextSwitcher } from '../../src/components/ContextSwitcher';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { RouterAdapter } from '../../src/types';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

/**
 * Integration tests for ContextSwitcher component.
 * Tests the full user flow: open picker → search → select → URL updates.
 */

// Mock data
const mockOrganisations = [
  { id: '1', name: 'Acme Corp', slug: 'acme-corp' },
  { id: '2', name: 'Beta Ltd', slug: 'beta-ltd' },
  { id: '3', name: 'Gamma Inc', slug: 'gamma-inc' },
];

const mockAcmeProjects = [
  { id: 'p1', name: 'Project Alpha', slug: 'project-alpha', organisationId: '1' },
  { id: 'p2', name: 'Project Beta', slug: 'project-beta', organisationId: '1' },
];

const mockBetaProjects = [
  { id: 'p3', name: 'Project Gamma', slug: 'project-gamma', organisationId: '2' },
];

// Mock router adapter with spy functions
const mockNavigateTo = jest.fn();
const mockGetCurrentPath = jest.fn(() => '/acme-corp/project-alpha');
const mockBuildPathForContext = jest.fn((ctx) => {
  const base = `/${ctx.orgSlug}`;
  return ctx.projectSlug ? `${base}/${ctx.projectSlug}` : base;
});

const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: mockGetCurrentPath,
  navigateTo: mockNavigateTo,
  buildPathForContext: mockBuildPathForContext,
};

beforeEach(() => {
  // Reset mocks
  mockNavigateTo.mockClear();
  mockGetCurrentPath.mockClear();
  mockBuildPathForContext.mockClear();

  // Mock fetch API
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string') {
      // Organisations list
      if (url.includes('/organisations') && !url.includes('/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockOrganisations }),
        } as Response);
      }

      // Projects for Acme Corp
      if (url.includes('/acme-corp/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAcmeProjects }),
        } as Response);
      }

      // Projects for Beta Ltd
      if (url.includes('/beta-ltd/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockBetaProjects }),
        } as Response);
      }
    }

    return Promise.resolve({
      ok: false,
      statusText: 'Not Found',
    } as Response);
  }) as jest.Mock;
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <ContextSwitcherProvider
      config={{
        routerAdapter: mockRouterAdapter,
        apiBaseUrl: API_BASE_URL,
      }}
    >
      {ui}
    </ContextSwitcherProvider>
  );
};

describe('ContextSwitcher integration', () => {
  it('fetches organisations and projects on mount', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Should make API calls
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/organisations'),
        expect.any(Object)
      );
    });

    // Should fetch projects for current org
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/acme-corp/projects'),
        expect.any(Object)
      );
    });
  });

  it('completes full organisation switch flow', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Step 1: Click organisation button to open picker
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    // Step 2: Wait for picker to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Step 3: Search for "Beta"
    const searchInput = screen.getByPlaceholderText(/search.*organisation/i);
    await user.type(searchInput, 'Beta');

    // Step 4: Wait for filtered results
    await waitFor(() => {
      expect(screen.getByText('Beta Ltd')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });

    // Step 5: Select Beta Ltd
    const betaOption = screen.getByRole('option', { name: /beta ltd/i });
    await user.click(betaOption);

    // Step 6: Verify URL navigation happened
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('/beta-ltd')
      );
    });

    // Step 7: Verify picker closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('completes full project switch flow', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Step 1: Click project button to open picker
    const projectButton = screen.getByLabelText('Change project');
    await user.click(projectButton);

    // Step 2: Wait for picker to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Step 3: Search for "Beta"
    const searchInput = screen.getByPlaceholderText(/search.*project/i);
    await user.type(searchInput, 'Beta');

    // Step 4: Wait for filtered results
    await waitFor(() => {
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
    });

    // Step 5: Select Project Beta
    const projectOption = screen.getByRole('option', { name: /project beta/i });
    await user.click(projectOption);

    // Step 6: Verify URL navigation happened
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('/project-beta')
      );
    });

    // Step 7: Verify picker closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('updates URL when switching between organisations', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open organisation picker
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select different org
    const gammaOption = screen.getByRole('option', { name: /gamma inc/i });
    await user.click(gammaOption);

    // Verify navigation to new org
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('/gamma-inc');
    });
  });

  it('handles keyboard navigation in picker', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open organisation picker
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Focus should be in search input
    const searchInput = screen.getByPlaceholderText(/search.*organisation/i);
    expect(searchInput).toHaveFocus();

    // Arrow down to navigate options
    await user.keyboard('{ArrowDown}');

    // First option should have focus indicator
    const firstOption = screen.getByRole('option', { name: /acme corp/i });
    expect(firstOption).toHaveAttribute('data-focused', 'true');

    // Press Enter to select
    await user.keyboard('{Enter}');

    // Should navigate
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalled();
    });
  });

  it('closes picker on Escape key', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open picker
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Picker should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Should not navigate
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('persists context after switching', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Switch organisation
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const betaOption = screen.getByRole('option', { name: /beta ltd/i });
    await user.click(betaOption);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Context should show new organisation
    await waitFor(() => {
      expect(screen.getByText('Beta Ltd')).toBeInTheDocument();
    });
  });
});
