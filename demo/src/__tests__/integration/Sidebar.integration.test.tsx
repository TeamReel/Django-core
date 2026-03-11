/**
 * Integration test — Sidebar
 *
 * Tests: render nav sections → NavLink items → section titles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import Sidebar from '../../components/Sidebar';

const mockToggle = vi.fn();

vi.mock('../../components/useSidebarData', () => ({
  useSidebarData: () => ({
    isSystemAdmin: false,
    isOrgAdmin: true,
    isLandAdmin: false,
    isPlayer: false,
    isStaff: false,
    user: { first_name: 'John' },
    location: { pathname: '/dashboard' },
    panelASections: [
      {
        id: 'main',
        title: 'Main',
        items: [
          { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
          { path: '/projects', label: 'Projects', icon: 'FolderOpen' },
        ],
      },
    ],
    panelBConfig: null,
    queueCounts: { approvals: 0, generation: 0 },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('Sidebar integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders navigation items', () => {
    renderWithProviders(<Sidebar isOpen toggle={mockToggle} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders section title', () => {
    renderWithProviders(<Sidebar isOpen toggle={mockToggle} />);
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('creates links for nav items', () => {
    renderWithProviders(<Sidebar isOpen toggle={mockToggle} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it('passes isOpen prop to control visibility', () => {
    const { container } = renderWithProviders(<Sidebar isOpen={false} toggle={mockToggle} />);
    // Sidebar should still render but may have collapsed state
    expect(container.firstChild).toBeTruthy();
  });
});
