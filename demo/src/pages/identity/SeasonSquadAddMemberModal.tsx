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

type UserOption = {
  id: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
};

export interface SeasonSquadAddMemberPayload {
  organisation_id?: string;
  club_id?: string;
  project_id: string;
  user_id: string;
  position?: string;
  shirt_number?: string;
}

interface SeasonSquadAddMemberModalProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (payload: SeasonSquadAddMemberPayload) => Promise<void>;

  apiBaseUrl: string;
  seasonId: string;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
}

export default function SeasonSquadAddMemberModal({
  opened,
  onClose,
  onAdd,
  apiBaseUrl,
  seasonId,
  organisations = [],
  clubs = [],
  teams = [],
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
}: SeasonSquadAddMemberModalProps) {
  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [position, setPosition] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedOrganisations = useMemo(() => {
    return [...organisations].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [organisations]);

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
    return String(typeof parent === 'object' ? (parent as any).id : parent);
  };

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubs.filter((c) => {
          const cOrg = typeof (c as any).organisation === 'string' ? (c as any).organisation : (c as any).organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubs;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubs, selectedOrganisationId]);

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teams.filter((t) => getTeamParentId(t) === String(clubId)) : teams;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teams, selectedClubId]);

  const applyOrganisationSelection = (orgId: string) => {
    setSelectedOrganisationId(orgId);
    setSelectedClubId('');
    setSelectedTeamId('');
    setSelectedUserId('');
    setUserOptions([]);
  };

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedUserId('');
    setUserOptions([]);

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUserId('');
    setUserOptions([]);

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
    if (!opened) return;
    setError(null);
    setSaving(false);
    setLoadingUsers(false);

    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));

    setUserSearch('');
    setUserOptions([]);
    setSelectedUserId('');
    setPosition('');
    setShirtNumber('');
  }, [opened, initialOrganisationId, initialClubId, initialTeamId]);

  useEffect(() => {
    if (!opened) return;
    const q = String(userSearch || '').trim();
    const teamId = String(selectedTeamId || '').trim();
    const season = String(seasonId || '').trim();

    if (!teamId || !season || q.length < 2) {
      setUserOptions([]);
      setSelectedUserId('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('search', q);
        params.set('period', season);

        const res = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamId)}/members/searchable-users/?${params.toString()}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('Failed to load users');
        const raw: any = await res.json();
        const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const unique = [...new Map((list as any[]).map((u) => [String(u.id), u])).values()];
        if (!cancelled) setUserOptions(unique as any);
      } catch (e) {
        if (!cancelled) {
          setUserOptions([]);
          setError(e instanceof Error ? e.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [opened, userSearch, selectedTeamId, seasonId, apiBaseUrl]);

  const canSubmit = Boolean(String(selectedTeamId || '').trim()) && Boolean(String(selectedUserId || '').trim()) && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const teamId = String(selectedTeamId || '').trim();
      const userId = String(selectedUserId || '').trim();
      if (!teamId) throw new Error('Select a team first.');
      if (!userId) throw new Error('Select a user first.');

      await onAdd({
        organisation_id: String(selectedOrganisationId || '').trim() || undefined,
        club_id: String(selectedClubId || '').trim() || undefined,
        project_id: teamId,
        user_id: userId,
        position: String(position || '').trim() || undefined,
        shirt_number: String(shirtNumber || '').trim() || undefined,
      });

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add user');
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
          width: '720px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Add User to Squad</h2>
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
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px 16px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="squad-add-org">
              Federation
            </label>
            <select
              id="squad-add-org"
              value={selectedOrganisationId}
              onChange={(e) => applyOrganisationSelection(e.target.value)}
              disabled={saving || sortedOrganisations.length <= 1}
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

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-club">
              Club
            </label>
            <select
              id="squad-add-club"
              value={selectedClubId}
              onChange={(e) => applyClubSelection(e.target.value)}
              disabled={saving || filteredClubs.length <= 1}
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

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-team">
              Team
            </label>
            <select
              id="squad-add-team"
              value={selectedTeamId}
              onChange={(e) => applyTeamSelection(e.target.value)}
              disabled={saving || filteredTeams.length <= 1}
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

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-search">
              Search user
            </label>
            <input
              id="squad-add-search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              disabled={saving || !selectedTeamId}
              placeholder="Type at least 2 characters…"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-user">
              User
            </label>
            <select
              id="squad-add-user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={saving || loadingUsers || userOptions.length === 0}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">
                {loadingUsers ? 'Loading users…' : userOptions.length ? 'Select user…' : 'Search for a user…'}
              </option>
              {userOptions.map((u) => {
                const name =
                  u.full_name ||
                  u.name ||
                  `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                  u.email ||
                  String(u.id);
                const label = u.email ? `${name} (${u.email})` : name;
                return (
                  <option key={String(u.id)} value={String(u.id)}>
                    {label}
                  </option>
                );
              })}
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-position">
              Position (optional)
            </label>
            <input
              id="squad-add-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={saving}
              placeholder="e.g. Keeper"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="squad-add-shirt">
              Shirt # (optional)
            </label>
            <input
              id="squad-add-shirt"
              value={shirtNumber}
              onChange={(e) => setShirtNumber(e.target.value)}
              disabled={saving}
              placeholder="10"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />
          </div>

          {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: !canSubmit ? 0.7 : 1,
              }}
            >
              {saving ? 'Adding…' : 'Add to squad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
