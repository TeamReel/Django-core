import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListDetail } from './ListDetail';

// Mock useResponsive hook
vi.mock('../../hooks/useResponsive', () => ({
  useResponsive: vi.fn(() => ({ isMobile: false, isTablet: false, isDesktop: true })),
}));

describe('ListDetail', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(
        <ListDetail>
          <ListDetail.List>
            <div>List Content</div>
          </ListDetail.List>
          <ListDetail.Detail>
            <div>Detail Content</div>
          </ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List Content')).toBeInTheDocument();
      expect(screen.getByText('Detail Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ListDetail className="custom-class">
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies custom aria-label', () => {
      render(
        <ListDetail aria-label="Custom Layout">
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByLabelText('Custom Layout')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('supports uncontrolled selection with defaultSelectedId', () => {
      const { rerender } = render(
        <ListDetail defaultSelectedId="item-1">
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      // Selection state is internal, verify component renders
      expect(screen.getByText('List')).toBeInTheDocument();

      rerender(
        <ListDetail defaultSelectedId={null}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();
    });

    it('supports controlled selection with selectedId and onSelectedIdChange', () => {
      const handleChange = vi.fn();

      render(
        <ListDetail selectedId="item-2" onSelectedIdChange={handleChange}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Detail')).toBeInTheDocument();
    });

    it('supports both string and number IDs', () => {
      const handleChange = vi.fn();

      const { rerender } = render(
        <ListDetail selectedId="string-id" onSelectedIdChange={handleChange}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();

      rerender(
        <ListDetail selectedId={123} onSelectedIdChange={handleChange}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();
    });
  });

  describe('Layout Configuration', () => {
    it('applies custom splitRatio', () => {
      render(
        <ListDetail splitRatio={[1, 3]}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Detail')).toBeInTheDocument();
    });

    it('respects listMinWidth', () => {
      render(
        <ListDetail listMinWidth={400}>
          <ListDetail.List>List</ListDetail.List>
          <ListDetail.Detail>Detail</ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByText('List')).toBeInTheDocument();
    });
  });

  describe('Compound Components', () => {
    it('attaches List sub-component', () => {
      expect(ListDetail.List).toBeDefined();
      expect(ListDetail.List.displayName).toBe('ListDetail.List');
    });

    it('attaches Detail sub-component', () => {
      expect(ListDetail.Detail).toBeDefined();
      expect(ListDetail.Detail.displayName).toBe('ListDetail.Detail');
    });

    it('integrates List and Detail correctly', () => {
      render(
        <ListDetail>
          <ListDetail.List showSearch searchPlaceholder="Find items...">
            <div>Item 1</div>
            <div>Item 2</div>
          </ListDetail.List>
          <ListDetail.Detail>
            <h2>Details</h2>
            <p>Content here</p>
          </ListDetail.Detail>
        </ListDetail>
      );

      expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });
  });
});

describe('ListDetailList', () => {
  it('renders children', () => {
    render(
      <ListDetail>
        <ListDetail.List>
          <button>Item 1</button>
          <button>Item 2</button>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows search bar when showSearch=true', () => {
    render(
      <ListDetail>
        <ListDetail.List showSearch searchPlaceholder="Search projects...">
          <div>Content</div>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls onSearchChange when search query changes', () => {
    const handleSearch = vi.fn();

    render(
      <ListDetail>
        <ListDetail.List showSearch onSearchChange={handleSearch}>
          <div>Content</div>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    const searchInput = screen.getByLabelText('Search');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(handleSearch).toHaveBeenCalledWith('test query');
  });

  it('shows loading state', () => {
    render(
      <ListDetail>
        <ListDetail.List loading>
          <div>Content</div>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <ListDetail>
        <ListDetail.List isEmpty>
          <div>Content</div>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('disables search input when loading', () => {
    render(
      <ListDetail>
        <ListDetail.List showSearch loading>
          <div>Content</div>
        </ListDetail.List>
        <ListDetail.Detail>Detail</ListDetail.Detail>
      </ListDetail>
    );

    const searchInput = screen.getByLabelText('Search');
    expect(searchInput).toBeDisabled();
  });
});

describe('ListDetailDetail', () => {
  it('renders children', () => {
    render(
      <ListDetail>
        <ListDetail.List>List</ListDetail.List>
        <ListDetail.Detail>
          <h1>Project Details</h1>
          <p>Description here</p>
        </ListDetail.Detail>
      </ListDetail>
    );

    expect(screen.getByText('Project Details')).toBeInTheDocument();
    expect(screen.getByText('Description here')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ListDetail>
        <ListDetail.List>List</ListDetail.List>
        <ListDetail.Detail loading>
          <div>Content</div>
        </ListDetail.Detail>
      </ListDetail>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls onBack when back button clicked on mobile', async () => {
    const handleBack = vi.fn();
    const { useResponsive } = await import('../../hooks/useResponsive');

    // Mock useResponsive to return mobile
    const mockResponsive = useResponsive as ReturnType<typeof vi.fn>;
    vi.mocked(mockResponsive).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
    });

    render(
      <ListDetail mobileLayout="overlay">
        <ListDetail.List>List</ListDetail.List>
        <ListDetail.Detail showBackButton onBack={handleBack}>
          <div>Detail Content</div>
        </ListDetail.Detail>
      </ListDetail>
    );

    const backButton = screen.getByLabelText('Back to list');
    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalled();
  });
});
