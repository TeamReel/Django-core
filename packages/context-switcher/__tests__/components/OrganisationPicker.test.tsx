import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganisationPicker } from '../../src/components/OrganisationPicker';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import type { ContextSwitcherConfig, Organisation } from '../../src/types';
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

const mockOrganisations: Organisation[] = [
  { id: '1', slug: 'acme-corp', name: 'Acme Corp' },
  { id: '2', slug: 'globex', name: 'Globex Corporation' },
  { id: '3', slug: 'initech', name: 'Initech' },
  { id: '4', slug: 'umbrella', name: 'Umbrella Corporation' },
];

const mockConfig: ContextSwitcherConfig = {
  routerAdapter: {
    getCurrentPath: () => '/acme-corp',
    buildPathForContext: () => '/test-path',
    navigateTo: jest.fn(),
  },
  apiBaseUrl: API_BASE_URL,
};

// Helper to render with provider
function renderWithProvider(ui: React.ReactElement, config = mockConfig) {
  return render(
    <ContextSwitcherProvider config={config}>{ui}</ContextSwitcherProvider>
  );
}

describe('OrganisationPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockResolvedValue(mockOrganisations);
  });

  it('renders list of organisations', async () => {
    const onClose = jest.fn();

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    expect(screen.getByText('Globex Corporation')).toBeInTheDocument();
    expect(screen.getByText('Initech')).toBeInTheDocument();
    expect(screen.getByText('Umbrella Corporation')).toBeInTheDocument();
  });

  it('filters organisations on search (3-char minimum)', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Type less than 3 characters - should show all
    await user.type(searchInput, 'ac');
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex Corporation')).toBeInTheDocument();

    // Type 3 characters - should filter
    await user.type(searchInput, 'm');
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Globex Corporation')).not.toBeInTheDocument();
    });
  });

  it('filters by organisation name and slug', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Search by slug
    await user.type(searchInput, 'globex');
    await waitFor(() => {
      expect(screen.getByText('Globex Corporation')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });
  });

  it('calls switchContext on selection', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Globex Corporation')).toBeInTheDocument();
    });

    // Click on Globex
    const globexButton = screen.getByText('Globex Corporation').closest('button');
    fireEvent.click(globexButton!);

    await waitFor(() => {
      expect(setCurrentContext).toHaveBeenCalledWith('2', null, '/api/v1');
    });
  });

  it('closes picker after selection', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Initech')).toBeInTheDocument();
    });

    // Click on Initech
    const initechButton = screen.getByText('Initech').closest('button');
    fireEvent.click(initechButton!);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles keyboard navigation (ArrowDown/Up, Enter, Escape)', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');
    setCurrentContext.mockResolvedValue(undefined);

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    // Arrow down should move selection
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe('org-2');

    // Arrow up should move back
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe('org-1');

    // Enter should select
    fireEvent.keyDown(listbox, { key: 'Enter' });
    await waitFor(() => {
      expect(setCurrentContext).toHaveBeenCalled();
    });

    // Escape should close
    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when no organisations', async () => {
    const onClose = jest.fn();
    const { fetchOrganisations } = require('../../src/api');
    fetchOrganisations.mockResolvedValue([]);

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('No organisations available')).toBeInTheDocument();
    });

    expect(screen.getByText('Contact your administrator')).toBeInTheDocument();
  });

  it('shows no results message for no search matches', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Search for non-existent org
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No organisations found')).toBeInTheDocument();
    });

    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('disables current organisation in list', async () => {
    const onClose = jest.fn();

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    // Acme Corp is the current org (from mockConfig path '/acme-corp')
    const acmeButton = screen.getByText('Acme Corp').closest('button');
    expect(acmeButton).toBeDisabled();
    expect(screen.getByText('Current organisation')).toBeInTheDocument();
  });

  it('shows loading state while switching', async () => {
    const onClose = jest.fn();
    const { setCurrentContext } = require('../../src/api');

    // Make setCurrentContext slow
    setCurrentContext.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Globex Corporation')).toBeInTheDocument();
    });

    // Click on Globex
    const globexButton = screen.getByText('Globex Corporation').closest('button');
    fireEvent.click(globexButton!);

    // Should show loading spinner
    await waitFor(() => {
      expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
    });
  });

  it('resets search when picker closes', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    const { rerender } = renderWithProvider(
      <OrganisationPicker isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

    // Type search query
    await user.type(searchInput, 'test');
    expect(searchInput.value).toBe('test');

    // Close picker
    rerender(
      <ContextSwitcherProvider config={mockConfig}>
        <OrganisationPicker isOpen={false} onClose={onClose} />
      </ContextSwitcherProvider>
    );

    // Reopen picker
    rerender(
      <ContextSwitcherProvider config={mockConfig}>
        <OrganisationPicker isOpen={true} onClose={onClose} />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      const newSearchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(newSearchInput.value).toBe('');
    });
  });
});
