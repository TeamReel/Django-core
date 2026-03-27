/**
 * useUserEditData — State management + API calls for UserEditModal.
 *
 * Hooks into: form state, avatar upload, org/club/team role management,
 * project loading, membership fetching, and all role update functions.
 */
import { useMemo, useReducer, useEffect, useRef, useCallback, type Dispatch, type SetStateAction, type RefObject, type ChangeEvent } from 'react';
import { api } from '@/api';
import type { ProjectMembership } from '@/types/api/project';
import { logger } from '@/utils/logger';
import {
  type User,
  type ProjectChoice,
  type OrgProjectChoice,
  readFunctionalRolesFromMembership,
} from './userEditTypes';
import { formReducer, makeSetter } from '@/utils/formReducer';

export interface UseUserEditDataParams {
  opened: boolean;
  user: User | null;
  organisationSlug?: string;
  scopeProjectKey?: string;
  onSaved?: () => Promise<void> | void;
}

export interface UseUserEditDataReturn {
  activeTab: 'personal' | 'access' | 'link';
  setActiveTab: Dispatch<SetStateAction<'personal' | 'access' | 'link'>>;
  formData: Partial<User>;
  setFormData: Dispatch<SetStateAction<Partial<User>>>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  extraError: string | null;
  setExtraError: Dispatch<SetStateAction<string | null>>;
  avatarUploading: boolean;
  avatarPreview: string | null;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  handleAvatarSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  orgRole: 'member' | 'admin';
  setOrgRole: Dispatch<SetStateAction<'member' | 'admin'>>;
  orgMembershipId: string | null;
  selectedClubKey: string;
  setSelectedClubKey: Dispatch<SetStateAction<string>>;
  clubMembershipId: string | null;
  clubAccessRole: 'viewer' | 'editor' | 'admin';
  setClubAccessRole: Dispatch<SetStateAction<'viewer' | 'editor' | 'admin'>>;
  selectedTeamKey: string;
  setSelectedTeamKey: Dispatch<SetStateAction<string>>;
  teamMembershipId: string | null;
  teamAccessRole: 'viewer' | 'editor' | 'admin';
  setTeamAccessRole: Dispatch<SetStateAction<'viewer' | 'editor' | 'admin'>>;
  functionalRoles: string[];
  setFunctionalRoles: Dispatch<SetStateAction<string[]>>;
  linkClubKey: string;
  setLinkClubKey: Dispatch<SetStateAction<string>>;
  linkTeamKey: string;
  setLinkTeamKey: Dispatch<SetStateAction<string>>;
  linkAccessRole: 'viewer' | 'editor' | 'admin';
  setLinkAccessRole: Dispatch<SetStateAction<'viewer' | 'editor' | 'admin'>>;
  orgProjects: OrgProjectChoice[];
  orgProjectsLoading: boolean;
  orgProjectsError: string | null;
  inviteOrgRole: 'member' | 'admin';
  setInviteOrgRole: Dispatch<SetStateAction<'member' | 'admin'>>;
  addingToOrg: boolean;
  addingToProject: boolean;
  availableProjects: ProjectChoice[];
  updateClubRole: () => Promise<void>;
  updateTeamRole: () => Promise<void>;
  updateOrgRoleIfNeeded: () => Promise<void>;
  linkToOrganisation: () => Promise<void>;
  performLinkToProject: (key: string, role: string, type: 'club' | 'team') => Promise<void>;
}

// ── State interface ──────────────────────────────────────────────────────────

interface UserEditState {
  activeTab: 'personal' | 'access' | 'link';
  formData: Partial<User>;
  saving: boolean;
  extraError: string | null;
  avatarUploading: boolean;
  avatarPreview: string | null;
  orgRole: 'member' | 'admin';
  orgMembershipId: string | null;
  selectedClubKey: string;
  clubMembershipId: string | null;
  clubAccessRole: 'viewer' | 'editor' | 'admin';
  selectedTeamKey: string;
  teamMembershipId: string | null;
  teamAccessRole: 'viewer' | 'editor' | 'admin';
  functionalRoles: string[];
  initialFunctionalRoles: string[];
  linkClubKey: string;
  linkTeamKey: string;
  linkAccessRole: 'viewer' | 'editor' | 'admin';
  orgProjects: OrgProjectChoice[];
  orgProjectsLoading: boolean;
  orgProjectsError: string | null;
  inviteOrgRole: 'member' | 'admin';
  addingToOrg: boolean;
  addingToProject: boolean;
}

