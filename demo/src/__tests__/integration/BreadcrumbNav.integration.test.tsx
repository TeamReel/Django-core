/**
 * Integration test — BreadcrumbNav
 *
 * The BreadcrumbNav shows an iOS-style "← Parent" back link.
 * Only non-leaf parent items are shown; the last parent is rendered as a link.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { BreadcrumbNav, BreadcrumbItem } from '../../components/BreadcrumbNav';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('BreadcrumbNav integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the immediate parent label as a back link', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Projects', path: '/projects' },
      { label: 'Team A', path: '/projects/team-a', isLeaf: true },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders a nav element with aria-label Back', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Current', path: '/current', isLeaf: true },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('returns null when all items are leaf', () => {
    const items: BreadcrumbItem[] = [{ label: 'Leaf', path: '/leaf', isLeaf: true }];
    const { container } = renderWithProviders(<BreadcrumbNav items={items} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a link to the parent path', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Settings', path: '/settings' },
      { label: 'Profile', path: '/settings/profile', isLeaf: true },
    ];
    renderWithProviders(<BreadcrumbNav items={items} />);
    const link = screen.getByText('Settings').closest('a');
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('handles single non-leaf item', () => {
    const items: BreadcrumbItem[] = [{ label: 'Back Home', path: '/home' }];
    renderWithProviders(<BreadcrumbNav items={items} />);
    expect(screen.getByText('Back Home')).toBeInTheDocument();
  });
});
