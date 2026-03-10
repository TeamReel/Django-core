import React from 'react';
import { Search, Users, ChevronRight, UserCog } from 'lucide-react';
import { MemberEditSheet } from './MemberEditSheet';
import { useTeamSelectieData } from './useTeamSelectieData';
import { MemberCard } from './MemberCard';
import { type MemberRecord, getRoleLabel, getRoleColor } from './teamSelectieHelpers';
import st from './TeamSelectieTab.module.css';

interface TeamSelectieTabProps {
  members: MemberRecord[];
  membersLoading: boolean;
  /** If provided, long-press or desktop click navigates here (admin feature) */
  memberDetailHref?: (membership: MemberRecord) => string;
  /** Show admin link at bottom */
  showAdminLink?: boolean;
  onAdminLinkClick?: () => void;
  /** Required for edit functionality */
  apiBaseUrl?: string;
  teamId?: string;
  /**
   * Edit mode for member editing:
   * - 'all'  = Team Admin: can edit any member
   * - 'own'  = Team Member: can edit only own profile
   * - 'none' = Team Editor / no edit access
   */
  editMode?: 'all' | 'own' | 'none';
  /** Current user ID (needed for 'own' edit mode) */
  currentUserId?: string;
  /** Callback to refresh member data after edits */
  onRefresh?: () => void;
}

export function TeamSelectieTab({
  members,
  membersLoading,
  memberDetailHref,
  showAdminLink,
  onAdminLinkClick,
  apiBaseUrl,
  teamId,
  editMode = 'none',
  currentUserId,
  onRefresh,
}: TeamSelectieTabProps) {
  const {
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
  } = useTeamSelectieData(members);

  return (
    <div className={st.root}>
      {/* ── Search bar ── */}
      <div className={st.searchRow}>
        <div className={st.searchInputWrap}>
          <Search size={16} className={st.searchIcon} />
          <input
            className={st.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of rol…"
          />
        </div>
        <div className={st.countBadge}>
          <Users size={14} />
          <span>{filtered.length}</span>
        </div>
      </div>

      {/* ── Role filter chips ── */}
      {allRoles.length > 1 && (
        <div className={st.roleFilters}>
          <button
            type="button"
            className={`${st.roleChip} ${!activeRoleFilter ? st.roleChipActive : ''}`}
            onClick={() => setActiveRoleFilter(null)}
          >
            Alles
          </button>
          {allRoles.map((role) => (
            <button
              key={role}
              type="button"
              className={`${st.roleChip} ${activeRoleFilter === role ? st.roleChipActive : ''}`}
              style={activeRoleFilter === role ? { background: getRoleColor(role), borderColor: getRoleColor(role) } : undefined}
              onClick={() => setActiveRoleFilter(activeRoleFilter === role ? null : role)}
            >
              {getRoleLabel(role)}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {membersLoading && members.length === 0 && (
        <div className={st.loading}>
          <div className={st.loadingDot} />
          <div className={st.loadingDot} />
          <div className={st.loadingDot} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!membersLoading && members.length === 0 && (
        <div className={st.emptyState}>
          <Users size={40} className={st.emptyIcon} />
          <p className={st.emptyTitle}>Nog geen leden</p>
          <p className={st.emptyDesc}>Voeg spelers en stafleden toe via het ledenbeheer.</p>
        </div>
      )}

      {/* ── No results for search ── */}
      {!membersLoading && members.length > 0 && filtered.length === 0 && (
        <div className={st.emptyState}>
          <Search size={32} className={st.emptyIcon} />
          <p className={st.emptyTitle}>Geen resultaten</p>
          <p className={st.emptyDesc}>Probeer een andere zoekterm of filter.</p>
        </div>
      )}

      {/* ── Member list with letter groups ── */}
      {filtered.length > 0 && letterGroups.map(({ letter, members: groupMembers }) => (
        <div key={letter} className={st.letterGroup}>
          <div className={st.letterHeader}>
            <span className={st.letterBadge}>{letter}</span>
            <div className={st.letterLine} />
          </div>

          {groupMembers.map((m) => {
            const mid = String(m?.id || m?.user?.id || '').trim();
            const memberUserId = String(m?.user?.id || '').trim();
            const canEdit =
              (editMode === 'all' ||
                (editMode === 'own' && !!currentUserId && memberUserId === currentUserId)) &&
              !!apiBaseUrl &&
              !!teamId;

            return (
              <MemberCard
                key={mid}
                member={m}
                isExpanded={expandedId === mid}
                onToggleExpand={() => setExpandedId(expandedId === mid ? null : mid)}
                canEdit={canEdit}
                onEdit={() => setEditMember(m)}
                memberDetailHref={memberDetailHref?.(m)}
                expandRef={expandedId === mid ? expandRef : undefined}
              />
            );
          })}
        </div>
      ))}

      {/* ── Admin link ── */}
      {showAdminLink && onAdminLinkClick && (
        <button type="button" className={st.adminLink} onClick={onAdminLinkClick}>
          <UserCog size={16} />
          Volledig ledenbeheer
          <ChevronRight size={14} />
        </button>
      )}

      {/* ── Member edit sheet ── */}
      {editMode !== 'none' && apiBaseUrl && teamId && (
        <MemberEditSheet
          opened={!!editMember}
          onClose={() => setEditMember(null)}
          membership={editMember}
          apiBaseUrl={apiBaseUrl}
          teamId={teamId}
          onSaved={onRefresh}
          canChangeAccessRole={editMode === 'all'}
        />
      )}
    </div>
  );
}
