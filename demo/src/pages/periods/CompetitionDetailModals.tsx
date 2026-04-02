/**
 * CompetitionDetailModals — Modal orchestrator for ProjectCompetitionDetailPage.
 * Extracts all modal rendering to a dedicated component to keep the page lean.
 */
import React from 'react';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchEditModal from '../identity/MatchEditModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import AddMemberModal from '../identity/AddMemberModal';
import { CompetitionMembershipDetailModal as MembershipDetailModal } from './CompetitionMembershipDetailModal';
import { MemberRoleEditModal } from '@/components/MemberRoleEditModal';
import type { UseCompetitionDetailDataReturn } from './useCompetitionDetailData';

interface CompetitionDetailModalsProps {
  d: UseCompetitionDetailDataReturn;
}

export function CompetitionDetailModals({ d }: CompetitionDetailModalsProps) {
  return (
    <>
      <PeriodEditModal
        opened={d.isPeriodEditModalOpen}
        onClose={() => d.setIsPeriodEditModalOpen(false)}
        period={d.selectedEditPeriod as import('../identity/PeriodEditModal').PeriodLike | null}
        showDates={false}
        organisationSportId={d.org?.sport?.id ? String(d.org.sport.id) : null}
        onSave={async (patch) => { if (d.selectedEditPeriod) await d.savePeriodEdits(d.selectedEditPeriod, patch); }}
      />
      <PeriodDetailModal opened={d.isPeriodDetailModalOpen} onClose={() => d.setIsPeriodDetailModalOpen(false)} period={d.selectedDetailPeriod} />
      <MatchEditModal
        opened={d.isMatchEditModalOpen}
        onClose={() => d.setIsMatchEditModalOpen(false)}
        match={d.selectedEditMatch as Parameters<typeof MatchEditModal>[0]['match']}
        mode={d.isTeamRoute ? 'team-context' : 'default'}
        onSave={async (patch) => { if (d.selectedEditMatch) await d.saveMatchEdits(d.selectedEditMatch, patch); }}
      />
      <MatchDetailModal
        opened={d.isMatchDetailModalOpen}
        onClose={() => { d.setIsMatchDetailModalOpen(false); d.setSelectedDetailMatch(null); }}
        match={d.selectedDetailMatch as Parameters<typeof MatchDetailModal>[0]['match']}
      />
      <MatchCreateModal
        opened={d.isMatchCreateModalOpen}
        onClose={() => d.setIsMatchCreateModalOpen(false)}
        mode={d.isTeamRoute ? 'team-context' : 'default'}
        apiBaseUrl={d.apiBaseUrl}
        initialIds={{
          organisationId: String(d.org?.id || ''),
          clubId: String(d.club?.id || ''),
          teamId: String(d.project?.id || ''),
          seasonId: String(d.resolvedSeasonId || d.season?.id || ''),
          competitionId: String(d.resolvedCompetitionId || d.competition?.id || ''),
        }}
        onCreate={async (payload) => { await d.createMatchInCompetition(payload); }}
      />
      <MembershipDetailModal
        opened={d.isMembershipDetailModalOpen}
        onClose={() => { d.setIsMembershipDetailModalOpen(false); d.setSelectedMembershipDetail(null); }}
        membership={d.selectedMembershipDetail}
      />
      <MemberRoleEditModal
        opened={d.isMembershipEditModalOpen}
        onClose={() => { d.setIsMembershipEditModalOpen(false); d.setSelectedMembershipEdit(null); }}
        member={d.selectedMembershipEdit}
        onSave={async ({ role, functional_roles }) => {
          if (!d.selectedMembershipEdit) return;
          await d.saveMembershipRole(d.selectedMembershipEdit, role);
          await d.updateFunctionalRoles(d.selectedMembershipEdit, functional_roles);
          const mid = String(d.selectedMembershipEdit?.id || '').trim();
          d.setMembers((prev) => prev.map((m) => String(m.id) === mid ? { ...m, functional_roles } : m));
        }}
      />
      <AddMemberModal
        isOpen={d.isAddMemberOpen}
        onClose={() => d.setIsAddMemberOpen(false)}
        onSuccess={() => { d.setIsAddMemberOpen(false); d.refreshMembers(); }}
        contextLevel={d.isTeamRoute ? 'team' : 'club'}
        orgSlug={d.orgSlugOrId}
        clubProjectId={d.isTeamRoute ? (d.club?.id || d.clubSlugOrId) : (d.project?.id || d.projectSlugOrId)}
        teamProjectId={d.isTeamRoute ? (d.project?.id || d.projectSlugOrId) : undefined}
      />
    </>
  );
}
