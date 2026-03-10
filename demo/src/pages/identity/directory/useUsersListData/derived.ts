/**
 * Derived values for useUsersListData hook
 */
import { useMemo, useCallback, useEffect } from 'react';
import type { User, ProjectOption } from '../usersListTypes';

export interface UserRow extends User {
  user?: User;
  project_memberships?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface LookupMaps {
  clubsById: Map<string, ProjectOption>;
  teamsById: Map<string, ProjectOption>;
  teamIdsByClubId: Map<string, string[]>;
}

export function useUsersListDerived(
  users: UserRow[],
  clubs: ProjectOption[],
  teams: ProjectOption[],
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
) {
  // ── Sorted users ─────────────────────────────────────────
  const sortedUsers = useMemo(() => {
    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };
    const getUserLabel = (u: UserRow) => {
      const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      return label || u.email || '';
    };
    const list = [...users];
    list.sort((a: UserRow, b: UserRow) => {
      const byLabel = sortKey(getUserLabel(a)).localeCompare(sortKey(getUserLabel(b)));
      if (byLabel !== 0) return byLabel;
      return sortKey(a?.email).localeCompare(sortKey(b?.email));
    });
    return list;
  }, [users]);

  // ── Batch selection helpers ──────────────────────────────
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map((u: UserRow) => String(u.id))));
    }
  }, [selectedIds, sortedUsers, setSelectedIds]);

  const handleSelectOne = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }, [selectedIds, setSelectedIds]);

  const allSelected =
    sortedUsers.length > 0 && sortedUsers.every((u: UserRow) => selectedIds.has(String(u.id)));
  const someSelected = selectedIds.size > 0;

  // Reset selection when users change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [users, setSelectedIds]);

  const getSelectedUsers = useCallback(() =>
    sortedUsers.filter((u: UserRow) => selectedIds.has(String(u.id))),
  [sortedUsers, selectedIds]);

  // ── Lookup maps ──────────────────────────────────────────
  const clubsById = useMemo(() => {
    const map = new Map<string, ProjectOption>();
    for (const c of clubs) map.set(String(c.id), c);
    return map;
  }, [clubs]);

  const teamsById = useMemo(() => {
    const map = new Map<string, ProjectOption>();
    for (const t of teams) map.set(String(t.id), t);
    return map;
  }, [teams]);

  const teamIdsByClubId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of teams) {
      const teamId = String(t?.id ?? '').trim();
      if (!teamId) continue;
      const clubId = String(
        t?.parent_id ??
        (t as any)?.parent_project?.id ??
        (t as any)?.parent_project_id ?? '',
      ).trim();
      if (!clubId) continue;
      const existing = map.get(clubId);
      if (existing) {
        if (!existing.includes(teamId)) existing.push(teamId);
      } else {
        map.set(clubId, [teamId]);
      }
    }
    return map;
  }, [teams]);

  return {
    sortedUsers,
    handleSelectAll,
    handleSelectOne,
    allSelected,
    someSelected,
    getSelectedUsers,
    clubsById,
    teamsById,
    teamIdsByClubId,
  };
}
