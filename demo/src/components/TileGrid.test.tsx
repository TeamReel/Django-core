import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { TileGrid, type TileItem } from './TileGrid';
import { Home, Star, Users } from 'lucide-react';

const items: TileItem[] = [
  { path: '/dashboard', label: 'Dashboard', description: 'Overview', icon: Home },
  { path: '/favorites', label: 'Favorites', icon: Star },
  { path: '/members', label: 'Members', description: 'Team roster', icon: Users },
];

describe('TileGrid', () => {
  it('renders all tile items', () => {
    renderWithProviders(<TileGrid items={items} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('renders descriptions when provided', () => {
    renderWithProviders(<TileGrid items={items} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Team roster')).toBeInTheDocument();
  });

  it('renders tiles as links', () => {
    renderWithProviders(<TileGrid items={items} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/dashboard');
    expect(links[1]).toHaveAttribute('href', '/favorites');
  });

  it('renders empty when items is empty', () => {
    const { container } = renderWithProviders(<TileGrid items={[]} />);
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(0);
  });
});
