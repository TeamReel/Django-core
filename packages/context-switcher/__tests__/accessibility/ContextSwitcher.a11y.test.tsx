import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ContextSwitcher } from '../../src/components/ContextSwitcher';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { RouterAdapter } from '../../src/types';

expect.extend(toHaveNoViolations);

// Mock router adapter
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: jest.fn(() => '/test-org/test-project'),
  navigateTo: jest.fn(),
  buildPathForContext: jest.fn((ctx) => `/${ctx.orgSlug}/${ctx.projectSlug || ''}`),
};

// Mock fetch for API calls
const mockOrganisations = [
  { id: '1', name: 'Test Org', slug: 'test-org' },
  { id: '2', name: 'Another Org', slug: 'another-org' },
];

const mockProjects = [
  { id: 'p1', name: 'Project 1', slug: 'project-1', organisationId: '1' },
  { id: 'p2', name: 'Project 2', slug: 'project-2', organisationId: '1' },
];

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string') {
      if (url.includes('/organisations') && !url.includes('/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockOrganisations }),
        } as Response);
      }
      if (url.includes('/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockProjects }),
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
        apiBaseUrl: '/api/v1',
      }}
    >
      {ui}
    </ContextSwitcherProvider>
  );
};

describe('ContextSwitcher accessibility', () => {
  it('has no axe violations in default state', async () => {
    const { container } = renderWithProvider(<ContextSwitcher />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in horizontal variant', async () => {
    const { container } = renderWithProvider(<ContextSwitcher variant="horizontal" />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in vertical variant', async () => {
    const { container } = renderWithProvider(<ContextSwitcher variant="vertical" />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when picker is open', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open organisation picker
    const orgButton = screen.getByLabelText('Change organisation');
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when project picker disabled', async () => {
    // Mock no organisation
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('/organisations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      } as Response);
    }) as jest.Mock;

    const { container } = renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA labels on buttons', async () => {
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toHaveAttribute('aria-label', 'Change organisation');
    expect(orgButton).toHaveAttribute('aria-haspopup', 'dialog');

    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toHaveAttribute('aria-label', 'Change project');
    expect(projectButton).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('updates aria-expanded when pickers open/close', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const orgButton = screen.getByLabelText('Change organisation');

    // Initially collapsed
    expect(orgButton).toHaveAttribute('aria-expanded', 'false');

    // Open picker
    await user.click(orgButton);

    await waitFor(() => {
      expect(orgButton).toHaveAttribute('aria-expanded', 'true');
    });

    // Close picker (Escape)
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(orgButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('hides separator from screen readers', async () => {
    renderWithProvider(<ContextSwitcher variant="horizontal" />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const separator = screen.getByText('/');
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('is keyboard accessible - can tab to all buttons', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Tab to first button
    await user.tab();
    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toHaveFocus();

    // Tab to second button
    await user.tab();
    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toHaveFocus();
  });

  it('can open picker with keyboard', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Tab to org button
    await user.tab();
    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toHaveFocus();

    // Press Enter to open
    await user.keyboard('{Enter}');

    // Picker should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('can open picker with Space key', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Tab to org button
    await user.tab();
    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toHaveFocus();

    // Press Space to open
    await user.keyboard(' ');

    // Picker should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('disabled button is properly marked for screen readers', async () => {
    // Mock no organisation
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('/organisations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      } as Response);
    }) as jest.Mock;

    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toBeDisabled();
    expect(projectButton).toHaveAttribute('disabled');
  });

  it('focus returns to trigger button after closing picker', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ContextSwitcher />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const orgButton = screen.getByLabelText('Change organisation');

    // Open picker
    await user.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Close picker
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Focus should return to button
    expect(orgButton).toHaveFocus();
  });
});
