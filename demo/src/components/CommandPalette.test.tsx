import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import CommandPalette from './CommandPalette';

// Mock navigation hooks used by CommandPalette
vi.mock('../hooks/useNavItems', () => ({
  useNavFavorites: () => [],
  useNavRecents: () => [],
}));

vi.mock('../utils/navStorage', () => ({
  isFavorite: () => false,
  toggleFavorite: vi.fn(),
}));

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <CommandPalette isOpen={false} onClose={vi.fn()} />
    );
    // When not open, should be empty or hidden
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });

  it('renders input when open', () => {
    renderWithProviders(
      <CommandPalette isOpen onClose={vi.fn()} />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows default navigation items', () => {
    renderWithProviders(
      <CommandPalette isOpen onClose={vi.fn()} />
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CommandPalette isOpen onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
