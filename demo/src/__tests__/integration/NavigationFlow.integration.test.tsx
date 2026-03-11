/**
 * Integration test — NavigationFlow
 *
 * Tests BreadcrumbNav back-link rendering in various hierarchy depths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { BreadcrumbNav } from '../../components/BreadcrumbNav';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('Navigation flow integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows last parent in a deep hierarchy', () => {
    const items = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Projects', path: '/projects' },
      { label: 'Team A', path: '/projects/team-a' },
      { label: 'Matches', path: '/projects/team-a/matches', isLeaf: true },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    // Last non-leaf parent is "Team A"
    expect(screen.getByText('Team A')).toBeInTheDocument();
  });

  it('returns null when only leaf items exist', () => {
    const items = [{ label: 'Only', path: '/only', isLeaf: true }];
    const { container } = renderWithProviders(<BreadcrumbNav items={items} />);
    expect(container.innerHTML).toBe('');
  });

  it('back link href equals parent path', () => {
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Current', path: '/current', isLeaf: true },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    const link = screen.getByText('Home').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders back navigation for two non-leaf parents', () => {
    const items = [
      { label: 'Org', path: '/org' },
      { label: 'Club', path: '/org/club' },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    // Last parent shown
    expect(screen.getByText('Club')).toBeInTheDocument();
  });
});