const initialUserEditState: UserEditState = {
  activeTab: 'access', formData: {}, saving: false, extraError: null,
  avatarUploading: false, avatarPreview: null,
  orgRole: 'member', orgMembershipId: null,
  selectedClubKey: '', clubMembershipId: null, clubAccessRole: 'viewer',
  selectedTeamKey: '', teamMembershipId: null, teamAccessRole: 'viewer',
  functionalRoles: [], initialFunctionalRoles: [],
  linkClubKey: '', linkTeamKey: '', linkAccessRole: 'viewer',
  orgProjects: [], orgProjectsLoading: false, orgProjectsError: null,
  inviteOrgRole: 'member', addingToOrg: false, addingToProject: false,
};

export function useUserEditData({ opened, user, organisationSlug, scopeProjectKey, onSaved }: UseUserEditDataParams): UseUserEditDataReturn {
  /* ── Reducer state ── */
  const [s, dispatch] = useReducer(formReducer<UserEditState>, initialUserEditState);

  /* ── Backward-compatible setters ── */
  const setActiveTab = useMemo(() => makeSetter<UserEditState, 'activeTab'>(dispatch, 'activeTab'), [dispatch]);
  const setFormData = useMemo(() => makeSetter<UserEditState, 'formData'>(dispatch, 'formData'), [dispatch]);
  const setSaving = useMemo(() => makeSetter<UserEditState, 'saving'>(dispatch, 'saving'), [dispatch]);
  const setExtraError = useMemo(() => makeSetter<UserEditState, 'extraError'>(dispatch, 'extraError'), [dispatch]);
  const setAvatarUploading = useMemo(() => makeSetter<UserEditState, 'avatarUploading'>(dispatch, 'avatarUploading'), [dispatch]);
  const setAvatarPreview = useMemo(() => makeSetter<UserEditState, 'avatarPreview'>(dispatch, 'avatarPreview'), [dispatch]);
  const setOrgRole = useMemo(() => makeSetter<UserEditState, 'orgRole'>(dispatch, 'orgRole'), [dispatch]);
  const setOrgMembershipId = useMemo(() => makeSetter<UserEditState, 'orgMembershipId'>(dispatch, 'orgMembershipId'), [dispatch]);
  const setSelectedClubKey = useMemo(() => makeSetter<UserEditState, 'selectedClubKey'>(dispatch, 'selectedClubKey'), [dispatch]);
  const setClubMembershipId = useMemo(() => makeSetter<UserEditState, 'clubMembershipId'>(dispatch, 'clubMembershipId'), [dispatch]);
  const setClubAccessRole = useMemo(() => makeSetter<UserEditState, 'clubAccessRole'>(dispatch, 'clubAccessRole'), [dispatch]);
  const setSelectedTeamKey = useMemo(() => makeSetter<UserEditState, 'selectedTeamKey'>(dispatch, 'selectedTeamKey'), [dispatch]);
  const setTeamMembershipId = useMemo(() => makeSetter<UserEditState, 'teamMembershipId'>(dispatch, 'teamMembershipId'), [dispatch]);
  const setTeamAccessRole = useMemo(() => makeSetter<UserEditState, 'teamAccessRole'>(dispatch, 'teamAccessRole'), [dispatch]);
  const setFunctionalRoles = useMemo(() => makeSetter<UserEditState, 'functionalRoles'>(dispatch, 'functionalRoles'), [dispatch]);
  const setInitialFunctionalRoles = useMemo(() => makeSetter<UserEditState, 'initialFunctionalRoles'>(dispatch, 'initialFunctionalRoles'), [dispatch]);
  const setLinkClubKey = useMemo(() => makeSetter<UserEditState, 'linkClubKey'>(dispatch, 'linkClubKey'), [dispatch]);
  const setLinkTeamKey = useMemo(() => makeSetter<UserEditState, 'linkTeamKey'>(dispatch, 'linkTeamKey'), [dispatch]);
  const setLinkAccessRole = useMemo(() => makeSetter<UserEditState, 'linkAccessRole'>(dispatch, 'linkAccessRole'), [dispatch]);
  const setOrgProjects = useMemo(() => makeSetter<UserEditState, 'orgProjects'>(dispatch, 'orgProjects'), [dispatch]);
  const setOrgProjectsLoading = useMemo(() => makeSetter<UserEditState, 'orgProjectsLoading'>(dispatch, 'orgProjectsLoading'), [dispatch]);
  const setOrgProjectsError = useMemo(() => makeSetter<UserEditState, 'orgProjectsError'>(dispatch, 'orgProjectsError'), [dispatch]);
  const setInviteOrgRole = useMemo(() => makeSetter<UserEditState, 'inviteOrgRole'>(dispatch, 'inviteOrgRole'), [dispatch]);
  const setAddingToOrg = useMemo(() => makeSetter<UserEditState, 'addingToOrg'>(dispatch, 'addingToOrg'), [dispatch]);
  const setAddingToProject = useMemo(() => makeSetter<UserEditState, 'addingToProject'>(dispatch, 'addingToProject'), [dispatch]);

  // Avatar ref (stays outside reducer)
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Available projects memo ──
  const availableProjects = useMemo<ProjectChoice[]>(() => {
    let list = Array.isArray(user?.projects) ? user!.projects : [];
    if (list.length === 0) {
      const pms = Array.isArray(user?.project_memberships) ? user!.project_memberships : [];
      const seen = new Set<string>();
      list = pms.map((pm: { project?: Record<string, unknown>; project_id?: string }) => {
        const proj = pm?.project || {};
        const key = String(proj?.slug || proj?.id || pm?.project_id || '').trim();
        if (!key || seen.has(key)) return null;
        seen.add(key);
        return { slug: String(proj?.slug || key), id: proj?.id || pm?.project_id, name: String(proj?.name || key), parent_id: (proj?.parent_id as string | null) ?? null, parent_slug: (proj?.parent_slug as string | null) ?? null };
      }).filter(Boolean) as typeof list;
    }
    if (list.length === 0 && s.orgProjects.length > 0) {
      return s.orgProjects.map(op => ({ key: op.key, name: op.name, isTeam: op.isTeam, parentKey: op.parentKey ?? undefined }));
    }
    const orgProjectMap = new Map<string, OrgProjectChoice>();
    if (Array.isArray(s.orgProjects)) for (const op of s.orgProjects) if (op.key) orgProjectMap.set(op.key, op);
    return list.map((p: Record<string, unknown>) => {
      const key = String(p?.slug || p?.id || '').trim();
      const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();
      let isTeam = false;
      let parentKey: string | undefined = undefined;
      const match = orgProjectMap.get(key);
      if (match) { if (match.isTeam) isTeam = true; if (match.parentKey) parentKey = match.parentKey; }
      if (!isTeam && (p?.parent_id || p?.parent || p?.is_team || p?.isTeam)) isTeam = true;
      if (!isTeam && (name.toLowerCase().includes('team') || name.includes('-') || /\s\d+$/.test(name) || /\sO\d+/i.test(name) || /\sU\d+/i.test(name))) isTeam = true;
      if (!parentKey && (p?.parent_id || p?.parent_slug)) parentKey = String(p.parent_slug || p.parent_id).trim();
      return { key, name, isTeam, parentKey };
    }).filter((p: { key: string }) => Boolean(p.key));
  }, [user, s.orgProjects]);

  // ── User init effect ──
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.id !== prevUserIdRef.current) {
        setActiveTab(scopeProjectKey ? 'access' : 'personal');
        setSelectedClubKey(''); setSelectedTeamKey(''); setAvatarPreview(null);
        const forced = String(scopeProjectKey || '').trim();
        if (forced) {
          const found = availableProjects.find(p => p.key === forced);
          if (found) {
            if (found.isTeam) { setSelectedTeamKey(found.key); if (found.parentKey) setSelectedClubKey(found.parentKey); }
            else setSelectedClubKey(found.key);
          } else setSelectedClubKey(forced);
        } else {
          const firstClub = availableProjects.find(p => !p.isTeam);
          if (firstClub) setSelectedClubKey(firstClub.key);
        }
        prevUserIdRef.current = String(user.id);
      }
      setFormData({ first_name: user.first_name, last_name: user.last_name, email: user.email, is_active: user.is_active, role: user.role });
      const orgSlug = String(organisationSlug || '').trim().toLowerCase();
      const orgs = Array.isArray(user?.organisations) ? user!.organisations : [];
      const orgEntry = orgSlug ? orgs.find((o: { slug?: string }) => String(o?.slug || '').toLowerCase() === orgSlug) : null;
      setOrgMembershipId(String(orgEntry?.membership_id || '').trim() || null);
      const roleRaw = String(orgEntry?.role || '').trim().toLowerCase();
      setOrgRole(roleRaw === 'admin' || roleRaw === 'member' ? roleRaw : 'member');
      setExtraError(null);
    }
  }, [user, organisationSlug, scopeProjectKey, availableProjects]);

  // ── Load org projects ──
  useEffect(() => {
    const run = async () => {
      if (!opened) return;
      const orgSlug = String(organisationSlug || '').trim();
      if (!orgSlug) { setOrgProjects([]); setOrgProjectsError(null); return; }
      setOrgProjectsLoading(true); setOrgProjectsError(null);
      try {
        const { results: rawItems } = await api.list<Record<string, unknown>>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, { pageSize: 500 });
        const idToSlug = new Map<string, string>();
        for (const p of rawItems) { const pid = String(p?.id || '').trim(); const pslug = String(p?.slug || '').trim(); if (pid && pslug) idToSlug.set(pid, pslug); }
        const choices: OrgProjectChoice[] = rawItems.map((p: Record<string, unknown>) => {
          const key = String(p?.slug || p?.id || '').trim();
          const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();
          const parentName = String(p?.parent_name || p?.parentName || '').trim() || null;
          const parentId = String(p?.parent_id || p?.parentId || '').trim();
          let parentKey = String(p?.parent_slug || p?.parentSlug || parentId || '').trim() || undefined;
          if (parentKey && idToSlug.has(parentKey)) parentKey = idToSlug.get(parentKey);
          return { key, name, parentName, parentKey, isTeam: Boolean(parentId) };
        }).filter(p => Boolean(p.key) && Boolean(p.name)).sort((a, b) => {
          const ak = `${a.parentName || ''}::${a.name}`.toLowerCase();
          const bk = `${b.parentName || ''}::${b.name}`.toLowerCase();
          return ak.localeCompare(bk);
        });
        setOrgProjects(choices);
      } catch (e) { setOrgProjects([]); setOrgProjectsError(e instanceof Error ? e.message : 'Failed to load projects'); }
      finally { setOrgProjectsLoading(false); }
    };
    void run();
  }, [opened, organisationSlug]);

  // ── Fetch member info helper ──
  const fetchMemberInfo = useCallback(async (projectKey: string) => {
    if (!projectKey || !user || !opened) return null;
    try {
      let found = null;
      const normalizedKey = projectKey.trim().toLowerCase();
      const userProjects = Array.isArray(user?.projects) ? user!.projects : [];
      const local = userProjects.find((p: Record<string, unknown>) => String(p?.slug || p?.id || '').trim().toLowerCase() === normalizedKey);
      const knownId = local?.membership_id ? String(local.membership_id).trim() : null;
      if (knownId) {
        try {
          found = await api.get<ProjectMembership>(`/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(knownId)}/`);
        } catch { /* fallback */ }
      }
      if (!found) {
        const { results: members } = await api.list<ProjectMembership>(`/projects/${encodeURIComponent(projectKey)}/members/`, { pageSize: 500 });
        const uid = String(user?.id || '').trim();
          const matches = members.filter((m) => {
            const mRec = m as unknown as Record<string, unknown>;
            const mUid = m?.user?.id ?? mRec?.user_id ?? mRec?.user;
            return String(mUid || '').trim() === uid;
          });
          found = matches.find((m: { period_id?: string; period?: unknown }) => !String(m?.period_id ?? m?.period ?? '')) || matches[0] || null;
      }
      return found;
    } catch (e) { logger.warn('Fetch member failed', e); return null; }
  }, [user, opened]);

  // ── Club membership effect ──
  useEffect(() => {
    const run = async () => {
      if (!s.selectedClubKey) { setClubMembershipId(null); setClubAccessRole('viewer'); return; }
      const m = await fetchMemberInfo(s.selectedClubKey);
      if (m) {
        setClubMembershipId(String(m.id));
        const r = String(m.role || 'viewer').toLowerCase();
        setClubAccessRole((r === 'admin' || r === 'editor' || r === 'viewer') ? r : 'viewer');
      } else { setClubMembershipId(null); setClubAccessRole('viewer'); }
    };
    void run();
  }, [s.selectedClubKey, user, opened, fetchMemberInfo]);

  // ── Team membership effect ──
  useEffect(() => {
    const run = async () => {
      if (!s.selectedTeamKey) { setTeamMembershipId(null); setTeamAccessRole('viewer'); setFunctionalRoles([]); setInitialFunctionalRoles([]); return; }
      const m = await fetchMemberInfo(s.selectedTeamKey);
      if (m) {
        setTeamMembershipId(String(m.id));
        const r = String(m.role || 'viewer').toLowerCase();
        setTeamAccessRole((r === 'admin' || r === 'editor' || r === 'viewer') ? r : 'viewer');
        const fr = readFunctionalRolesFromMembership(m as unknown as Record<string, unknown>);
        setFunctionalRoles(fr); setInitialFunctionalRoles(fr);
      } else { setTeamMembershipId(null); setTeamAccessRole('viewer'); setFunctionalRoles([]); setInitialFunctionalRoles([]); }
    };
    void run();
  }, [s.selectedTeamKey, user, opened, fetchMemberInfo]);

  // ── Avatar upload ──
  const handleAvatarSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    void uploadAvatar(file);
  }, [user?.id]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.post(`/admin/users/${user.id}/avatar/`, fd);
      onSaved?.();
    } catch (err) { logger.error('Avatar upload error', err); setExtraError('Avatar upload mislukt.'); }
    finally { setAvatarUploading(false); }
  }, [user?.id, onSaved]);

  // ── Role update functions ──
  const updateClubRole = useCallback(async () => {
    if (!s.selectedClubKey || !s.clubMembershipId) return;
    await api.patch(`/projects/${encodeURIComponent(s.selectedClubKey)}/members/${encodeURIComponent(s.clubMembershipId)}/`, { role: s.clubAccessRole });
  }, [s.selectedClubKey, s.clubMembershipId, s.clubAccessRole]);

  const updateTeamRole = useCallback(async () => {
    if (!s.selectedTeamKey || !s.teamMembershipId) return;
    await api.patch(`/projects/${encodeURIComponent(s.selectedTeamKey)}/members/${encodeURIComponent(s.teamMembershipId)}/`, { role: s.teamAccessRole });
    const prev = new Set(s.initialFunctionalRoles);
    const next = new Set(s.functionalRoles);
    const toAdd = Array.from(next).filter(r => !prev.has(r));
    const toRemove = Array.from(prev).filter(r => !next.has(r));
    const uid = Number(user?.id);
    if (toAdd.length) {
      await api.post(`/projects/${encodeURIComponent(s.selectedTeamKey)}/functional-roles/assign/`, { user_id: uid, roles: toAdd });
    }
    if (toRemove.length) {
      await api.post(`/projects/${encodeURIComponent(s.selectedTeamKey)}/functional-roles/unassign/`, { user_id: uid, roles: toRemove });
    }
    setInitialFunctionalRoles(Array.from(next).sort());
  }, [s.selectedTeamKey, s.teamMembershipId, s.teamAccessRole, s.functionalRoles, s.initialFunctionalRoles, user]);

  const updateOrgRoleIfNeeded = useCallback(async () => {
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug || !s.orgMembershipId) return;
    const orgs = Array.isArray(user?.organisations) ? user!.organisations : [];
    const currentEntry = orgs.find((o) => String(o?.membership_id || '').trim() === String(s.orgMembershipId));
    const currentRole = String(currentEntry?.role || '').trim().toLowerCase();
    if (currentRole === String(s.orgRole)) return;
    await api.patch(`/organisations/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(s.orgMembershipId)}/`, { role: s.orgRole });
  }, [organisationSlug, s.orgMembershipId, s.orgRole, user]);

  const linkToOrganisation = useCallback(async () => {
    if (!user) return;
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug) throw new Error('No federation selected');
    setAddingToOrg(true); setExtraError(null);
    try {
      await api.post(`/organisations/${encodeURIComponent(orgSlug)}/members/`, { email: user.email, role: s.inviteOrgRole });
      await onSaved?.();
    } finally { setAddingToOrg(false); }
  }, [user, organisationSlug, s.inviteOrgRole, onSaved]);

  const performLinkToProject = useCallback(async (key: string, role: string, type: 'club' | 'team') => {
    if (!user) return;
    const projectKey = String(key || '').trim();
    if (!projectKey) throw new Error('Select a project first');
    setAddingToProject(true); setExtraError(null);
    try {
      await api.post(`/projects/${encodeURIComponent(projectKey)}/members/`, { user_id: Number(user?.id), role });
      if (type === 'club') setSelectedClubKey(projectKey);
      if (type === 'team') { setSelectedTeamKey(projectKey); const p = s.orgProjects.find(op => op.key === projectKey); if (p?.parentKey) setSelectedClubKey(p.parentKey); }
      setActiveTab('access');
      await onSaved?.();
    } finally { setAddingToProject(false); }
  }, [user, s.orgProjects, onSaved]);

  return {
    activeTab: s.activeTab, setActiveTab, formData: s.formData, setFormData, saving: s.saving, setSaving, extraError: s.extraError, setExtraError,
    avatarUploading: s.avatarUploading, avatarPreview: s.avatarPreview, avatarInputRef, handleAvatarSelect,
    orgRole: s.orgRole, setOrgRole, orgMembershipId: s.orgMembershipId,
    selectedClubKey: s.selectedClubKey, setSelectedClubKey, clubMembershipId: s.clubMembershipId, clubAccessRole: s.clubAccessRole, setClubAccessRole,
    selectedTeamKey: s.selectedTeamKey, setSelectedTeamKey, teamMembershipId: s.teamMembershipId, teamAccessRole: s.teamAccessRole, setTeamAccessRole,
    functionalRoles: s.functionalRoles, setFunctionalRoles,
    linkClubKey: s.linkClubKey, setLinkClubKey, linkTeamKey: s.linkTeamKey, setLinkTeamKey, linkAccessRole: s.linkAccessRole, setLinkAccessRole,
    orgProjects: s.orgProjects, orgProjectsLoading: s.orgProjectsLoading, orgProjectsError: s.orgProjectsError,
    inviteOrgRole: s.inviteOrgRole, setInviteOrgRole, addingToOrg: s.addingToOrg, addingToProject: s.addingToProject,
    availableProjects,
    updateClubRole, updateTeamRole, updateOrgRoleIfNeeded,
    linkToOrganisation, performLinkToProject,
  };
}
