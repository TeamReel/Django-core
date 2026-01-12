import { useEffect, useMemo, useState } from 'react';

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

type PeriodOption = { id: string; name: string; slug?: string; parent_period?: any; parent_period_id?: any };

export interface MatchCreatePayload {
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;

  organisation_id?: string;
  project_id?: string;
  season_id?: string;
  period_id?: string;
}

interface MatchCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
}

export default function MatchCreateModal({
  opened,
  onClose,
  onCreate,
  organisations = [],
  clubs = [],
  teams = [],
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
}: MatchCreateModalProps) {
  const [title, setTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');

  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<PeriodOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setSelectedSeasonId('');
    setSelectedCompetitionId('');
    setSeasonOptions([]);
    setCompetitionOptions([]);
  }, [opened, initialOrganisationId, initialClubId, initialTeamId]);

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
    setSelectedCompetitionId('');

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedSeasonId('');
    setSelectedCompetitionId('');

    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  const combineDateTime = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    // Send as ISO-like string (no timezone). Backend will treat as a datetime.
    return `${date}T${time}:00`;
  };

  const addHoursToIsoLike = (isoLike: string, hours: number): string => {
    const parsed = new Date(isoLike);
    if (Number.isNaN(parsed.getTime())) return isoLike;
    parsed.setHours(parsed.getHours() + hours);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
      parsed.getMinutes()
    )}:${pad(parsed.getSeconds())}`;
  };

  useEffect(() => {
    if (!opened) return;
    if (!selectedOrganisationId || !selectedClubId || !selectedTeamId) {
      setSeasonOptions([]);
      setSelectedSeasonId('');
      setCompetitionOptions([]);
      setSelectedCompetitionId('');
      return;
    }

    const load = async () => {
      setLoadingSeasons(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', 'null');
        params.set('organisation_id', String(selectedOrganisationId));
        params.set('project_id', String(selectedTeamId));

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
        setLoadingSeasons(false);
      }
    };

    load();
  }, [opened, selectedOrganisationId, selectedClubId, selectedTeamId]);

  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId || !selectedOrganisationId || !selectedTeamId) {
      setCompetitionOptions([]);
      setSelectedCompetitionId('');
      return;
    }

    const load = async () => {
      setLoadingCompetitions(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', String(selectedSeasonId));
        params.set('organisation_id', String(selectedOrganisationId));
        params.set('project_id', String(selectedTeamId));

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) {
          setCompetitionOptions([]);
          return;
        }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const list = Array.isArray(results) ? results : [];
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setCompetitionOptions(sorted as any);
      } catch {
        setCompetitionOptions([]);
      } finally {
        setLoadingCompetitions(false);
      }
    };

    load();
  }, [opened, selectedSeasonId, selectedOrganisationId, selectedTeamId]);

  if (!opened) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!selectedOrganisationId) throw new Error('Select a federation first.');
      if (!selectedClubId) throw new Error('Select a club first.');
      if (!selectedTeamId) throw new Error('Select a team first.');
      if (!selectedSeasonId) throw new Error('Select a season first.');
      if (!selectedCompetitionId) throw new Error('Select a competition first.');

      const start = combineDateTime(matchDate, matchTime);
      if (!start) throw new Error('Select a match date and time.');

      // Football match default duration: 2 hours (includes warm-up/overrun)
      const end = addHoursToIsoLike(start, 2);

      await onCreate({
        title,
        start_time: start,
        end_time: end,
        location: location || undefined,
        description: description || undefined,
        organisation_id: selectedOrganisationId,
        project_id: selectedTeamId,
        season_id: selectedSeasonId,
        period_id: selectedCompetitionId,
      });
      setTitle('');
      setMatchDate('');
      setMatchTime('');
      setLocation('');
      setDescription('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setIsSaving(false);
    }
  }

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
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Create Match</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="match-create-org">
              Federation
            </label>
            <select
              id="match-create-org"
              value={selectedOrganisationId}
              onChange={(e) => {
                setSelectedOrganisationId(e.target.value);
                setSelectedClubId('');
                setSelectedTeamId('');
                setSelectedSeasonId('');
                setSelectedCompetitionId('');
              }}
              disabled={isSaving}
              required
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

            <label style={{ fontWeight: 600 }} htmlFor="match-create-club">
              Club
            </label>
            <select
              id="match-create-club"
              value={selectedClubId}
              onChange={(e) => applyClubSelection(e.target.value)}
              disabled={isSaving}
              required
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

            <label style={{ fontWeight: 600 }} htmlFor="match-create-team">
              Team
            </label>
            <select
              id="match-create-team"
              value={selectedTeamId}
              onChange={(e) => applyTeamSelection(e.target.value)}
              disabled={isSaving}
              required
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

            <label style={{ fontWeight: 600 }} htmlFor="match-create-season">
              Season
            </label>
            <select
              id="match-create-season"
              value={selectedSeasonId}
              onChange={(e) => {
                setSelectedSeasonId(e.target.value);
                setSelectedCompetitionId('');
              }}
              disabled={isSaving || loadingSeasons}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">{loadingSeasons ? 'Loading seasons…' : 'Select season…'}</option>
              {seasonOptions.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="match-create-competition">
              Competition
            </label>
            <select
              id="match-create-competition"
              value={selectedCompetitionId}
              onChange={(e) => setSelectedCompetitionId(e.target.value)}
              disabled={isSaving || loadingCompetitions}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">{loadingCompetitions ? 'Loading competitions…' : 'Select competition…'}</option>
              {competitionOptions.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="match-create-title">
              Title
            </label>
            <input
              id="match-create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-date">
              Date
            </label>
            <input
              id="match-create-date"
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              disabled={isSaving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-time">
              Time
            </label>
            <input
              id="match-create-time"
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              disabled={isSaving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-location">
              Location
            </label>
            <input
              id="match-create-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-description">
              Description
            </label>
            <textarea
              id="match-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                resize: 'vertical',
              }}
            />
          </div>

          {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
