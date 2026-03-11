/**
 * Integration test — MatchCreateModal
 *
 * Tests: rendering the match create form, form fields, submit/close buttons.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';

const mockHandleCreate = vi.fn((e: any) => e.preventDefault());

vi.mock('../../pages/identity/useMatchCreateData', () => ({
  useMatchCreateData: () => ({
    handleCreate: mockHandleCreate,
    isSaving: false,
    isTeamContextMode: false,
    isSeasonDetailMode: false,
    effectiveTitle: '',
    setTitleTouched: vi.fn(),
    setTitle: vi.fn(),
    title: '',
    selectedOrganisationId: '',
    handleOrganisationChange: vi.fn(),
    sortedOrganisations: [{ id: 'org-1', name: 'Test Federation' }],
    selectedClubId: '',
    applyClubSelection: vi.fn(),
    filteredClubs: [{ id: 'club-1', name: 'Test Club' }],
    selectedTeamId: '',
    applyTeamSelection: vi.fn(),
    filteredTeams: [{ id: 'team-1', name: 'Test Team' }],
    selectedSeasonId: '',
    setSelectedSeasonId: vi.fn(),
    setSelectedCompetitionId: vi.fn(),
    loadingSeasons: false,
    seasonOptions: [{ id: 'season-1', name: '2024-25' }],
    selectedCompetitionId: '',
    loadingCompetitions: false,
    competitionOptions: [{ id: 'comp-1', name: 'League A' }],
    location: '',
    setLocationTouched: vi.fn(),
    setLocation: vi.fn(),
    venue: 'Home',
    setVenue: vi.fn(),
    matchDate: '',
    setMatchDate: vi.fn(),
    matchTime: '',
    setMatchTime: vi.fn(),
    description: '',
    setDescriptionTouched: vi.fn(),
    setDescription: vi.fn(),
    selectedOpponentTeamId: '',
    setSelectedOpponentTeamId: vi.fn(),
    loadingOpponentTeams: false,
    opponentTeamOptions: [{ id: 'opp-1', name: 'Opponent FC' }],
    selectedOpponentOrganisationId: '',
    setSelectedOpponentOrganisationId: vi.fn(),
    selectedOpponentClubId: '',
    setSelectedOpponentClubId: vi.fn(),
    loadingOpponentClubs: false,
    filteredOpponentClubs: [],
    requireOpponent: true,
    error: null,
    derived: { canSubmit: true, locationDefault: '', descriptionDefault: '' },
    orgNameById: vi.fn(() => 'Test Federation'),
    projectNameById: vi.fn(() => 'Test Club'),
    periodNameById: vi.fn(() => '2024-25'),
    resolvedClubId: '',
    initialSeasonId: '',
    initialCompetitionId: '',
  }),
}));

vi.mock('../../pages/identity/MatchCreateModal.module.css', () => ({
  default: {
    backdrop: '',
    container: '',
    closeButton: '',
    formGrid: '',
    control: '',
    controlInput: '',
    controlReadonly: '',
    controlTextarea: '',
  },
}));

import MatchCreateModal from '../../pages/identity/MatchCreateModal';

describe('MatchCreateModal integration', () => {
  const onClose = vi.fn();
  const onCreate = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => vi.clearAllMocks());

  it('returns null when not opened', () => {
    const { container } = renderWithProviders(
      <MatchCreateModal opened={false} onClose={onClose} onCreate={onCreate} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal with header and close button', () => {
    renderWithProviders(
      <MatchCreateModal opened={true} onClose={onClose} onCreate={onCreate} />,
    );
    expect(screen.getByText('Create Match')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders form fields for Title, Date, Time, Venue', () => {
    renderWithProviders(
      <MatchCreateModal opened={true} onClose={onClose} onCreate={onCreate} />,
    );
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue')).toBeInTheDocument();
  });

  it('shows custom headerText when provided', () => {
    renderWithProviders(
      <MatchCreateModal
        opened={true}
        onClose={onClose}
        onCreate={onCreate}
        headerText="Schedule Game"
      />,
    );
    expect(screen.getByText('Schedule Game')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MatchCreateModal opened={true} onClose={onClose} onCreate={onCreate} />,
    );
    await user.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
