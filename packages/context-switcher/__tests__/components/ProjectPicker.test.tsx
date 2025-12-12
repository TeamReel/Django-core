import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectPicker } from '../../src/components/ProjectPicker';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { ContextSwitcherConfig, Organisation, Project } from '../../src/types';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

// Mock design system components
jest.mock('@django-core/design-system', () => ({
  Modal: ({ isOpen, children, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
  Input: (props: any) => <input {...props} data-testid="search-input" />,
  Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock API calls
jest.mock('../../src/api', () => ({
  fetchOrganisations: jest.fn(),
  fetchProjects: jest.fn(),
  setCurrentContext: jest.fn(),
}));

const mockOrganisation: Organisation = {
  id: '1',
  slug: 'acme-corp',
  name: 'Acme Corp',
};

const mockProjects: Project[] = [
  { id: 'p1', slug: 'web-app', name: 'Web App', organisationId: '1' },
  { id: 'p2', slug: 'mobile-app', name: 'Mobile App', organisationId: '1' },
  { id: 'p3', slug: 'api', name: 'API Service', organisationId: '1' },
  { id: 'p4', slug: 'other-org-project', name: 'Other Org Project', organisationId: '2' },
];

const mockConfig: ContextSwitcherConfig = {
  routerAdapter: {
    getCurrentPath: () => '/acme-corp',
    buildPathForContext: () => '/test-path',
    navigateTo: jest.fn(),
  },
  apiBaseUrl: API_BASE_URL,
};

function renderWithProvider(ui: React.ReactElement, config = mockConfig) {
  return render(
    <ContextSwitcherProvider config={config}>{ui}</ContextSwitcherProvider>
  );
}

describe('ProjectPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { fetchOrganisations, fetchProjects } = require('../../src/api');
    fetchOrganisations.mockResolvedValue([mockOrganisation]);
    fetchProjects.mockResolvedValue(mockProjects);
  });

  it('renders projects for current organisation only', async () => {
    const onClose = jest.fn();

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    expect(screen.getByText('Mobile App')).toBeInTheDocument();
    expect(screen.getByText('API Service')).toBeInTheDocument();
    // Project from other org should not appear
    expect(screen.queryByText('Other Org Project')).not.toBeInTheDocument();
  });

  it('filters projects on search (3-char minimum)', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Type less than 3 characters - should show all
    await user.type(searchInput, 'ap');
    expect(screen.getByText('Web App')).toBeInTheDocument();
    expect(screen.getByText('Mobile App')).toBeInTheDocument();

    // Type 3 characters - should filter
    await user.type(searchInput, 'i');
    await waitFor(() => {
      expect(screen.getByText('API Service')).toBeInTheDocument();
      expect(screen.queryByText('Web App')).not.toBeInTheDocument();
    });
  });

  it('filters by project name and slug', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Search by slug
    await user.type(searchInput, 'mobile-app');
    await waitFor(() => {
      expect(screen.getByText('Mobile App')).toBeInTheDocument();
      expect(screen.queryByText('Web App')).not.toBeInTheDocument();
    });
  });

  it('calls switchContext on selection', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Mobile App')).toBeInTheDocument();
    });

    // Click on Mobile App
    const mobileButton = screen.getByText('Mobile App').closest('button');
    fireEvent.click(mobileButton!);

    await waitFor(() => {
      expect(setCurrentContext).toHaveBeenCalledWith('1', 'p2', '/api/v1');
    });
  });

  it('closes picker after selection', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('API Service')).toBeInTheDocument();
    });

    // Click on API Service
    const apiButton = screen.getByText('API Service').closest('button');
    fireEvent.click(apiButton!);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles keyboard navigation (ArrowDown/Up, Enter, Escape)', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    // Arrow down should move selection
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe('project-p2');

    // Arrow up should move back
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe('project-p1');

    // Enter should select
    fireEvent.keyDown(listbox, { key: 'Enter' });
    await waitFor(() => {
      expect(setCurrentContext).toHaveBeenCalled();
    });

    // Escape should close
    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when org has no projects', async () => {
    const onClose = jest.fn();
    const { fetchProjects } = require('../../src/api');
    fetchProjects.mockResolvedValue([]);

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('No projects in this organisation')).toBeInTheDocument();
    });

    expect(screen.getByText('Create a project to get started')).toBeInTheDocument();
  });

  it('shows no results message for no search matches', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Search for non-existent project
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });

    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('disables picker when no org selected', async () => {
    const onClose = jest.fn();
    const { fetchOrganisations } = require('../../src/api');

    // Mock no organisations
    fetchOrganisations.mockResolvedValue([]);

    const config: ContextSwitcherConfig = {
      routerAdapter: {
        getCurrentPath: () => '/',
        buildPathForContext: () => '/test-path',
        navigateTo: jest.fn(),
      },
      apiBaseUrl: API_BASE_URL,
    };

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />,
      config
    );

    await waitFor(() => {
      expect(screen.getByText('No organisation selected')).toBeInTheDocument();
    });

    expect(screen.getByText('Please select an organisation first')).toBeInTheDocument();
  });

  it('disables current project in list', async () => {
    const onClose = jest.fn();

    const config: ContextSwitcherConfig = {
      routerAdapter: {
        getCurrentPath: () => '/acme-corp/web-app',
        buildPathForContext: () => '/test-path',
        navigateTo: jest.fn(),
      },
      apiBaseUrl: API_BASE_URL,
    };

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />,
      config
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    // Web App should be disabled (current project)
    const webAppButton = screen.getByText('Web App').closest('button');
    expect(webAppButton).toBeDisabled();
    expect(screen.getByText('Current project')).toBeInTheDocument();
  });

  it('shows loading state while switching', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');

    // Make setCurrentContext slow
    setCurrentContext.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Mobile App')).toBeInTheDocument();
    });

    // Click on Mobile App
    const mobileButton = screen.getByText('Mobile App').closest('button');
    fireEvent.click(mobileButton!);

    // Should show loading spinner
    await waitFor(() => {
      expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
    });
  });

  it('resets search when picker closes', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    const { rerender } = renderWithProvider(
      <ProjectPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

    // Type search query
    await user.type(searchInput, 'test');
    expect(searchInput.value).toBe('test');

    // Close picker
    rerender(
      <ContextSwitcherProvider config={mockConfig}>
        <ProjectPicker isOpen={false} onClose={onClose} />
      </ContextSwitcherProvider>
    );

    // Reopen picker
    rerender(
      <ContextSwitcherProvider config={mockConfig}>
        <ProjectPicker isOpen={true} onClose={onClose} />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      const newSearchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(newSearchInput.value).toBe('');
    });
  });
});
