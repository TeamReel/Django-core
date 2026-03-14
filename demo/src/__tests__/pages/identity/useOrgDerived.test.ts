import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Period } from '@/utils/directoryHelpers';

vi.mock('../../../pages/identity/orgDataHelpers', () => ({
  getBestMatchDetailPath: vi.fn(() => '/matches/1'),
  ORG_TABS: [
    { id: 'overview', label: 'Overview' },
    { id: 'clubs', label: 'Clubs' },
    { id: 'members', label: 'Members' },
    { id: 'identity', label: 'Identity' },
    { id: 'settings', label: 'Settings' },
  ],
  ALLOWED_TABS: new Set(['overview', 'clubs', 'members', 'identity', 'settings']),
  LEGACY_TAB_MAP: { hierarchy: 'clubs', teams: 'clubs', users: 'members' } as Record<string, string>,
}));
vi.mock('../../../pages/identity/orgDetailUtils', () => ({
  isSeasonPeriod: vi.fn(() => true),
  isCompetitionPeriod: vi.fn(() => false),
}));

import { useOrgDerived } from '@/pages/identity/useOrgDerived';

type Params = Parameters<typeof useOrgDerived>[0];

const base = (overrides: Partial<Params> = {}): Params => ({
  location: { search: '', pathname: '/org-1' },
  org: { id: '1', name: 'Test Org' } as any,
  resolvedOrg: undefined,
  currentOrgSlug: 'test-org',
  currentOrgId: '1',
  orgPeriods: [],
  members: [],
  teams: [],
  clubs: [],
  allClubsForTeams: [],
  isSuperAdmin: false,
  userCanEditOrg: false,
  ...overrides,
});

describe('useOrgDerived', () => {
  it('defaults to overview tab when no tab in URL', () => {
    const { result } = renderHook(() => useOrgDerived(base()));
    expect(result.current.activeTab).toBe('overview');
  });

  it('reads tab from search params', () => {
    const { result } = renderHook(() => useOrgDerived(base({ location: { search: '?tab=members', pathname: '/o' } })));
    expect(result.current.activeTab).toBe('members');
  });

  it('normalises legacy tab names', () => {
    const { result } = renderHook(() => useOrgDerived(base({ location: { search: '?tab=hierarchy', pathname: '/o' } })));
    expect(result.current.activeTab).toBe('clubs');
  });

  it('falls back to overview for unknown tab', () => {
    const { result } = renderHook(() => useOrgDerived(base({ location: { search: '?tab=nonsense', pathname: '/o' } })));
    expect(result.current.activeTab).toBe('overview');
  });

  it('builds period children map', () => {
    const orgPeriods: Partial<Period>[] = [
      { id: '10', parent_period_id: null },
      { id: '20', parent_period_id: '10' },
      { id: '30', parent_period_id: '10' },
    ];
    const { result } = renderHook(() => useOrgDerived(base({ orgPeriods: orgPeriods as Period[] })));
    expect(result.current.periodChildrenMap.get('10')).toHaveLength(2);
  });

  it('getRecursiveMatchesCount sums across children', () => {
    const orgPeriods: Partial<Period>[] = [
      { id: '10', parent_period_id: null, activities_count: 5 },
      { id: '20', parent_period_id: '10', activities_count: 3 },
    ];
    const { result } = renderHook(() => useOrgDerived(base({ orgPeriods: orgPeriods as Period[] })));
    expect(result.current.getRecursiveMatchesCount({ id: '10', activities_count: 5 })).toBe(8);
  });

  it('makeTabHref produces correct URLs', () => {
    const { result } = renderHook(() => useOrgDerived(base()));
    expect(result.current.makeTabHref('members')).toBe('/org-1?tab=members');
    expect(result.current.makeTabHref('overview')).toBe('/org-1');
  });

  it('returns 5 visible tabs for non-superadmin', () => {
    const { result } = renderHook(() => useOrgDerived(base()));
    expect(result.current.visibleTabs).toHaveLength(5);
  });

  it('computes createModalOrganisations', () => {
    const { result } = renderHook(() => useOrgDerived(base()));
    expect(result.current.createModalOrganisations).toEqual([
      { id: '1', name: 'Test Org', slug: 'test-org' },
    ]);
  });

  it('orgSlugOrId uses org slug', () => {
    const { result } = renderHook(() => useOrgDerived(base({ org: { id: '5', slug: 'my-org', name: 'My' } as any })));
    expect(result.current.orgSlugOrId).toBe('my-org');
  });
});
