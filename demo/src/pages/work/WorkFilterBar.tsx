import type { CSSProperties } from 'react';
import { Button } from '@django-core/design-system';

export type OrganisationOption = { id: string; name: string; slug?: string };

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: string | { id: string };
  parent_id?: string | number | null;
  parent?: string | number | null;
  parent_name?: string | null;
};

type Props = {
  showStatus?: boolean;
  showOrganisation?: boolean;
  showClub?: boolean;
  showTeam?: boolean;

  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];

  statusFilter: string;
  onStatusChange: (value: string) => void;

  selectedOrgId: string;
  onOrganisationChange: (value: string) => void;

  selectedClubId: string;
  onClubChange: (value: string) => void;

  selectedTeamId: string;
  onTeamChange: (value: string) => void;

  onClear: () => void;
};

export default function WorkFilterBar({
  showStatus = true,
  showOrganisation = true,
  showClub = true,
  showTeam = true,
  organisations,
  clubs,
  teams,
  statusFilter,
  onStatusChange,
  selectedOrgId,
  onOrganisationChange,
  selectedClubId,
  onClubChange,
  selectedTeamId,
  onTeamChange,
  onClear,
}: Props) {
  const selectStyle: CSSProperties = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  };

  return (
    <>
      {showStatus && (
        <>
          <label style={{ fontSize: '14px', fontWeight: 500 }}>Status:</label>
          <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} style={selectStyle}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>
      )}

      {showOrganisation && (
        <>
          <label style={{ fontSize: '14px', fontWeight: 500 }}>Organisation:</label>
          <select
            value={selectedOrgId}
            onChange={(e) => onOrganisationChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Organisations</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </>
      )}

      {showClub && (
        <>
          <label style={{ fontSize: '14px', fontWeight: 500 }}>Club:</label>
          <select
            value={selectedClubId}
            onChange={(e) => onClubChange(e.target.value)}
            style={{ ...selectStyle, maxWidth: '150px' }}
          >
            <option value="">All Clubs</option>
            {clubs
              .filter((club) => {
                if (selectedOrgId) {
                  const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
                  return clubOrg === selectedOrgId || String(clubOrg) === selectedOrgId;
                }
                return true;
              })
              .map((club) => (
                <option key={club.id} value={String(club.id)}>
                  {club.name}
                </option>
              ))}
          </select>
        </>
      )}

      {showTeam && (
        <>
          <label style={{ fontSize: '14px', fontWeight: 500 }}>Team:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => onTeamChange(e.target.value)}
            style={{ ...selectStyle, maxWidth: '150px' }}
          >
            <option value="">All Teams</option>
            {teams
              .filter((team) => {
                const selectedClub = selectedClubId
                  ? clubs.find((c) => String(c.id) === String(selectedClubId))
                  : null;

                const teamParentId = (team as any).parent_id ?? (team as any).parent ?? null;
                const teamParentName = (team as any).parent_name ?? null;

                if (selectedClub) {
                  const matchesById = teamParentId !== null && String(teamParentId) === String(selectedClub.id);
                  const matchesByName =
                    teamParentName && selectedClub.name && String(teamParentName) === String(selectedClub.name);

                  if (!matchesById && !matchesByName) return false;
                }

                if (selectedOrgId) {
                  let parentClub: ProjectOption | undefined;

                  if (teamParentId !== null) {
                    parentClub = clubs.find((c) => String(c.id) === String(teamParentId));
                  }
                  if (!parentClub && teamParentName) {
                    parentClub = clubs.find((c) => c.name === teamParentName);
                  }

                  if (!parentClub) return false;

                  const clubOrg =
                    typeof parentClub.organisation === 'string' ? parentClub.organisation : parentClub.organisation?.id;
                  if (!clubOrg) return false;
                  if (String(clubOrg) !== String(selectedOrgId)) return false;
                }

                return true;
              })
              .map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
          </select>
        </>
      )}

      <Button variant="secondary" onClick={onClear} aria-label="Clear filters" title="Clear filters">
        Clear
      </Button>
    </>
  );
}
