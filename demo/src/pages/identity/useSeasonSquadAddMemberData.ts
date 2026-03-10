import React, { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { logger } from '@/utils/logger';
import type {
  OrgOption,
  ProjectOption,
  UserOption,
  SeasonSquadAddMemberModalProps,
} from './seasonSquadAddMember.types';
import { api } from '../../api';

type HookProps = Omit<SeasonSquadAddMemberModalProps, 'onClose'>;

/* ── API helpers ── */

/** Minimal shape for user data from the API */
interface RawUserRecord {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  name?: string;
}

const normalizeUser = (u: RawUserRecord): UserOption | null => {
  if (!u) return null;
  const id = u.id;
  if (id == null) return null;
  const first = String(u.first_name || '').trim();
  const last = String(u.last_name || '').trim();
  const fullName = String(u.full_name || (first || last ? `${first} ${last}`.trim() : '')).trim();
  return { id, email: u.email, first_name: u.first_name, last_name: u.last_name, full_name: fullName, name: u.name };
};

/* ── Hook ── */

export interface UseSeasonSquadAddMemberDataReturn {
  // Dropdowns
  sortedOrganisations: OrgOption[];
  filteredClubs: ProjectOption[];
  filteredTeams: ProjectOption[];
  filteredUserOptions: UserOption[];
  // State
  selectedOrganisationId: string;
  selectedClubId: string;
  selectedTeamId: string;
  userSearch: string;
  selectedUserId: string;
  position: string;
  shirtNumber: string;
  loadingOrganisations: boolean;
  loadingClubs: boolean;
  loadingTeams: boolean;
  loadingUsers: boolean;
  saving: boolean;
  error: string | null;
  missingTeam: boolean;
  missingUser: boolean;
  canSubmit: boolean;
  // Setters
  setUserSearch: Dispatch<SetStateAction<string>>;
  setSelectedUserId: Dispatch<SetStateAction<string>>;
  setPosition: Dispatch<SetStateAction<string>>;
  setShirtNumber: Dispatch<SetStateAction<string>>;
  // Actions
  applyOrganisationSelection: (orgId: string) => void;
  applyClubSelection: (clubId: string) => void;
  applyTeamSelection: (teamId: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useSeasonSquadAddMemberData({
  opened, onAdd, apiBaseUrl, seasonId,
  organisations = [], clubs = [], teams = [],
  initialOrganisationId = '', initialClubId = '', initialTeamId = '',
}: HookProps): UseSeasonSquadAddMemberDataReturn {
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

  // ── Derived option lists ──

  const organisationsOptions = useMemo(
    () => (remoteOrganisations.length ? remoteOrganisations : organisations),
    [remoteOrganisations, organisations],
  );
  const selectedOrganisationSlug = useMemo(() => {
    const orgId = String(selectedOrganisationId || '').trim();
    if (!orgId) return '';
    const org = organisationsOptions.find((o) => String(o.id) === String(orgId));
    return String(org?.slug || '').trim();
  }, [organisationsOptions, selectedOrganisationId]);

  const clubsOptions = useMemo(() => (remoteClubs.length ? remoteClubs : clubs), [remoteClubs, clubs]);
  const teamsOptions = useMemo(() => (remoteTeams.length ? remoteTeams : teams), [remoteTeams, teams]);
  const sortedOrganisations = useMemo(
    () => [...organisationsOptions].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [organisationsOptions],
  );

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubsOptions.find((c) => String(c.id) === String(clubId));
    if (!club) return null;
    const org = typeof club.organisation === 'string' || typeof club.organisation === 'number' ? club.organisation : club.organisation?.id;
    return org ? String(org) : null;
  };

  const getTeamParentId = (t: ProjectOption): string | null => {
    const parent = t.parent_id ?? (t as any).parent ?? t.parent_project_id
      ?? (typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubsOptions.filter((c) => {
          const cOrg = typeof c.organisation === 'string' || typeof c.organisation === 'number' ? c.organisation : c.organisation?.id;
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

  // ── Cascade helpers ──

  const applyOrganisationSelection = (orgId: string) => {
    setSelectedOrganisationId(orgId);
    setSelectedClubId(''); setSelectedTeamId(''); setSelectedUserId(''); setUserOptions([]);
  };

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId(''); setSelectedUserId(''); setUserOptions([]);
    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUserId(''); setUserOptions([]);
    const team = teamsOptions.find((t) => String(t.id) === String(teamId));
    if (!team) return;
    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  // ── Effects ──

  useEffect(() => {
    if (!opened) return;
    setError(null); setSaving(false); setLoadingUsers(false);
    setRemoteOrganisations([]); setRemoteClubs([]); setRemoteTeams([]);
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setUserSearch(''); setUserOptions([]); setSelectedUserId('');
    setPosition(''); setShirtNumber('');
  }, [opened, initialOrganisationId, initialClubId, initialTeamId]);

  // Fetch federations
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const load = async () => {
      setLoadingOrganisations(true);
      try {
        const data = await api.list<{ id?: string; name?: string; slug?: string }>('/organisations/', { pageSize: 500 });
        const list = data.results
          .map((o) => ({ id: String(o.id), name: String(o.name || o.slug || o.id), slug: o.slug }))
          .filter((o) => o.id);
        const unique = [...new Map(list.map((o) => [String(o.id), o])).values()];
        if (!cancelled) setRemoteOrganisations(unique);
      } catch { /* ignore */ } finally { if (!cancelled) setLoadingOrganisations(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [opened, apiBaseUrl]);

  // Fetch clubs
  useEffect(() => {
    if (!opened) return;
    const orgId = String(selectedOrganisationId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();
    let cancelled = false;
    const abortController = new AbortController();
    const load = async () => {
      setLoadingClubs(true);
      try {
        if (orgId && !orgSlug) { if (!cancelled) setRemoteClubs([]); return; }
        const path = orgId
          ? `/organisations/${encodeURIComponent(orgSlug)}/projects/`
          : '/projects/';
        const rawList = await api.listAll<any>(path, { pageSize: 200, params: { parent_project__isnull: true }, maxItems: 1000, signal: abortController.signal });
        const list = rawList.map((p: ProjectOption) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteClubs(unique);
      } catch { /* ignore */ } finally { if (!cancelled) setLoadingClubs(false); }
    };
    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, apiBaseUrl, selectedOrganisationId, selectedOrganisationSlug]);

  // Fetch teams
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
        if (!clubId && orgId && !orgSlug) { if (!cancelled) setRemoteTeams([]); return; }
        const path = clubId
          ? '/projects/'
          : orgId
            ? `/organisations/${encodeURIComponent(orgSlug)}/projects/`
            : '/projects/';
        const params: Record<string, string | number | boolean | undefined> = clubId
          ? { parent_project: clubId }
          : { parent_project__isnull: false };
        const rawList = await api.listAll<any>(path, { pageSize: 200, params, maxItems: 1000, signal: abortController.signal });
        const list = rawList.map((p: ProjectOption) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteTeams(unique);
      } catch { /* ignore */ } finally { if (!cancelled) setLoadingTeams(false); }
    };
    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, apiBaseUrl, selectedClubId, selectedOrganisationId, selectedOrganisationSlug]);

  // Fetch users
  useEffect(() => {
    if (!opened) return;
    const teamId = String(selectedTeamId || '').trim();
    const clubId = String(selectedClubId || '').trim();
    const orgId = String(selectedOrganisationId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();
    const season = String(seasonId || '').trim();

    if (!teamId && !clubId && !orgId) { setUserOptions([]); setSelectedUserId(''); return; }
    if (!teamId && !clubId && orgId && !orgSlug) { setUserOptions([]); setSelectedUserId(''); return; }

    let cancelled = false;
    const abortController = new AbortController();

    const load = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        let usersRaw: any[] = [];
        if (teamId) {
          if (!season) throw new Error('Missing season context');
          const queryParams: Record<string, string | number | boolean | undefined> = { period: season, scope_project_id: clubId || undefined };
          const data = await api.list<any>(`/projects/${encodeURIComponent(teamId)}/members/searchable-users/`, { pageSize: 500, params: queryParams, signal: abortController.signal });
          usersRaw = data.results;
        } else if (clubId) {
          const data = await api.list<any>(`/projects/${encodeURIComponent(clubId)}/members/`, { pageSize: 500, signal: abortController.signal });
          usersRaw = data.results.map((m: { user?: unknown }) => m?.user).filter(Boolean);
        } else {
          const data = await api.list<any>(`/organisations/${encodeURIComponent(orgSlug)}/members/`, { pageSize: 500, params: { include_project_memberships: true }, signal: abortController.signal });
          usersRaw = data.results.map((m: { user?: unknown }) => m?.user).filter(Boolean);
        }

        const normalized = usersRaw.map(normalizeUser).filter(Boolean) as UserOption[];
        const unique = [...new Map(normalized.map((u) => [String(u.id), u])).values()];
        if (!cancelled) {
          setUserOptions(unique);
          const selected = String(selectedUserId || '').trim();
          if (selected && !unique.some((u) => String(u.id) === selected)) setSelectedUserId('');
        }
      } catch (e: unknown) {
        logger.error('Failed to load users', e);
        if (!cancelled && !(e instanceof Error && e.name === 'AbortError')) {
          setUserOptions([]);
          setError(e instanceof Error ? e.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, selectedTeamId, selectedClubId, selectedOrganisationId, selectedOrganisationSlug, seasonId, apiBaseUrl, selectedUserId]);

  // ── Submit ──

  const filteredUserOptions = useMemo(() => {
    const q = String(userSearch || '').trim().toLowerCase();
    if (!q) return userOptions;
    return userOptions.filter((u) => {
      const name = String(u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [userOptions, userSearch]);

  const missingTeam = !String(selectedTeamId || '').trim();
  const missingUser = !String(selectedUserId || '').trim();
  const canSubmit = !missingTeam && !missingUser && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Will be closed by caller
    } catch (e) {
      logger.error('Failed to add user', e);
      setError(e instanceof Error ? e.message : 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  return {
    // Dropdowns
    sortedOrganisations, filteredClubs, filteredTeams, filteredUserOptions,
    // State
    selectedOrganisationId, selectedClubId, selectedTeamId,
    userSearch, selectedUserId, position, shirtNumber,
    loadingOrganisations, loadingClubs, loadingTeams, loadingUsers, saving, error,
    missingTeam, missingUser, canSubmit,
    // Setters
    setUserSearch, setSelectedUserId, setPosition, setShirtNumber,
    // Actions
    applyOrganisationSelection, applyClubSelection, applyTeamSelection, handleSubmit,
  };
}
