import { useMemo } from 'react';
import type { Organisation, Period, User, Project } from '../../types';
import {
  getBestMatchDetailPath as getBestMatchDetailPathPure,
  ORG_TABS,
  ALLOWED_TABS,
  LEGACY_TAB_MAP,
} from './orgDataHelpers';
import { isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseOrgDerivedParams {
  location: any;
  org: Organisation | null;
  resolvedOrg: any;
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  orgPeriods: Period[];
  members: User[];
  teams: Project[];
  clubs: Project[];
  allClubsForTeams: Project[];
  isSuperAdmin: boolean;
  userCanEditOrg: boolean;
}

// ─── Hook: all derived/memo values ───────────────────────────────────────────

export function useOrgDerived(params: UseOrgDerivedParams) {
  const {
    location, org, resolvedOrg, currentOrgSlug, currentOrgId,
    orgPeriods, members, teams, clubs, allClubsForTeams,
    isSuperAdmin, userCanEditOrg,
  } = params;

  const periodChildrenMap = useMemo(() => {
    const map = new Map<string, Period[]>();
    for (const p of orgPeriods) {
      const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
      if (parentId) {
        const key = String(parentId);
        const arr = map.get(key) || [];
        arr.push(p);
        map.set(key, arr);
      }
    }
    return map;
  }, [orgPeriods]);

  const getRecursiveMatchesCount = (p: any): number => {
    let count = p.activities_count ?? 0;
    const children = periodChildrenMap.get(String(p.id));
    if (children) {
      for (const child of children) count += getRecursiveMatchesCount(child);
    }
    return count;
  };

  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
    if (!raw) return 'overview';
    // Normalize legacy tab names to compact set
    const normalized = LEGACY_TAB_MAP[raw] || raw;
    return ALLOWED_TABS.has(normalized) ? normalized : 'overview';
  }, [location.search]);

  const createModalOrganisations = useMemo(() => {
    const orgIdStr = String(currentOrgId || org?.id || '').trim();
    const orgName = String(org?.name || resolvedOrg?.name || '').trim();
    if (!orgIdStr || !orgName) return [];
    return [{ id: orgIdStr, name: orgName, slug: currentOrgSlug }];
  }, [currentOrgId, org?.id, org?.name, resolvedOrg?.name, currentOrgSlug]);

  const createModalClubs = useMemo(() => {
    const list = allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return (list || []) as Project[];
  }, [allClubsForTeams, clubs]);

  const membershipUserCounts = useMemo(() => {
    const clubUserIdsByClubId = new Map<string, Set<string>>();
    const teamUserIdsByTeamId = new Map<string, Set<string>>();
    const teamToClubId = new Map<string, string>();
    for (const t of teams) {
      const teamId = String(t?.id ?? '').trim();
      if (!teamId) continue;
      const clubId = String(t?.parent_id ?? t?.parent ?? t?.parent_project ?? t?.parent_project_id ?? '').trim();
      if (clubId) teamToClubId.set(teamId, clubId);
    }
    const getOrCreateSet = (map: Map<string, Set<string>>, key: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const next = new Set<string>();
      map.set(key, next);
      return next;
    };
    for (const item of members as any[]) {
      const u = item?.user ?? item;
      const userId = String(u?.id ?? '').trim();
      if (!userId) continue;
      const raw = item?.project_memberships ?? item?.project_membership_details ?? item?.project_memberships_details ?? [];
      const pms = Array.isArray(raw) ? raw : [];
      for (const pm of pms) {
        if (!pm) continue;
        const pmId = String(pm?.id ?? '');
        if (pmId.startsWith('pm:')) continue;
        const teamId = String(pm?.project_id ?? pm?.project?.id ?? '').trim();
        let clubId = String(
          pm?.club_id ?? pm?.club?.id ?? pm?.project?.parent_id ?? pm?.project?.parent?.id ??
          pm?.project?.parent_project_id ?? pm?.parent_project_id ??
          (typeof pm?.parent_project === 'object' ? pm?.parent_project?.id : pm?.parent_project) ??
          pm?.parent_id ?? (typeof pm?.parent === 'object' ? pm?.parent?.id : pm?.parent) ?? '',
        ).trim();
        if (!clubId && teamId) clubId = String(teamToClubId.get(teamId) || '').trim();
        if (clubId) getOrCreateSet(clubUserIdsByClubId, clubId).add(userId);
        if (teamId) getOrCreateSet(teamUserIdsByTeamId, teamId).add(userId);
      }
    }
    const clubUsersCountById: Record<string, number> = {};
    for (const [cId, userIds] of clubUserIdsByClubId.entries()) clubUsersCountById[String(cId)] = userIds.size;
    const teamUsersCountById: Record<string, number> = {};
    for (const [tId, userIds] of teamUserIdsByTeamId.entries()) teamUsersCountById[String(tId)] = userIds.size;
    return { clubUsersCountById, teamUsersCountById };
  }, [members, teams]);

  const tabs = ORG_TABS;

  const visibleTabs = useMemo(() => {
    return tabs.filter((t) => {
      if (t.id === 'operations') return isSuperAdmin;
      if (t.id === 'audit' || t.id === 'governance') return Boolean(isSuperAdmin || userCanEditOrg);
      return true;
    });
  }, [tabs, isSuperAdmin, userCanEditOrg]);

  const orgIdForDirectoryLists = useMemo(() => {
    return String(currentOrgId || org?.id || '').trim();
  }, [currentOrgId, org?.id]);

  const makeTabHref = (tabId: string): string => {
    const p = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    if (!t || t === 'overview') p.delete('tab');
    else p.set('tab', t);
    const qs = p.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  const orgSlugOrId = String(org?.slug || org?.id || currentOrgSlug || '');

  const getBestMatchDetailPath = (m: any): string =>
    getBestMatchDetailPathPure(m, { currentOrgSlug, clubs, teams, orgPeriods });

  const clubsForHierarchy = useMemo(() => {
    const list = allClubsForTeams && allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return Array.isArray(list) ? list : [];
  }, [allClubsForTeams, clubs]);

  return {
    periodChildrenMap, getRecursiveMatchesCount,
    activeTab, createModalOrganisations, createModalClubs,
    membershipUserCounts, tabs, visibleTabs,
    orgIdForDirectoryLists, makeTabHref, orgSlugOrId,
    getBestMatchDetailPath, clubsForHierarchy,
  };
}
