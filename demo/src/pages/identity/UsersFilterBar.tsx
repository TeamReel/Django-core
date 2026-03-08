/**
 * UsersFilterBar — filter selects for UsersPage (status, role, org, club, team).
 */
import React from 'react';
import { Button } from '@django-core/design-system';
import type { ProjectOption } from './useUsersData';

interface UsersFilterBarProps {
  isSuperAdmin: boolean;
  orgIdParam: string | null | undefined;
  context: any;
  navigate: (to: string) => void;
  canManageUsers: boolean;
  // Filters
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  availableRoles: string[];
  selectedOrgId: string;
  setSelectedOrgId: (v: string) => void;
  selectedClubId: string;
  setSelectedClubId: (v: string) => void;
  setSelectedClubKey: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  setSelectedTeamKey: (v: string) => void;
  organisations: { id: string | number; name: string }[];
  myOrganisations: { id: string | number; name: string }[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  resetPageToFirst: () => void;
  setIsAddMemberOpen: (v: boolean) => void;
}

export const UsersFilterBar: React.FC<UsersFilterBarProps> = ({
  isSuperAdmin,
  orgIdParam,
  context,
  navigate,
  canManageUsers,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
  availableRoles,
  selectedOrgId,
  setSelectedOrgId,
  selectedClubId,
  setSelectedClubId,
  setSelectedClubKey,
  selectedTeamId,
  setSelectedTeamId,
  setSelectedTeamKey,
  organisations,
  myOrganisations,
  clubs,
  teams,
  resetPageToFirst,
  setIsAddMemberOpen,
}) => (
  <div className="flex-row gap-10 flex-wrap">
    {orgIdParam && (
      <Button variant="secondary" onClick={() => navigate(`/organisations/${orgIdParam}`)}>
        Back to Organisation
      </Button>
    )}

    {(!orgIdParam || isSuperAdmin) && (
      <>
        <label className="fs-14 fw-500">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPageToFirst(); }}
          className="p-8 rounded-4" style={{ border: '1px solid var(--app-border)' }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label className="fs-14 fw-500">Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); resetPageToFirst(); }}
          className="p-8 rounded-4" style={{ border: '1px solid var(--app-border)' }}
        >
          <option value="">All Roles</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        <label className="fs-14 fw-500">Organisation:</label>
        <select
          value={selectedOrgId}
          onChange={(e) => {
            setSelectedOrgId(e.target.value);
            setSelectedClubId(''); setSelectedClubKey('');
            setSelectedTeamId(''); setSelectedTeamKey('');
            resetPageToFirst();
          }}
          className="p-8 rounded-4" style={{ border: '1px solid var(--app-border)' }}
        >
          <option value="">All Organisations</option>
          {(isSuperAdmin ? organisations : myOrganisations).map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>

        <label className="fs-14 fw-500">Club:</label>
        <select
          value={selectedClubId}
          onChange={(e) => {
            const clubId = e.target.value;
            const selectedClub = clubs.find(c => String(c.id) === clubId);
            const clubKey = String(selectedClub?.slug || selectedClub?.id || clubId);
            setSelectedClubId(clubId);
            setSelectedClubKey(clubKey);
            setSelectedTeamId(''); setSelectedTeamKey('');
            resetPageToFirst();
          }}
          className="p-8 rounded-4" style={{ border: '1px solid var(--app-border)', maxWidth: '150px' }}
        >
          <option value="">All Clubs</option>
          {clubs
            .filter(club => {
              if (selectedOrgId) {
                const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
                return clubOrg === selectedOrgId || String(clubOrg) === selectedOrgId;
              }
              return true;
            })
            .map(club => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
        </select>

        <label className="fs-14 fw-500">Team:</label>
        <select
          value={selectedTeamId}
          onChange={(e) => {
            const teamId = e.target.value;
            const selectedTeam = teams.find(t => String(t.id) === teamId);
            const teamKey = String(selectedTeam?.slug || selectedTeam?.id || teamId);
            setSelectedTeamId(teamId);
            setSelectedTeamKey(teamKey);
            resetPageToFirst();
          }}
          className="p-8 rounded-4" style={{ border: '1px solid var(--app-border)', maxWidth: '150px' }}
        >
          <option value="">All Teams</option>
          {teams
            .filter(team => {
              const selectedClub = selectedClubId ? clubs.find(c => String(c.id) === String(selectedClubId)) : null;
              const teamParentId = (team as any).parent_id ?? (team as any).parent ?? null;
              const teamParentName = (team as any).parent_name ?? null;

              if (selectedClub) {
                const matchesById = teamParentId !== null && String(teamParentId) === String(selectedClub.id);
                const matchesByName = teamParentName && selectedClub.name && String(teamParentName) === String(selectedClub.name);
                if (!matchesById && !matchesByName) return false;
              }

              if (selectedOrgId) {
                let parentClub = teamParentId !== null ? clubs.find(c => String(c.id) === String(teamParentId)) : undefined;
                if (!parentClub && teamParentName) parentClub = clubs.find(c => c.name === teamParentName);
                if (!parentClub) return false;
                const clubOrg = typeof parentClub.organisation === 'string' ? parentClub.organisation : parentClub.organisation?.id;
                if (!clubOrg || String(clubOrg) !== String(selectedOrgId)) return false;
              }
              return true;
            })
            .map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
        </select>

        <Button
          variant="secondary"
          onClick={() => {
            setStatusFilter('active'); setRoleFilter('');
            if (isSuperAdmin) setSelectedOrgId('');
            setSelectedClubId(''); setSelectedClubKey('');
            setSelectedTeamId(''); setSelectedTeamKey('');
            resetPageToFirst();
          }}
          aria-label="Clear filters" title="Clear filters"
        >
          <span aria-hidden="true">✕</span>
        </Button>
      </>
    )}

    {isSuperAdmin && (
      <Button onClick={() => setIsAddMemberOpen(true)}>Add Member</Button>
    )}

    {(orgIdParam || context.organisation) && !isSuperAdmin && canManageUsers && (
      <Button onClick={() => setIsAddMemberOpen(true)}>Add Member</Button>
    )}
  </div>
);
