import React from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { normalizeAccessRole } from './seasonDetailUtils';
import { MemberRoleEditModal } from '@/components/MemberRoleEditModal';
import type { FunctionalRoleOption } from '@/components/MemberRoleEditModal';
import { projectsApi } from '@/api';
import EligibleMembersCard from './EligibleMembersCard';
import SquadMemberTable from './SquadMemberTable';
import SquadMemberMobileList from './SquadMemberMobileList';
import { useSeasonSquadTabState } from './useSeasonSquadTabState';
import type { SquadMember, SeasonSquadTabProps } from './squadTabTypes';
import st from './SeasonSquadTab.module.css';

export type { SquadMember, SeasonSquadTabProps } from './squadTabTypes';

const SEASON_SQUAD_ROLES: FunctionalRoleOption[] = [
  { value: 'goalkeeper', label: 'Goalkeeper' },
  { value: 'player', label: 'Player' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistant' },
];

const SeasonSquadTab: React.FC<SeasonSquadTabProps> = ({
  members,
  membersLoading,
  membersError,
  userCanEditProject,
  bulkSubmitting,
  isTeamRoute,
  apiBaseUrl,
  projectId,
  memberDetailHref,
  unassignMembershipsFromSeasonSquad,
  setIsAddSquadMemberModalOpen,
  onMemberUpdated,
  teamRosterData: {
    teamRoster,
    teamRosterLoading,
    teamRosterError,
    assignUsersToSeasonSquad,
    getBestRoleForUser,
    getFunctionalRolesForUser,
  } = {},
}) => {
  const {
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
  } = useSeasonSquadTabState({ members, isTeamRoute });

  const handleEditMember = (m: SquadMember) => {
    setSelectedEditMember(m);
    setEditAccessRole(normalizeAccessRole(m.role || 'viewer') === 'admin' ? 'admin' : 'viewer');
    setIsEditMemberModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <div className={st.cardHeader}>
            <div className={st.cardHeaderRow}>
              <h3 className={st.cardTitle}>Selectie</h3>
              <Badge variant="default">{members.length} In selectie</Badge>
            </div>
            <div className={st.cardSubtitle}>
              Spelers en staf toegewezen aan dit seizoen.
            </div>
          </div>

          <div className={st.cardBody}>
            {membersLoading && <Alert variant="info">Loading squad…</Alert>}
            {membersError && <Alert variant="error">{membersError}</Alert>}

            {userCanEditProject && (
              <div className={st.toolbarRow}>
                <div className={st.toolbarGroup}>
                  <Input
                    value={squadSearch}
                    onChange={(e) => setSquadSearch(e.target.value)}
                    placeholder="Search squad"
                    className={st.searchInput}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const allIds = (members || [])
                        .map((m) => String(m?.id || '').trim())
                        .filter(Boolean);
                      const allSelected =
                        allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                      setSelectedSquadMembershipIds(allSelected ? new Set() : new Set(allIds));
                    }}
                    disabled={bulkSubmitting || (members || []).length === 0}
                  >
                    {(() => {
                      const allIds = (members || [])
                        .map((m) => String(m?.id || '').trim())
                        .filter(Boolean);
                      const allSelected =
                        allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                      return allSelected ? 'Unselect all' : 'Select all';
                    })()}
                  </Button>
                </div>
                <div className={st.toolbarGroup}>
                  <button
                    type="button"
                    className="app-action-button cta-btn cta-btn-neutral"
                    onClick={() => setIsAddSquadMemberModalOpen(true)}
                  >
                    Add User (advanced)
                  </button>
                  <button
                    type="button"
                    className="app-action-button cta-btn cta-btn-danger"
                    disabled={bulkSubmitting || selectedSquadMembershipIds.size === 0}
                    onClick={async () => {
                      const ids = Array.from(selectedSquadMembershipIds.values()).filter(Boolean);
                      await unassignMembershipsFromSeasonSquad(ids);
                      setSelectedSquadMembershipIds((prev) => {
                        const next = new Set(prev);
                        for (const id of ids) next.delete(id);
                        return next;
                      });
                    }}
                    title="Unassign selected users from the squad"
                  >
                    Unassign ({selectedSquadMembershipIds.size})
                  </button>
                </div>
              </div>
            )}

            {userCanEditProject ? (
              <>
                {!membersLoading && !membersError && members.length === 0 ? (
                  <Alert variant="info">Geen leden in de selectie. Voeg team members toe via de sectie hieronder.</Alert>
                ) : !membersLoading && !membersError ? (
                  <>
                    {!isMobile && (
                      <SquadMemberTable
                        members={visibleSquadMembers}
                        memberDetailHref={memberDetailHref}
                        isTeamRoute={isTeamRoute}
                        readOnly={false}
                        selectedSquadMembershipIds={selectedSquadMembershipIds}
                        bulkSubmitting={bulkSubmitting}
                        toggleSquadMembership={toggleSquadMembership}
                        onEditMember={handleEditMember}
                        unassignMembershipsFromSeasonSquad={unassignMembershipsFromSeasonSquad}
                      />
                    )}
                    {isMobile && (
                      <SquadMemberMobileList
                        members={visibleSquadMembers}
                        memberDetailHref={memberDetailHref}
                        isTeamRoute={isTeamRoute}
                        readOnly={false}
                        expandedCards={expandedCards}
                        toggleExpandedCard={toggleExpandedCard}
                        selectedSquadMembershipIds={selectedSquadMembershipIds}
                        bulkSubmitting={bulkSubmitting}
                        toggleSquadMembership={toggleSquadMembership}
                        onEditMember={handleEditMember}
                        unassignMembershipsFromSeasonSquad={unassignMembershipsFromSeasonSquad}
                      />
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {!membersLoading && !membersError && members.length === 0 ? (
                  <Alert variant="info">No members found for this season.</Alert>
                ) : !membersLoading && !membersError ? (
                  <>
                    {!isMobile && (
                      <SquadMemberTable
                        members={members}
                        memberDetailHref={memberDetailHref}
                        isTeamRoute={isTeamRoute}
                        readOnly
                      />
                    )}
                    {isMobile && (
                      <SquadMemberMobileList
                        members={members}
                        memberDetailHref={memberDetailHref}
                        isTeamRoute={isTeamRoute}
                        readOnly
                        expandedCards={expandedCards}
                        toggleExpandedCard={toggleExpandedCard}
                      />
                    )}
                  </>
                ) : null}
              </>
            )}
          </div>
        </Card>

        {/* ── Niet in selectie (from team roster) ── */}
        {teamRoster && assignUsersToSeasonSquad && (
          <EligibleMembersCard
            teamRoster={teamRoster}
            teamRosterLoading={teamRosterLoading}
            teamRosterError={teamRosterError}
            squadUserIdSet={squadUserIdSet}
            userCanEditProject={userCanEditProject}
            bulkSubmitting={bulkSubmitting}
            isTeamRoute={isTeamRoute}
            isMobile={isMobile}
            assignUsersToSeasonSquad={assignUsersToSeasonSquad}
            getBestRoleForUser={getBestRoleForUser}
            getFunctionalRolesForUser={getFunctionalRolesForUser}
          />
        )}
      </div>

      {/* Edit Member Modal — co-located with squad tab */}
      <MemberRoleEditModal
        opened={!!selectedEditMember}
        onClose={() => { setIsEditMemberModalOpen(false); setSelectedEditMember(null); }}
        member={selectedEditMember}
        functionalRoleOptions={SEASON_SQUAD_ROLES}
        onSave={async ({ role, functional_roles }) => {
          const membershipId = String(selectedEditMember?.id || '').trim();
          if (!membershipId || !projectId) return;
          await projectsApi.updateMember(projectId, membershipId, {
            role,
            metadata: {
              ...(selectedEditMember?.metadata || {}),
              functional_roles,
            },
          } as Record<string, unknown>);
          onMemberUpdated(membershipId, role, functional_roles);
          setSelectedEditMember(null);
        }}
      />
    </div>
  );
};

export default SeasonSquadTab;
