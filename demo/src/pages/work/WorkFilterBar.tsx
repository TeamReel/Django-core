import { Button } from '@django-core/design-system';
import styles from './WorkFilterBar.module.css';

export type OrganisationOption = {
  id: string;
  name: string;
  slug?: string;
  sport?: {
    id: string;
    name: string;
    slug?: string;
    sport_icon?: string;
  } | null;
  sport_variants_count?: number;
};

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: string | { id: string; name?: string; slug?: string; sport?: { id: string | number; name?: string; sport_icon?: string } | null };
  organisation_id?: string | number;
  parent_id?: string | number | null;
  parent?: string | number | null;
  parent_name?: string | null;
  parent_project_id?: string | number | null;
  parent_project?: string | number | { id: string; name?: string; slug?: string } | null;
  is_active?: boolean;
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
  return (
    <>
      {showStatus && (
        <>
          <label className={styles.label}>Status:</label>
          <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={styles.select}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>
      )}

      {showOrganisation && (
        <>
          <label className={styles.label}>Organisation:</label>
          <select
            value={selectedOrgId}
            onChange={(e) => onOrganisationChange(e.target.value)}
            className={styles.select}
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
          <label className={styles.label}>Club:</label>
          <select
            value={selectedClubId}
            onChange={(e) => onClubChange(e.target.value)}
            className={styles.selectNarrow}
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
          <label className={styles.label}>Team:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => onTeamChange(e.target.value)}
            className={styles.selectNarrow}
          >
            <option value="">All Teams</option>
            {teams
              .filter((team) => {
                const selectedClub = selectedClubId
                  ? clubs.find((c) => String(c.id) === String(selectedClubId))
                  : null;

                const teamParentId = team.parent_id ?? team.parent ?? null;
                const teamParentName = team.parent_name ?? null;

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
