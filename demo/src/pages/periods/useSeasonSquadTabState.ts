import { useState, useMemo } from 'react';
import { getUserId, getAccessRoleOptions } from './seasonDetailUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { SquadMember } from './squadTabTypes';

interface UseSeasonSquadTabStateParams {
  members: SquadMember[];
  isTeamRoute: boolean;
}

export function useSeasonSquadTabState({ members, isTeamRoute }: UseSeasonSquadTabStateParams) {
  const [squadSearch, setSquadSearch] = useState('');
  const [selectedSquadMembershipIds, setSelectedSquadMembershipIds] = useState<Set<string>>(new Set());
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<SquadMember | null>(null);
  const [editAccessRole, setEditAccessRole] = useState<'admin' | 'viewer'>('viewer');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const accessRoleOptions = getAccessRoleOptions(isTeamRoute);

  const visibleSquadMembers = useMemo(() => {
    const q = String(squadSearch || '').trim().toLowerCase();
    if (!q) return members;
    return (members || []).filter((m) => {
      const memberUser = m.user || m;
      const name = String(
        memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email ||
          ''
      ).toLowerCase();
      const email = String(memberUser.email || '').toLowerCase();
      const position = String(m?.metadata?.position || '').toLowerCase();
      const shirt = String(m?.metadata?.shirt_number ?? '').toLowerCase();
      const role = String(m?.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || position.includes(q) || shirt.includes(q) || role.includes(q);
    });
  }, [members, squadSearch]);

  const toggleSquadMembership = (membershipId: string) => {
    setSelectedSquadMembershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  const toggleExpandedCard = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const squadUserIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of members || []) {
      const uid = getUserId(m);
      if (uid) set.add(uid);
    }
    return set;
  }, [members]);

  return {
    squadSearch,
    setSquadSearch,
    selectedSquadMembershipIds,
    setSelectedSquadMembershipIds,
    isEditMemberModalOpen,
    setIsEditMemberModalOpen,
    selectedEditMember,
    setSelectedEditMember,
    editAccessRole,
    setEditAccessRole,
    expandedCards,
    isMobile,
    accessRoleOptions,
    visibleSquadMembers,
    toggleSquadMembership,
    toggleExpandedCard,
    squadUserIdSet,
  };
}
