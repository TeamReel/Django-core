import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { OrganisationPicker } from '../../src/components/OrganisationPicker';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { ContextSwitcherConfig, Organisation } from '../../src/types';
import { API_BASE_URL } from '../testUtils/apiTestConfig';

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

const mockOrganisations: Organisation[] = [
  { id: '1', slug: 'acme-corp', name: 'Acme Corp' },
  { id: '2', slug: 'globex', name: 'Globex Corporation' },
  { id: '3', slug: 'initech', name: 'Initech' },
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

describe('OrganisationPicker Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockResolvedValue(mockOrganisations);
  });

  it('should not have axe violations with organisations', async () => {
    const { container } = renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations in loading state', async () => {
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockOrganisations), 100))
    );

    const { container } = renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations with empty state', async () => {
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockResolvedValue([]);

    const { container } = renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('No organisations available')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have axe violations with search results', async () => {
    const { container } = renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search organisations...');
    searchInput.focus();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA listbox role', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute('aria-label', 'Organisation picker');
  });

  it('has proper ARIA option roles for list items', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);

    options.forEach((option, index) => {
      expect(option).toHaveAttribute('id', `org-${index + 1}`);
      expect(option).toHaveAttribute('aria-selected');
    });
  });

  it('has proper aria-activedescendant on listbox', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-activedescendant');

    const activeDescendant = listbox.getAttribute('aria-activedescendant');
    expect(activeDescendant).toMatch(/^org-\d+$/);
  });

  it('search input has proper aria-label', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search organisations...');
    expect(searchInput).toHaveAttribute('aria-label', 'Search organisations');
  });

  it('supports keyboard-only navigation', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    // Listbox should be focusable
    expect(listbox).toHaveAttribute('tabIndex', '0');

    // Search input should have autoFocus
    const searchInput = screen.getByPlaceholderText('Search organisations...');
    expect(searchInput).toHaveAttribute('autoFocus');
  });

  it('has proper ARIA attributes for disabled items', async () => {
    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    // Acme Corp should be disabled (current org)
    const acmeButton = screen.getByText('Acme Corp').closest('button');
    expect(acmeButton).toBeDisabled();
    expect(acmeButton).toHaveAttribute('aria-selected');
  });
});
