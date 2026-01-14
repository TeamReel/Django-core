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
  const extractList = (raw: any): any[] => {
    const list = raw?.data?.data || raw?.data?.results || raw?.results || raw?.data || raw;
    return Array.isArray(list) ? list : [];
  };

  const getNextUrl = (raw: any): string => {
    const next = raw?.data?.next ?? raw?.next;
    return typeof next === 'string' ? next : '';
  };

  const fetchAllPages = async (url: string, opts: RequestInit, maxItems = 1000): Promise<any[]> => {
    const all: any[] = [];
    let nextUrl = url;
    const seen = new Set<string>();

    while (nextUrl && all.length < maxItems && !seen.has(nextUrl)) {
      seen.add(nextUrl);
      const res = await fetch(nextUrl, opts);
      if (!res.ok) break;
      const raw = await res.json().catch(() => null);
      const pageItems = extractList(raw);
      all.push(...pageItems);
      nextUrl = getNextUrl(raw);
    }

    return all.slice(0, maxItems);
  };

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [position, setPosition] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');

  const [remoteOrganisations, setRemoteOrganisations] = useState<OrgOption[]>([]);
  const [remoteClubs, setRemoteClubs] = useState<ProjectOption[]>([]);
  const [remoteTeams, setRemoteTeams] = useState<ProjectOption[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organisationsOptions = useMemo(() => {
    return remoteOrganisations.length ? remoteOrganisations : organisations;
  }, [remoteOrganisations, organisations]);

  const selectedOrganisationSlug = useMemo(() => {
    const orgId = String(selectedOrganisationId || '').trim();
    if (!orgId) return '';
    const org = organisationsOptions.find((o) => String(o.id) === String(orgId));
    return String(org?.slug || '').trim();
  }, [organisationsOptions, selectedOrganisationId]);

  const clubsOptions = useMemo(() => {
    return remoteClubs.length ? remoteClubs : clubs;
  }, [remoteClubs, clubs]);

  const teamsOptions = useMemo(() => {
    return remoteTeams.length ? remoteTeams : teams;
  }, [remoteTeams, teams]);

  const sortedOrganisations = useMemo(() => {
    return [...organisationsOptions].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [organisationsOptions]);

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubsOptions.find((c) => String(c.id) === String(clubId));
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
      ? clubsOptions.filter((c) => {
          const cOrg = typeof (c as any).organisation === 'string' ? (c as any).organisation : (c as any).organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubsOptions;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubsOptions, selectedOrganisationId]);

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teamsOptions.filter((t) => getTeamParentId(t) === String(clubId)) : teamsOptions;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teamsOptions, selectedClubId]);

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

    const team = teamsOptions.find((t) => String(t.id) === String(teamId));
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

    setRemoteOrganisations([]);
    setRemoteClubs([]);
    setRemoteTeams([]);

    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));

    setUserSearch('');
    setUserOptions([]);
    setSelectedUserId('');
    setPosition('');
    setShirtNumber('');
  }, [opened, initialOrganisationId, initialClubId, initialTeamId]);

  // Load federations so the user can switch context.
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const load = async () => {
      setLoadingOrganisations(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=500`, { credentials: 'include' });
        if (!res.ok) return;
        const raw = await res.json().catch(() => null);
        const list = extractList(raw)
          .map((o: any) => ({ id: String(o.id), name: String(o.name || o.slug || o.id), slug: o.slug }))
          .filter((o: any) => o.id);
        const unique = [...new Map(list.map((o: any) => [String(o.id), o])).values()];
        if (!cancelled) setRemoteOrganisations(unique);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOrganisations(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [opened, apiBaseUrl]);

  // Load clubs (root projects).
  // - If federation selected: only clubs in that federation.
  // - If no federation: all clubs (across federations).
  useEffect(() => {
    if (!opened) return;
    const orgId = String(selectedOrganisationId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();

    let cancelled = false;
    const abortController = new AbortController();
    const load = async () => {
      setLoadingClubs(true);
      try {
        // Nested organisations/{org_slug}/projects uses slug, not UUID.
        // If federation selected but slug not resolved yet, wait.
        if (orgId && !orgSlug) {
          if (!cancelled) setRemoteClubs([]);
          return;
        }

        const baseUrl = orgId
          ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=200&parent_project__isnull=true`
          : `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`;

        const rawList = await fetchAllPages(
          baseUrl,
          { credentials: 'include', signal: abortController.signal },
          1000
        );

        const list = rawList.map((p: any) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteClubs(unique as any);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingClubs(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, apiBaseUrl, selectedOrganisationId, selectedOrganisationSlug]);

  // Load teams (child projects).
  // - If club selected: only teams in that club.
  // - Else if federation selected: teams in that federation.
  // - Else: all teams.
  useEffect(() => {
    if (!opened) return;
    const clubId = String(selectedClubId || '').trim();
    const orgId = String(selectedOrganisationId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();

    let cancelled = false;
    const abortController = new AbortController();
    const load = async () => {
      setLoadingTeams(true);
      try {
        // If federation selected but slug not resolved yet, wait.
        if (!clubId && orgId && !orgSlug) {
          if (!cancelled) setRemoteTeams([]);
          return;
        }

        const baseUrl = clubId
          ? `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(clubId)}&page_size=200`
          : orgId
            ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=200&parent_project__isnull=false`
            : `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`;
        const rawList = await fetchAllPages(
          baseUrl,
          { credentials: 'include', signal: abortController.signal },
          1000
        );
        const list = rawList.map((p: any) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteTeams(unique as any);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, apiBaseUrl, selectedClubId, selectedOrganisationId, selectedOrganisationSlug]);

  // Load user options based on the selected scope:
  // - Team selected: show users that can be added to this team for this season (searchable-users)
  // - Club selected: show members of this club
  // - Federation selected: show members of this federation
  useEffect(() => {
    if (!opened) return;

    const teamId = String(selectedTeamId || '').trim();
    const clubId = String(selectedClubId || '').trim();
    const orgId = String(selectedOrganisationId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();
    const season = String(seasonId || '').trim();

    // No scope selected yet.
    if (!teamId && !clubId && !orgId) {
      setUserOptions([]);
      setSelectedUserId('');
      return;
    }

    // If only federation is selected, wait until we can resolve a usable slug.
    if (!teamId && !clubId && orgId && !orgSlug) {
      setUserOptions([]);
      setSelectedUserId('');
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    const normalizeUser = (u: any): UserOption | null => {
      if (!u) return null;
      const id = (u as any).id;
      if (id == null) return null;
      const first = String((u as any).first_name || '').trim();
      const last = String((u as any).last_name || '').trim();
      const fullName = String((u as any).full_name || (first || last ? `${first} ${last}`.trim() : '')).trim();
      return {
        id,
        email: (u as any).email,
        first_name: (u as any).first_name,
        last_name: (u as any).last_name,
        full_name: fullName,
        name: (u as any).name,
      };
    };

    const load = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        let usersRaw: any[] = [];

        if (teamId) {
          if (!season) throw new Error('Missing season context');
          const params = new URLSearchParams();
          params.set('period', season);
          params.set('page_size', '500');
          const res = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamId)}/members/searchable-users/?${params.toString()}`,
            { credentials: 'include', signal: abortController.signal }
          );
          if (!res.ok) throw new Error('Failed to load users');
          const raw: any = await res.json().catch(() => null);
          usersRaw = extractList(raw);
        } else if (clubId) {
          const params = new URLSearchParams();
          params.set('page_size', '500');
          const res = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubId)}/members/?${params.toString()}`,
            { credentials: 'include', signal: abortController.signal }
          );
          if (!res.ok) throw new Error('Failed to load club members');
          const raw: any = await res.json().catch(() => null);
          const memberships = extractList(raw);
          usersRaw = memberships.map((m: any) => m?.user).filter(Boolean);
        } else {
          const params = new URLSearchParams();
          params.set('page_size', '500');
          params.set('include_project_memberships', 'true');
          const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${params.toString()}`,
            { credentials: 'include', signal: abortController.signal }
          );
          if (!res.ok) throw new Error('Failed to load federation members');
          const raw: any = await res.json().catch(() => null);
          const memberships = extractList(raw);
          usersRaw = memberships.map((m: any) => m?.user).filter(Boolean);
        }

        const normalized = usersRaw.map(normalizeUser).filter(Boolean) as UserOption[];
        const unique = [...new Map(normalized.map((u) => [String(u.id), u])).values()];

        if (!cancelled) {
          setUserOptions(unique);

          const selected = String(selectedUserId || '').trim();
          if (selected && !unique.some((u) => String(u.id) === selected)) {
            setSelectedUserId('');
          }
        }
      } catch (e: any) {
        if (!cancelled && e?.name !== 'AbortError') {
          setUserOptions([]);
          setError(e instanceof Error ? e.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, selectedTeamId, selectedClubId, selectedOrganisationId, selectedOrganisationSlug, seasonId, apiBaseUrl, selectedUserId]);

  const filteredUserOptions = useMemo(() => {
    const q = String(userSearch || '').trim().toLowerCase();
    if (!q) return userOptions;
    return userOptions.filter((u: any) => {
      const name =
        String(u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [userOptions, userSearch]);

  const missingTeam = !String(selectedTeamId || '').trim();
  const missingUser = !String(selectedUserId || '').trim();
  const canSubmit = !missingTeam && !missingUser && !saving;

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
              disabled={saving || loadingOrganisations}
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
              disabled={saving || loadingClubs}
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
              disabled={saving || loadingTeams}
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
              disabled={saving || (!selectedOrganisationId && !selectedClubId && !selectedTeamId)}
              placeholder="Filter users (optional)…"
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
              disabled={saving || loadingUsers || (!selectedOrganisationId && !selectedClubId && !selectedTeamId)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">
                {loadingUsers
                  ? 'Loading users…'
                  : !selectedOrganisationId && !selectedClubId && !selectedTeamId
                    ? 'Select a federation first…'
                    : filteredUserOptions.length
                      ? 'Select user…'
                      : userOptions.length
                        ? 'No match for filter…'
                        : 'No users found…'}
              </option>
              {filteredUserOptions.map((u) => {
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

          {!canSubmit && !saving && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--app-text-muted, #6b7280)' }}>
              {missingTeam && missingUser
                ? 'Select a team and a user to enable “Add to squad”.'
                : missingTeam
                  ? 'Select a team to enable “Add to squad”.'
                  : missingUser
                    ? 'Select a user to enable “Add to squad”.'
                    : null}
            </div>
          )}

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
