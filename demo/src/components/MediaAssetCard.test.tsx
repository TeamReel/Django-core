import { render, screen, fireEvent } from '@testing-library/react';
import { MediaAssetCard, type MatchMediaItem } from './MediaAssetCard';

// Mock useBrandProfile hook
vi.mock('../hooks/useBrandProfile', () => ({
  getAssetUrl: (path: string | null) => path ? `https://cdn.test/${path}` : null,
}));

// Mock useWorkflows
vi.mock('../hooks/useWorkflows', () => ({
  getStateDisplay: (state: string) => ({
    label: state,
    icon: '●',
    color: '#22c55e',
    bgColor: '#22c55e20',
  }),
}));

const mockItem: MatchMediaItem = {
  id: '1',
  title: 'Lineup graphic',
  mime_type: 'image/png',
  file_url: 'https://example.com/lineup.png',
  storage_path: null,
  state: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('MediaAssetCard', () => {
  it('renders card label', () => {
    render(<MediaAssetCard label="Lineup" subtype="lineup" mediaItem={null} />);
    expect(screen.getByText('Lineup')).toBeInTheDocument();
  });

  it('renders preview image when media item has file_url', () => {
    const { container } = render(
      <MediaAssetCard label="Lineup" subtype="lineup" mediaItem={mockItem} />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/lineup.png');
  });

  it('renders empty state when no media item', () => {
    render(<MediaAssetCard label="Lineup" subtype="lineup" mediaItem={null} />);
    // Should not have an image
    const { container } = render(<MediaAssetCard label="Test" subtype="test" mediaItem={null} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows generating state', () => {
    render(
      <MediaAssetCard label="Lineup" subtype="lineup" mediaItem={null} isGenerating />
    );
    expect(screen.getAllByText(/bezig|generating/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onPreview when clicking media', () => {
    const onPreview = vi.fn();
    render(
      <MediaAssetCard label="Lineup" subtype="lineup" mediaItem={mockItem} onPreview={onPreview} />
    );
    // Click the preview area
    const img = screen.getByRole('img');
    fireEvent.click(img.closest('[class]') || img);
    expect(onPreview).toHaveBeenCalledWith(mockItem);
  });
});
