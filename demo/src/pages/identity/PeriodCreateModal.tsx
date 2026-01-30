import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { useSports } from '../../hooks/useSports';

type OrgOption = { id: string; name: string; slug?: string };
type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: any;
  parent_id?: any;
  parent_project_id?: any;
  parent_project?: any;
};

type PeriodOption = { id: string; name: string; slug?: string; project?: any; parent_period?: any; parent_period_id?: any };

export interface PeriodCreatePayload {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;

  organisation_id?: string;
  project_id?: string;
  parent_period_id?: string;
  sport_id?: string;
}

interface PeriodCreateModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  onCreate: (payload: PeriodCreatePayload) => Promise<void>;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  requireOrganisation?: boolean;
  requireClub?: boolean;
  requireTeam?: boolean;
  requireSeason?: boolean;
  showSportVariant?: boolean;

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
}

export default function PeriodCreateModal({
  opened,
  onClose,
  title,
  onCreate,
  organisations = [],
  clubs = [],
  teams = [],
  requireOrganisation = false,
  requireClub = false,
  requireTeam = false,
  requireSeason = false,
  showSportVariant = false,
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
    const org = typeof (club as any).organisation === 'string' ? (club as any).organisation : (club as any).organisation?.id;
    return org ? String(org) : null;
  };

  const getTeamParentId = (t: ProjectOption): string | null => {
    const parent =
      (t as any)?.parent_id ??
      (t as any)?.parent ??
      (t as any)?.parent_project_id ??
      (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project);
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
        const apiBaseUrl = getApiBaseUrl();
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

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) {
          setSeasonOptions([]);
          return;
        }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const roots = (Array.isArray(results) ? results : []).filter(
          (p: any) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted as any);
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
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  if (!opened) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: saving ? 'not-allowed' : 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            {hasOrgSelect && (
              <>
                <label style={{ fontWeight: 600 }} htmlFor="period-create-org">
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
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
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
                <label style={{ fontWeight: 600 }} htmlFor="period-create-club">
                  Club
                </label>
                <select
                  id="period-create-club"
                  value={selectedClubId}
                  onChange={(e) => applyClubSelection(e.target.value)}
                  disabled={saving}
                  required={requireClub}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
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
                <label style={{ fontWeight: 600 }} htmlFor="period-create-team">
                  Team
                </label>
                <select
                  id="period-create-team"
                  value={selectedTeamId}
                  onChange={(e) => applyTeamSelection(e.target.value)}
                  disabled={saving}
                  required={requireTeam}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
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
                <label style={{ fontWeight: 600 }} htmlFor="period-create-season">
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
                      const season = seasonOptions.find((s: any) => String(s?.id) === String(seasonId)) as any;
                      const inferredTeamId = season?.project?.id ?? season?.project_id;
                      if (inferredTeamId != null) autoFillFromTeamId(String(inferredTeamId));
                    }
                  }}
                  disabled={saving || seasonsLoading}
                  required
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
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

            <label style={{ fontWeight: 600 }} htmlFor="period-create-name">
              Name
            </label>
            <input
              id="period-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="period-create-start">
              Start Date
            </label>
            <input
              id="period-create-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={saving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="period-create-end">
              End Date
            </label>
            <input
              id="period-create-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={saving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="period-create-description">
              Description
            </label>
            <textarea
              id="period-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={saving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                resize: 'vertical',
              }}
            />

            {showSportVariant && (
              <>
                <label style={{ fontWeight: 600 }} htmlFor="period-create-sport">
                  Sport Variant
                </label>
                <select
                  id="period-create-sport"
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  disabled={saving || sportsLoading}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
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

          {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
