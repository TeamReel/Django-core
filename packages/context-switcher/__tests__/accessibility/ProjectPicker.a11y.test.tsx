import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProjectPicker } from '../../src/components/ProjectPicker';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { ContextSwitcherConfig, Organisation, Project } from '../../src/types';

expect.extend(toHaveNoViolations);

// Mock design system components
jest.mock('@django-core/design-system', () => ({
  Modal: ({ isOpen, children, title }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
  Input: (props: any) => <input {...props} />,
  Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Spinner: () => <div>Loading...</div>,
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
];

const mockConfig: ContextSwitcherConfig = {
  routerAdapter: {
    getCurrentPath: () => '/acme-corp',
    buildPathForContext: () => '/test-path',
    navigateTo: jest.fn(),
  },
  apiBaseUrl: '/api/v1',
};

function renderWithProvider(ui: React.ReactElement, config = mockConfig) {
  return render(
    <ContextSwitcherProvider config={config}>{ui}</ContextSwitcherProvider>
  );
}

describe('ProjectPicker Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { fetchOrganisations, fetchProjects } = require('../../src/api');
    fetchOrganisations.mockResolvedValue([mockOrganisation]);
    fetchProjects.mockResolvedValue(mockProjects);
  });

  it('should not have axe violations with projects', async () => {
    const { container } = renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations in loading state', async () => {
    const { fetchProjects } = require('../../src/api');
    fetchProjects.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockProjects), 100))
    );

    const { container } = renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations with empty state', async () => {
    const { fetchProjects } = require('../../src/api');
    fetchProjects.mockResolvedValue([]);

    const { container } = renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('No projects in this organisation')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations with no organisation', async () => {
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockResolvedValue([]);

    const config: ContextSwitcherConfig = {
      routerAdapter: {
        getCurrentPath: () => '/',
        buildPathForContext: () => '/test-path',
        navigateTo: jest.fn(),
      },
      apiBaseUrl: '/api/v1',
    };

    const { container } = renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />,
      config
    );

    await waitFor(() => {
      expect(screen.getByText('No organisation selected')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA listbox role', async () => {
    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute('aria-label', 'Project picker');
  });

  it('has proper ARIA option roles for list items', async () => {
    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);

    options.forEach((option) => {
      expect(option).toHaveAttribute('id');
      expect(option).toHaveAttribute('aria-selected');
    });
  });

  it('has proper aria-activedescendant on listbox', async () => {
    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-activedescendant');

    const activeDescendant = listbox.getAttribute('aria-activedescendant');
    expect(activeDescendant).toMatch(/^project-p\d+$/);
  });

  it('search input has proper aria-label', async () => {
    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toHaveAttribute('aria-label', 'Search projects');
  });

  it('supports keyboard-only navigation', async () => {
    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    // Listbox should be focusable
    expect(listbox).toHaveAttribute('tabIndex', '0');

    // Search input should have autoFocus
    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toHaveAttribute('autoFocus');
  });

  it('has proper ARIA attributes for disabled items', async () => {
    const config: ContextSwitcherConfig = {
      routerAdapter: {
        getCurrentPath: () => '/acme-corp/web-app',
        buildPathForContext: () => '/test-path',
        navigateTo: jest.fn(),
      },
      apiBaseUrl: '/api/v1',
    };

    renderWithProvider(
      <ProjectPicker isOpen={true} onClose={jest.fn()} />,
      config
    );

    await waitFor(() => {
      expect(screen.getByText('Web App')).toBeInTheDocument();
    });

    // Web App should be disabled (current project)
    const webAppButton = screen.getByText('Web App').closest('button');
    expect(webAppButton).toBeDisabled();
    expect(webAppButton).toHaveAttribute('aria-selected');
  });
});
