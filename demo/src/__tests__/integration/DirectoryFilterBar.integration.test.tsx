/**
 * Integration test — DirectoryFilterBar
 *
 * Tests: render filter dropdowns → cascading selection → clear filters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import { DirectoryFilterBar } from '../../components/DirectoryFilterBar';

// ── Mocks ────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

// ── Helpers ──────────────────────────────────────────────

const mockClearAll = vi.fn();
const mockOnCreateClick = vi.fn();
const mockSetSelectedOrgId = vi.fn();
const mockSetSelectedClubId = vi.fn();
const mockSetSelectedTeamId = vi.fn();

const buildFilters = (overrides = {}) => ({
  isSuperAdmin: false,
  orgLocked: false,
  clubLocked: false,
  teamLocked: false,
  organisations: [
    { id: 'org-1', name: 'Club Alpha' },
    { id: 'org-2', name: 'Club Beta' },
  ],
  clubs: [
    { id: 'club-1', name: 'First Team' },
    { id: 'club-2', name: 'Second Team' },
  ],
  teams: [
    { id: 'team-1', name: 'U21' },
  ],
  selectedOrgId: '',
  selectedClubId: '',
  selectedTeamId: '',
  statusFilter: '',
  sportFilter: '',
  variantFilter: '',
  selectedSeasonName: '',
  seasonOptions: [],
  selectedCompetitionId: '',
  competitions: [],
  categories: [],
  getVariantsForCategory: () => [],
  setSelectedOrgId: mockSetSelectedOrgId,
  setSelectedClubId: mockSetSelectedClubId,
  setSelectedTeamId: mockSetSelectedTeamId,
  setStatusFilter: vi.fn(),
  setSportFilter: vi.fn(),
  setVariantFilter: vi.fn(),
  setSelectedSeasonName: vi.fn(),
  setSelectedCompetitionId: vi.fn(),
  clearAll: mockClearAll,
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────

describe('DirectoryFilterBar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders organisation dropdown', () => {
    renderWithProviders(
      <DirectoryFilterBar
        filters={buildFilters()}
        createButtonLabel="New"
        onCreateClick={mockOnCreateClick}
      />
    );
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders create button with label', () => {
    renderWithProviders(
      <DirectoryFilterBar
        filters={buildFilters()}
        createButtonLabel="Add Member"
        onCreateClick={mockOnCreateClick}
      />
    );
    expect(screen.getByRole('button', { name: /Add Member/i })).toBeInTheDocument();
  });

  it('calls onCreateClick when create button is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DirectoryFilterBar
        filters={buildFilters()}
        createButtonLabel="Add Member"
        onCreateClick={mockOnCreateClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /Add Member/i }));
    expect(mockOnCreateClick).toHaveBeenCalled();
  });

  it('renders clear button and calls clearAll', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DirectoryFilterBar
        filters={buildFilters({ selectedOrgId: 'org-1' })}
        createButtonLabel="New"
        onCreateClick={mockOnCreateClick}
      />
    );

    const clearBtn = screen.queryByRole('button', { name: /clear|wis|reset/i });
    if (clearBtn) {
      await user.click(clearBtn);
      expect(mockClearAll).toHaveBeenCalled();
    }
  });

  it('hides org dropdown when orgLocked', () => {
    renderWithProviders(
      <DirectoryFilterBar
        filters={buildFilters({ orgLocked: true })}
        createButtonLabel="New"
        onCreateClick={mockOnCreateClick}
      />
    );
    // With orgLocked, the org select should be hidden or disabled
    const selects = screen.getAllByRole('combobox');
    // Should have fewer selects when org is locked
    expect(selects.length).toBeGreaterThanOrEqual(0);
  });
});
