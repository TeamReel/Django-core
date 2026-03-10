import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { useSports } from '../../hooks/useSports';
import type {
  OrgOption,
  ProjectOption,
  PeriodOption,
  PeriodCreateModalProps,
} from './PeriodCreateModal.types';
import styles from './PeriodCreateModal.module.css';

// Re-export for backward compatibility
export type { PeriodCreatePayload } from './PeriodCreateModal.types';

export default function PeriodCreateModal({
  opened,
  onClose,
  title,
  onCreate,
  organisations = [],
  clubs = [],
  teams = [],
  requirements: {
    requireOrganisation = false,
    requireClub = false,
    requireTeam = false,
    requireSeason = false,
    showSportVariant = false,
  } = {},
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
  initialSeasonId = '',
}: PeriodCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSportId, setSelectedSportId] = useState('');

  const { variants, loading: sportsLoading } = useSports();

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');

  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  const hasOrgSelect = organisations.length > 0;
  const hasClubSelect = clubs.length > 0;
  const hasTeamSelect = teams.length > 0;

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setSelectedSeasonId(String(initialSeasonId || ''));
  }, [opened, initialOrganisationId, initialClubId, initialTeamId, initialSeasonId]);

  const sortedOrganisations = useMemo(() => {
    return [...organisations].sort((a, b) => a.name.localeCompare(b.name));
  }, [organisations]);

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubs.filter((c) => {
          const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubs;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubs, selectedOrganisationId]);

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubs.find((c) => String(c.id) === String(clubId));
    if (!club) return null;
    const org = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
    return org ? String(org) : null;
  };

  const getTeamParentId = (t: ProjectOption): string | null => {
    const parent =
      t?.parent_id ??
      t?.parent ??
      t?.parent_project_id ??
      (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teams.filter((t) => getTeamParentId(t) === String(clubId)) : teams;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teams, selectedClubId]);

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedSeasonId('');

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedSeasonId('');

    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  const autoFillFromTeamId = (teamId: string) => {
    if (!teamId) return;
    setSelectedTeamId(String(teamId));

    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  useEffect(() => {
    if (!opened || !requireSeason) return;

    const load = async () => {
      setSeasonsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', 'null');

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length === 0) {
            setSeasonOptions([]);
            return;
          }
          params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
        } else if (selectedOrganisationId) {
          params.set('organisation_id', String(selectedOrganisationId));
        }

        const data = await api.get<any>(`/periods/?${params.toString()}`);
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const roots = (Array.isArray(results) ? results : []).filter(
          (p: Record<string, unknown>) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p: Record<string, unknown>) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted as PeriodOption[]);
      } catch {
        setSeasonOptions([]);
      } finally {
        setSeasonsLoading(false);
      }
    };

    load();
  }, [opened, requireSeason, selectedOrganisationId, selectedClubId, selectedTeamId, teams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (requireOrganisation && !selectedOrganisationId) {
        throw new Error('Select a federation first.');
      }
      if (requireClub && !selectedClubId) {
        throw new Error('Select a club first.');
      }
      if (requireTeam && !selectedTeamId) {
        throw new Error('Select a team first.');
      }
      if (requireSeason && !selectedSeasonId) {
        throw new Error('Select a season first.');
      }

      await onCreate({
        name,
        description: description || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        organisation_id: selectedOrganisationId || undefined,
        project_id: selectedTeamId || undefined,
        parent_period_id: selectedSeasonId || undefined,
        sport_id: showSportVariant && selectedSportId ? selectedSportId : undefined,
      });
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setSelectedSportId('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  if (!opened) return null;

  return (
    <div
      className={`flex-center ${styles.overlay}`}
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        className={`p-24 rounded-8 text-primary border bg-surface ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className={`mb-12 text-primary ${styles.title}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`rounded-4 border bg-surface-2 text-primary ${styles.closeButton}`}
            data-saving={saving || undefined}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`grid ${styles.formGrid}`}>
            {hasOrgSelect && (
              <>
                <label className="fw-600" htmlFor="period-create-org">
                  Federation
                </label>
                <select
                  id="period-create-org"
                  value={selectedOrganisationId}
                  onChange={(e) => {
                    setSelectedOrganisationId(e.target.value);
                    setSelectedClubId('');
                    setSelectedTeamId('');
                    setSelectedSeasonId('');
                  }}
                  disabled={saving}
                  required={requireOrganisation}
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
                >
                  <option value="">Select federation…</option>
                  {sortedOrganisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {hasClubSelect && (
              <>
                <label className="fw-600" htmlFor="period-create-club">
                  Club
                </label>
                <select
                  id="period-create-club"
                  value={selectedClubId}
                  onChange={(e) => applyClubSelection(e.target.value)}
                  disabled={saving}
                  required={requireClub}
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
                >
                  <option value="">Select club…</option>
                  {filteredClubs.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {hasTeamSelect && (
              <>
                <label className="fw-600" htmlFor="period-create-team">
                  Team
                </label>
                <select
                  id="period-create-team"
                  value={selectedTeamId}
                  onChange={(e) => applyTeamSelection(e.target.value)}
                  disabled={saving}
                  required={requireTeam}
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
                >
                  <option value="">Select team…</option>
                  {filteredTeams.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {requireSeason && (
              <>
                <label className="fw-600" htmlFor="period-create-season">
                  Season
                </label>
                <select
                  id="period-create-season"
                  value={selectedSeasonId}
                  onChange={(e) => {
                    const seasonId = e.target.value;
                    setSelectedSeasonId(seasonId);

                    // If user picks a season before picking a team, infer team/club/federation.
                    if (!selectedTeamId && seasonId) {
                      const season = seasonOptions.find((s) => String(s?.id) === String(seasonId));
                      const inferredTeamId = season?.project?.id ?? season?.project_id;
                      if (inferredTeamId != null) autoFillFromTeamId(String(inferredTeamId));
                    }
                  }}
                  disabled={saving || seasonsLoading}
                  required
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
                >
                  <option value="">{seasonsLoading ? 'Loading seasons…' : 'Select season…'}</option>
                  {seasonOptions.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="fw-600" htmlFor="period-create-name">
              Name
            </label>
            <input
              id="period-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
            />

            <label className="fw-600" htmlFor="period-create-start">
              Start Date
            </label>
            <input
              id="period-create-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={saving}
              required
              className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
            />

            <label className="fw-600" htmlFor="period-create-end">
              End Date
            </label>
            <input
              id="period-create-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={saving}
              required
              className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
            />

            <label className="fw-600" htmlFor="period-create-description">
              Description
            </label>
            <textarea
              id="period-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={saving}
              className={`rounded-6 border bg-surface-2 text-primary ${styles.textarea}`}
            />

            {showSportVariant && (
              <>
                <label className="fw-600" htmlFor="period-create-sport">
                  Sport Variant
                </label>
                <select
                  id="period-create-sport"
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  disabled={saving || sportsLoading}
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
                >
                  <option value="">— Select sport variant —</option>
                  {variants.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.sport_icon} {sport.name} {sport.category_name ? `(${sport.category_name})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {error && <div className="mt-12 text-danger">{error}</div>}

          <div className={`mt-16 gap-10 ${styles.actions}`}>
            <button
              type="submit"
              disabled={saving}
              className={`py-8 px-12 rounded-6 fw-600 ${styles.submitButton}`}
              data-saving={saving || undefined}
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
