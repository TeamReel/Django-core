import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockAppSelection = {
  orgSlug: 'fc-example',
  clubSlugOrId: 'club-1',
  clubName: 'FC Example',
  teamSlugOrId: 'team-1',
  teamName: 'Heren 1',
  teamIdForApi: 'team-uuid-1',
  seasonSlugOrId: 'season-1',
  seasonName: 'Eredivisie 24/25',
  seasonIdForApi: 'season-uuid-1',
  competitionSlugOrId: null,
  competitionName: null,
  competitionIdForApi: null,
  matchId: 'match-42',
};

vi.mock('./useAppSelection', () => ({
  useAppSelection: () => mockAppSelection,
}));

import { useCreateContext } from './useCreateContext';

describe('useCreateContext', () => {
  beforeEach(() => {
    // Reset to defaults
    Object.assign(mockAppSelection, {
      orgSlug: 'fc-example',
      clubSlugOrId: 'club-1',
      clubName: 'FC Example',
      teamSlugOrId: 'team-1',
      teamName: 'Heren 1',
      teamIdForApi: 'team-uuid-1',
      seasonSlugOrId: 'season-1',
      seasonName: 'Eredivisie 24/25',
      seasonIdForApi: 'season-uuid-1',
      competitionSlugOrId: null,
      competitionName: null,
      competitionIdForApi: null,
      matchId: 'match-42',
    });
  });

  it('constructs prefill from app selection', () => {
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.prefill).toEqual(expect.objectContaining({
      organisationSlug: 'fc-example',
      clubProjectId: 'club-1',
      clubName: 'FC Example',
      teamProjectId: 'team-1',
      teamName: 'Heren 1',
      teamIdForApi: 'team-uuid-1',
      periodId: 'season-uuid-1',
      periodName: 'Eredivisie 24/25',
      activityId: 'match-42',
    }));
  });

  it('builds breadcrumb from team + season name', () => {
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.breadcrumb).toBe('Heren 1 › Eredivisie 24/25');
  });

  it('uses club name in breadcrumb when no team', () => {
    mockAppSelection.teamName = null;
    mockAppSelection.teamSlugOrId = null;
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.breadcrumb).toBe('FC Example');
  });

  it('returns null breadcrumb when no context', () => {
    mockAppSelection.teamName = null;
    mockAppSelection.teamSlugOrId = null;
    mockAppSelection.clubName = null;
    mockAppSelection.clubSlugOrId = null;
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.breadcrumb).toBeNull();
  });

  it('hasContext is true when team or club is set', () => {
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.hasContext).toBe(true);
  });

  it('hasContext is false when neither team nor club is set', () => {
    mockAppSelection.teamSlugOrId = null;
    mockAppSelection.clubSlugOrId = null;
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.hasContext).toBe(false);
  });

  it('omits undefined values in prefill for null selections', () => {
    mockAppSelection.competitionSlugOrId = null;
    mockAppSelection.competitionName = null;
    mockAppSelection.competitionIdForApi = null;
    const { result } = renderHook(() => useCreateContext());
    expect(result.current.prefill.competitionId).toBeUndefined();
    expect(result.current.prefill.competitionName).toBeUndefined();
  });
});
