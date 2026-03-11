import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/api', () => ({
  api: { list: vi.fn() },
}));

import { useMatchFormState } from './useMatchFormState';

describe('useMatchFormState', () => {
  it('initialises form fields to defaults when opened', () => {
    const { result } = renderHook(() =>
      useMatchFormState({ opened: true }),
    );

    expect(result.current.title).toBe('');
    expect(result.current.matchDate).toBe('');
    expect(result.current.matchTime).toBe('14:30');
    expect(result.current.venue).toBe('Home');
    expect(result.current.location).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('applies initial values on open', () => {
    const { result } = renderHook(() =>
      useMatchFormState({
        opened: true,
        initialOrganisationId: 'org-1',
        initialClubId: 'club-1',
        initialTeamId: 'team-1',
        initialSeasonId: 'season-1',
        initialCompetitionId: 'comp-1',
        initialDetails: {
          title: 'FC Example vs FC Other',
          matchDate: '2025-01-15',
          matchTime: '20:00',
          venue: 'Away',
          location: 'Stadion',
          description: 'Cup match',
        },
      }),
    );

    expect(result.current.title).toBe('FC Example vs FC Other');
    expect(result.current.matchDate).toBe('2025-01-15');
    expect(result.current.matchTime).toBe('20:00');
    expect(result.current.venue).toBe('Away');
    expect(result.current.location).toBe('Stadion');
    expect(result.current.description).toBe('Cup match');
    expect(result.current.selectedOrganisationId).toBe('org-1');
    expect(result.current.selectedClubId).toBe('club-1');
    expect(result.current.selectedTeamId).toBe('team-1');
  });

  it('updates form fields via setters', () => {
    const { result } = renderHook(() =>
      useMatchFormState({ opened: true }),
    );

    act(() => result.current.setTitle('New Match'));
    expect(result.current.title).toBe('New Match');

    act(() => result.current.setVenue('Away'));
    expect(result.current.venue).toBe('Away');

    act(() => result.current.setError('Something went wrong'));
    expect(result.current.error).toBe('Something went wrong');
  });

  it('tracks touched state for auto-fill fields', () => {
    const { result } = renderHook(() =>
      useMatchFormState({ opened: true }),
    );

    expect(result.current.titleTouched).toBe(false);
    act(() => result.current.setTitleTouched(true));
    expect(result.current.titleTouched).toBe(true);

    expect(result.current.locationTouched).toBe(false);
    act(() => result.current.setLocationTouched(true));
    expect(result.current.locationTouched).toBe(true);
  });

  it('manages selection state', () => {
    const { result } = renderHook(() =>
      useMatchFormState({ opened: true }),
    );

    act(() => result.current.setSelectedSeasonId('s-1'));
    expect(result.current.selectedSeasonId).toBe('s-1');

    act(() => result.current.setSelectedCompetitionId('c-1'));
    expect(result.current.selectedCompetitionId).toBe('c-1');

    act(() => result.current.setSelectedOpponentTeamId('opp-1'));
    expect(result.current.selectedOpponentTeamId).toBe('opp-1');
  });

  it('merges remote clubs/teams over prop lists', () => {
    const propClubs = [{ id: 'c1', name: 'Prop Club' }];
    const propTeams = [{ id: 't1', name: 'Prop Team' }];

    const { result } = renderHook(() =>
      useMatchFormState({
        opened: true,
        clubs: propClubs as any,
        teams: propTeams as any,
      }),
    );

    // Initially no remote clubs/teams, should use props
    expect(result.current.clubsOptions).toHaveLength(1);
    expect(result.current.teamsOptions).toHaveLength(1);

    // When remote clubs are loaded, they take priority
    act(() => result.current.setRemoteClubs([
      { id: 'rc1', name: 'Remote Club 1' },
      { id: 'rc2', name: 'Remote Club 2' },
    ] as any));

    expect(result.current.clubsOptions).toHaveLength(2);
    expect(result.current.clubsOptions[0].name).toBe('Remote Club 1');
  });

  it('applies initial opponent values', () => {
    const { result } = renderHook(() =>
      useMatchFormState({
        opened: true,
        initialOpponent: {
          organisationId: 'opp-org',
          clubId: 'opp-club',
          teamId: 'opp-team',
        },
      }),
    );

    expect(result.current.selectedOpponentOrganisationId).toBe('opp-org');
    expect(result.current.selectedOpponentClubId).toBe('opp-club');
    expect(result.current.selectedOpponentTeamId).toBe('opp-team');
  });
});
