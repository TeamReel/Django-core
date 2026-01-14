import { useEffect, useMemo, useState } from 'react';

import { fetchAllPages } from '../../utils/fetchAllPages';

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

  venue?: 'Home' | 'Away';

  opponent_project_id?: string;

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
  initialSeasonId?: string;
  initialCompetitionId?: string;
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
  initialSeasonId = '',
  initialCompetitionId = '',
}: MatchCreateModalProps) {
  const [title, setTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');

  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<PeriodOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [opponentTeams, setOpponentTeams] = useState<ProjectOption[]>([]);
  const [loadingOpponentTeams, setLoadingOpponentTeams] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setSelectedOpponentTeamId('');
    setVenue('Home');
    setSelectedSeasonId(String(initialSeasonId || ''));
    setSelectedCompetitionId(String(initialCompetitionId || ''));
    setSeasonOptions([]);
    setCompetitionOptions([]);
    setOpponentTeams([]);
  }, [opened, initialOrganisationId, initialClubId, initialTeamId, initialSeasonId, initialCompetitionId]);

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

  const getProjectOrganisationId = (p: ProjectOption): string | null => {
    const org = typeof (p as any).organisation === 'string' ? (p as any).organisation : (p as any).organisation?.id;
    return org ? String(org) : null;
  };

  const opponentTeamOptions = useMemo(() => {
    const orgId = String(selectedOrganisationId || '').trim();
    const list = (opponentTeams || []).filter((t) => {
      const tOrg = getProjectOrganisationId(t);
      if (orgId && tOrg && String(tOrg) !== String(orgId)) return false;
      if (selectedTeamId && String(t.id) === String(selectedTeamId)) return false;
      return true;
    });
    const unique = [...new Map(list.map((t) => [String(t.id), t])).values()];
    return unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [opponentTeams, selectedOrganisationId, selectedTeamId]);

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedOpponentTeamId('');
    setSelectedSeasonId('');
    setSelectedCompetitionId('');

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedOpponentTeamId((prev) => (prev && String(prev) === String(teamId) ? '' : prev));
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

  const projectNameById = (id: string): string | null => {
    if (!id) return null;
    const fromTeams = (teams || []).find((t) => String(t.id) === String(id));
    if (fromTeams?.name) return String(fromTeams.name);
    const fromOpponents = (opponentTeams || []).find((t) => String(t.id) === String(id));
    if (fromOpponents?.name) return String(fromOpponents.name);
    return null;
  };

  useEffect(() => {
    if (!opened) return;
    const orgId = String(selectedOrganisationId || '').trim();
    if (!orgId) {
      setOpponentTeams([]);
      return;
    }

    const load = async () => {
      setLoadingOpponentTeams(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', orgId);
        params.set('parent_project__isnull', 'false');

        const results = await fetchAllPages<ProjectOption>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 10_000, cacheKey: `projects:teams:org:${orgId}`, maxItems: 3000 }
        );
        setOpponentTeams(Array.isArray(results) ? results : []);
      } catch {
        setOpponentTeams([]);
      } finally {
        setLoadingOpponentTeams(false);
      }
    };

    load();
  }, [opened, selectedOrganisationId]);

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
      if (!selectedOpponentTeamId) throw new Error('Select an opponent first.');
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

        venue,
        organisation_id: selectedOrganisationId,
        project_id: selectedTeamId,
        opponent_project_id: selectedOpponentTeamId,
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
            <label style={{ fontWeight: 600 }} htmlFor="match-create-venue">
              Venue
            </label>
            <select
              id="match-create-venue"
              value={venue}
              onChange={(e) => {
                const next = (e.target.value === 'Away' ? 'Away' : 'Home') as 'Home' | 'Away';
                setVenue(next);

                // Friendly default: if title is empty and opponent selected, build a sensible match title.
                if (!title.trim() && selectedTeamId && selectedOpponentTeamId) {
                  const home = projectNameById(String(selectedTeamId)) || 'Team';
                  const away = projectNameById(String(selectedOpponentTeamId)) || 'Opponent';
                  setTitle(next === 'Home' ? `${home} vs ${away}` : `${home} @ ${away}`);
                }
              }}
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>

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
                setSelectedOpponentTeamId('');
                setSelectedSeasonId('');
                setSelectedCompetitionId('');
                setOpponentTeams([]);
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

            <label style={{ fontWeight: 600 }} htmlFor="match-create-opponent">
              Opponent
            </label>
            <select
              id="match-create-opponent"
              value={selectedOpponentTeamId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedOpponentTeamId(nextId);

                if (!title.trim() && selectedTeamId && nextId) {
                  const home = projectNameById(String(selectedTeamId)) || 'Home';
                  const away = projectNameById(String(nextId)) || 'Opponent';
                  setTitle(venue === 'Home' ? `${home} vs ${away}` : `${home} @ ${away}`);
                }
              }}
              disabled={isSaving || loadingOpponentTeams || !selectedOrganisationId}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">{loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
              {opponentTeamOptions.map((t) => (
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
