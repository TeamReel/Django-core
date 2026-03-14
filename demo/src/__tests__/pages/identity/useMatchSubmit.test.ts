import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../pages/identity/matchCreateHelpers', () => ({
  combineDateTime: vi.fn(() => '2024-01-15T15:00:00'),
  addHoursToIsoLike: vi.fn(() => '2024-01-15T17:00:00'),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useMatchSubmit } from '@/pages/identity/useMatchSubmit';

const makeMockForm = (overrides: Record<string, unknown> = {}) => ({
  setTitle: vi.fn(), setTitleTouched: vi.fn(), setTitleAutoValue: vi.fn(),
  setMatchDate: vi.fn(), setMatchTime: vi.fn(),
  setLocation: vi.fn(), setLocationTouched: vi.fn(), setLocationAutoValue: vi.fn(),
  setDescription: vi.fn(), setDescriptionTouched: vi.fn(), setDescriptionAutoValue: vi.fn(),
  setIsSaving: vi.fn(), setError: vi.fn(),
  matchDate: '2024-01-15', matchTime: '15:00', venue: 'Home',
  location: 'Sportpark', description: 'Competitie',
  selectedOrganisationId: 'org-1', selectedTeamId: 'team-1',
  selectedOpponentTeamId: 'opp-1', selectedSeasonId: 'season-1', selectedCompetitionId: 'comp-1',
  ...overrides,
} as any);

const makeMockDerived = () => ({
  derived: { titleDefault: 'Default Title', locationDefault: '', descriptionDefault: '', metadataBase: { teamreel: { match_context: {}, vars: {} } } },
  effectiveTitle: 'Team A vs Team B',
  resolvedClubId: 'club-1',
} as any);

describe('useMatchSubmit', () => {
  beforeEach(() => vi.clearAllMocks());

  const base = (formOverrides: Record<string, unknown> = {}) => ({
    form: makeMockForm(formOverrides),
    derivedState: makeMockDerived(),
    requireOpponent: false,
    initialSeasonId: '',
    initialCompetitionId: '',
    onCreate: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  });

  it('sets error when organisation is missing', async () => {
    const props = base({ selectedOrganisationId: '' });
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.form.setError).toHaveBeenCalledWith('Select a federation first.');
  });

  it('sets error when club is missing', async () => {
    const props = base();
    props.derivedState.resolvedClubId = '';
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.form.setError).toHaveBeenCalledWith('Select a club first.');
  });

  it('sets error when team is missing', async () => {
    const props = base({ selectedTeamId: '' });
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.form.setError).toHaveBeenCalledWith('Select a team first.');
  });

  it('sets error when opponent required but missing', async () => {
    const props = { ...base({ selectedOpponentTeamId: '' }), requireOpponent: true };
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.form.setError).toHaveBeenCalledWith('Select an opponent first.');
  });

  it('calls onCreate and onClose on success', async () => {
    const props = base();
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.onCreate).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalled();
    // Form should be reset
    expect(props.form.setTitle).toHaveBeenCalledWith('');
    expect(props.form.setMatchDate).toHaveBeenCalledWith('');
    expect(props.form.setIsSaving).toHaveBeenCalledWith(false);
  });

  it('handles onCreate rejection', async () => {
    const props = base();
    props.onCreate.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useMatchSubmit(props));
    await act(async () => { await result.current.handleCreate({ preventDefault: vi.fn() } as any); });
    expect(props.form.setError).toHaveBeenCalledWith('Server error');
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
