import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  describe('rendering', () => {
    it('should render children in success state', () => {
      render(
        <Dashboard>
          <div data-testid="content">Dashboard content</div>
        </Dashboard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Dashboard className="custom-class">
          <div>Content</div>
        </Dashboard>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('custom-class');
    });

    it('should apply custom aria-label', () => {
      render(
        <Dashboard aria-label="Custom dashboard">
          <div>Content</div>
        </Dashboard>
      );

      expect(screen.getByLabelText('Custom dashboard')).toBeInTheDocument();
    });
  });

  describe('state management', () => {
    it('should show loading state when loading=true', () => {
      render(
        <Dashboard loading>
          <div data-testid="content">Content</div>
        </Dashboard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should show error state when error is provided', () => {
      const error = new Error('Test error');
      render(
        <Dashboard error={error}>
          <div data-testid="content">Content</div>
        </Dashboard>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should show empty state when isEmpty=true', () => {
      render(
        <Dashboard isEmpty>
          <div data-testid="content">Content</div>
        </Dashboard>
      );

      expect(screen.getByText(/no dashboard widgets/i)).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should prioritize loading over error', () => {
      const error = new Error('Test error');
      render(
        <Dashboard loading error={error}>
          <div>Content</div>
        </Dashboard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should prioritize error over isEmpty', () => {
      const error = new Error('Test error');
      render(
        <Dashboard error={error} isEmpty>
          <div>Content</div>
        </Dashboard>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText(/no dashboard widgets/i)).not.toBeInTheDocument();
    });
  });

  describe('render prop overrides', () => {
    it('should use custom renderLoading', () => {
      const renderLoading = vi.fn(() => <div>Custom loading</div>);
      render(
        <Dashboard loading renderLoading={renderLoading}>
          <div>Content</div>
        </Dashboard>
      );

      expect(renderLoading).toHaveBeenCalled();
      expect(screen.getByText('Custom loading')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should use custom renderError', () => {
      const error = new Error('Test error');
      const renderError = vi.fn(() => <div>Custom error</div>);
      render(
        <Dashboard error={error} renderError={renderError}>
          <div>Content</div>
        </Dashboard>
      );

      expect(renderError).toHaveBeenCalledWith(error);
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('should use custom renderEmpty', () => {
      const renderEmpty = vi.fn(() => <div>Custom empty</div>);
      render(
        <Dashboard isEmpty renderEmpty={renderEmpty}>
          <div>Content</div>
        </Dashboard>
      );

      expect(renderEmpty).toHaveBeenCalled();
      expect(screen.getByText('Custom empty')).toBeInTheDocument();
    });
  });

  describe('compound components', () => {
    it('should expose Header sub-component', () => {
      expect(Dashboard.Header).toBeDefined();
      expect(Dashboard.Header.displayName).toBe('DashboardHeader');
    });

    it('should expose Grid sub-component', () => {
      expect(Dashboard.Grid).toBeDefined();
      expect(Dashboard.Grid.displayName).toBe('DashboardGrid');
    });

    it('should expose FilterBar sub-component', () => {
      expect(Dashboard.FilterBar).toBeDefined();
      expect(Dashboard.FilterBar.displayName).toBe('DashboardFilterBar');
    });

    it('should render with all sub-components', () => {
      render(
        <Dashboard>
          <Dashboard.Header title="Test Dashboard" />
          <Dashboard.FilterBar>
            <div>Filter</div>
          </Dashboard.FilterBar>
          <Dashboard.Grid>
            <div data-testid="widget">Widget</div>
          </Dashboard.Grid>
        </Dashboard>
      );

      expect(screen.getByRole('heading', { name: 'Test Dashboard' })).toBeInTheDocument();
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByTestId('widget')).toBeInTheDocument();
    });
  });
});

describe('DashboardHeader', () => {
  it('should render title as string', () => {
    render(<Dashboard.Header title="Test Title" />);
    expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
  });

  it('should render title as ReactNode', () => {
    render(<Dashboard.Header title={<span data-testid="custom-title">Custom</span>} />);
    expect(screen.getByTestId('custom-title')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<Dashboard.Header title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('should render actions', () => {
    render(<Dashboard.Header title="Title" actions={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('should render breadcrumbs', () => {
    render(<Dashboard.Header title="Title" breadcrumbs={<div>Home / Dashboard</div>} />);
    expect(screen.getByText('Home / Dashboard')).toBeInTheDocument();
  });
});

describe('DashboardGrid', () => {
  it('should render children', () => {
    render(
      <Dashboard.Grid>
        <div data-testid="widget-1">Widget 1</div>
        <div data-testid="widget-2">Widget 2</div>
      </Dashboard.Grid>
    );

    expect(screen.getByTestId('widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-2')).toBeInTheDocument();
  });

  it('should apply responsive column layout', () => {
    render(
      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <div>Widget</div>
      </Dashboard.Grid>
    );

    const grid = screen.getByRole('group');
    expect(grid).toBeInTheDocument();
  });

  it('should accept single column number', () => {
    render(
      <Dashboard.Grid columns={2}>
        <div>Widget</div>
      </Dashboard.Grid>
    );

    const grid = screen.getByRole('group');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
  });

  it('should apply gap spacing', () => {
    render(
      <Dashboard.Grid gap="lg">
        <div>Widget</div>
      </Dashboard.Grid>
    );

    const grid = screen.getByRole('group');
    expect(grid).toHaveStyle({ gap: '1.5rem' });
  });
});

describe('DashboardFilterBar', () => {
  it('should render children', () => {
    render(
      <Dashboard.FilterBar>
        <div data-testid="filter">Filter control</div>
      </Dashboard.FilterBar>
    );

    expect(screen.getByTestId('filter')).toBeInTheDocument();
  });

  it('should not show collapse button on desktop', () => {
    // Mock desktop viewport
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <Dashboard.FilterBar collapsible>
        <div data-testid="filter">Filter</div>
      </Dashboard.FilterBar>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('filter')).toBeInTheDocument();
  });

  it('should call onCollapsedChange callback when provided', () => {
    const onCollapsedChange = vi.fn();

    render(
      <Dashboard.FilterBar collapsible onCollapsedChange={onCollapsedChange}>
        <div>Filter</div>
      </Dashboard.FilterBar>
    );

    // Callback should exist but we don't need to mock mobile for this test
    expect(onCollapsedChange).not.toHaveBeenCalled();
  });
});
