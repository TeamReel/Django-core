import { useMemo, useState, useRef, useEffect } from 'react';
import {
  type MemberRecord,
  getMemberName,
  getFunctionalRoles,
  getRoleLabel,
} from './teamSelectieHelpers';

export function useTeamSelectieData(members: MemberRecord[]) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<MemberRecord | null>(null);
  const expandRef = useRef<HTMLDivElement | null>(null);

  const q = search.trim().toLowerCase();

  /* ── Collect all unique roles for filter chips ── */
  const allRoles = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      getFunctionalRoles(m).forEach((r) => set.add(r.toLowerCase()));
    });
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === 'coach') return -1;
      if (b === 'coach') return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [members]);

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let list = members;

    if (activeRoleFilter) {
      list = list.filter((m) => {
        const roles = getFunctionalRoles(m);
        return roles.some((r) => r.toLowerCase() === activeRoleFilter);
      });
    }

    if (q) {
      list = list.filter((m) => {
        const name = getMemberName(m).toLowerCase();
        const roles = getFunctionalRoles(m).map((r) => getRoleLabel(r).toLowerCase()).join(' ');
        return name.includes(q) || roles.includes(q);
      });
    }

    return list;
  }, [members, q, activeRoleFilter]);

  /* ── Group by first letter ── */
  const letterGroups = useMemo(() => {
    const groups: { letter: string; members: MemberRecord[] }[] = [];
    const map = new Map<string, MemberRecord[]>();
    for (const m of filtered) {
      const name = getMemberName(m);
      const letter = (name[0] || '?').toUpperCase();
      const normalLetter = /[A-Z]/.test(letter) ? letter : '#';
      if (!map.has(normalLetter)) map.set(normalLetter, []);
      map.get(normalLetter)!.push(m);
    }
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    for (const letter of sortedKeys) {
      groups.push({ letter, members: map.get(letter)! });
    }
    return groups;
  }, [filtered]);

  // Scroll expanded panel into view
  useEffect(() => {
    if (expandedId && expandRef.current) {
      const timeout = setTimeout(() => {
        expandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [expandedId]);

  return {
    search,
    setSearch,
    expandedId,
    setExpandedId,
    activeRoleFilter,
    setActiveRoleFilter,
    editMember,
    setEditMember,
    expandRef,
    allRoles,
    filtered,
    letterGroups,
  };
}
