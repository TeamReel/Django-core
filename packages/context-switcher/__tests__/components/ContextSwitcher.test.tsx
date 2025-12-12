import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContextSwitcher } from '../../src/components/ContextSwitcher';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { RouterAdapter } from '../../src/types';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

// Mock router adapter
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: jest.fn(() => '/test-org/test-project'),
  navigateTo: jest.fn(),
  buildPathForContext: jest.fn((ctx) => `/${ctx.orgSlug}/${ctx.projectSlug || ''}`),
};

// Mock fetch for API calls
const mockOrganisations = [
  { id: '1', name: 'Test Org 1', slug: 'test-org-1' },
  { id: '2', name: 'Test Org 2', slug: 'test-org-2' },
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
        apiBaseUrl: API_BASE_URL,
      }}
    >
      {ui}
    </ContextSwitcherProvider>
  );
};

describe('ContextSwitcher', () => {
  it('renders context indicator and trigger buttons', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Should have organisation button
    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toBeInTheDocument();

    // Should have project button
    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toBeInTheDocument();

    // Should have separator (in horizontal mode)
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('renders horizontal layout by default', () => {
    renderWithProvider(<ContextSwitcher />);

    const container = screen.getByLabelText('Change organisation').parentElement;
    expect(container).toHaveStyle({ flexDirection: 'row' });
  });

  it('renders vertical layout when specified', () => {
    renderWithProvider(<ContextSwitcher variant="vertical" />);

    const container = screen.getByLabelText('Change organisation').parentElement;
    expect(container).toHaveStyle({ flexDirection: 'column' });
  });

  it('hides separator in vertical layout', () => {
    renderWithProvider(<ContextSwitcher variant="vertical" />);

    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('opens organisation picker on org button click', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Click organisation button
    const orgButton = screen.getByLabelText('Change organisation');
    fireEvent.click(orgButton);

    // Verify picker opens (modal should be rendered)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Modal should have organisation picker title
    expect(screen.getByText(/select.*organisation/i)).toBeInTheDocument();
  });

  it('opens project picker on project button click', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Click project button
    const projectButton = screen.getByLabelText('Change project');
    fireEvent.click(projectButton);

    // Verify picker opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Modal should have project picker title
    expect(screen.getByText(/select.*project/i)).toBeInTheDocument();
  });

  it('closes picker when user cancels', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Open organisation picker
    const orgButton = screen.getByLabelText('Change organisation');
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape to close
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    // Picker should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('disables project picker when no organisation selected', () => {
    // Mock no organisation context
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

    // Project button should be disabled
    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toBeDisabled();
    expect(projectButton).toHaveStyle({ opacity: '0.5' });
  });

  it('shows "Select project" text when no project selected', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Should show placeholder text
    expect(screen.getByText('Select project')).toBeInTheDocument();
  });

  it('sets aria attributes correctly', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const orgButton = screen.getByLabelText('Change organisation');
    expect(orgButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(orgButton).toHaveAttribute('aria-expanded', 'false');

    const projectButton = screen.getByLabelText('Change project');
    expect(projectButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(projectButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when picker opens', async () => {
    renderWithProvider(<ContextSwitcher />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const orgButton = screen.getByLabelText('Change organisation');

    // Before click
    expect(orgButton).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(orgButton);

    // After click
    await waitFor(() => {
      expect(orgButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('applies custom className', () => {
    renderWithProvider(<ContextSwitcher className="custom-class" />);

    const container = screen.getByLabelText('Change organisation').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});
