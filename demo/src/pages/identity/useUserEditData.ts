/**
 * useUserEditData — State management + API calls for UserEditModal.
 *
 * Hooks into: form state, avatar upload, org/club/team role management,
 * project loading, membership fetching, and all role update functions.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import {
  type User,
  type ProjectChoice,
  type OrgProjectChoice,
  readFunctionalRolesFromMembership,
} from './userEditTypes';

export interface UseUserEditDataParams {
  opened: boolean;
  user: User | null;
  organisationSlug?: string;
  scopeProjectKey?: string;
  onSaved?: () => Promise<void> | void;
}

export function useUserEditData({ opened, user, organisationSlug, scopeProjectKey, onSaved }: UseUserEditDataParams) {
  const [activeTab, setActiveTab] = useState<'personal' | 'access' | 'link'>('access');
  const [formData, setFormData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [orgRole, setOrgRole] = useState<'member' | 'admin'>('member');
  const [orgMembershipId, setOrgMembershipId] = useState<string | null>(null);

  const [selectedClubKey, setSelectedClubKey] = useState<string>('');
  const [clubMembershipId, setClubMembershipId] = useState<string | null>(null);
  const [clubAccessRole, setClubAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  const [selectedTeamKey, setSelectedTeamKey] = useState<string>('');
  const [teamMembershipId, setTeamMembershipId] = useState<string | null>(null);
  const [teamAccessRole, setTeamAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [initialFunctionalRoles, setInitialFunctionalRoles] = useState<string[]>([]);

  const [linkClubKey, setLinkClubKey] = useState<string>('');
  const [linkTeamKey, setLinkTeamKey] = useState<string>('');
  const [linkAccessRole, setLinkAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  const [orgProjects, setOrgProjects] = useState<OrgProjectChoice[]>([]);
  const [orgProjectsLoading, setOrgProjectsLoading] = useState(false);
  const [orgProjectsError, setOrgProjectsError] = useState<string | null>(null);

  const [inviteOrgRole, setInviteOrgRole] = useState<'member' | 'admin'>('member');
  const [addingToOrg, setAddingToOrg] = useState(false);
  const [addingToProject, setAddingToProject] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  // ── Available projects memo ──
  const availableProjects = useMemo<ProjectChoice[]>(() => {
    let list = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
    if (list.length === 0) {
      const pms = Array.isArray((user as any)?.project_memberships) ? (user as any).project_memberships : [];
      const seen = new Set<string>();
      list = pms.map((pm: any) => {
        const proj = pm?.project || {};
        const key = String(proj?.slug || proj?.id || pm?.project_id || '').trim();
        if (!key || seen.has(key)) return null;
        seen.add(key);
        return { slug: proj?.slug || key, id: proj?.id || pm?.project_id, name: proj?.name || key, parent_id: proj?.parent_id ?? null, parent_slug: proj?.parent_slug ?? null };
      }).filter(Boolean);
    }
    if (list.length === 0 && orgProjects.length > 0) {
      return orgProjects.map(op => ({ key: op.key, name: op.name, isTeam: op.isTeam, parentKey: op.parentKey ?? undefined }));
    }
    const orgProjectMap = new Map<string, OrgProjectChoice>();
    if (Array.isArray(orgProjects)) for (const op of orgProjects) if (op.key) orgProjectMap.set(op.key, op);
    return list.map((p: any) => {
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
    }).filter((p: any) => Boolean(p.key));
  }, [user, orgProjects]);

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
        prevUserIdRef.current = user.id;
      }
      setFormData({ first_name: user.first_name, last_name: user.last_name, email: user.email, is_active: user.is_active, role: user.role });
      const orgSlug = String(organisationSlug || '').trim().toLowerCase();
      const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
      const orgEntry = orgSlug ? orgs.find((o: any) => String(o?.slug || '').toLowerCase() === orgSlug) : null;
      setOrgMembershipId(String(orgEntry?.membership_id || '').trim() || null);
      const roleRaw = String(orgEntry?.role || '').trim().toLowerCase();
      setOrgRole(roleRaw === 'admin' || roleRaw === 'member' ? (roleRaw as any) : 'member');
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
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=500`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load projects');
        const raw = await res.json().catch(() => null);
        const list = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
        const rawItems = Array.isArray(list) ? list : [];
        const idToSlug = new Map<string, string>();
        for (const p of rawItems) { const pid = String(p?.id || '').trim(); const pslug = String(p?.slug || '').trim(); if (pid && pslug) idToSlug.set(pid, pslug); }
        const choices: OrgProjectChoice[] = rawItems.map((p: any) => {
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
  }, [opened, organisationSlug, apiBaseUrl]);

  // ── Fetch member info helper ──
  const fetchMemberInfo = useCallback(async (projectKey: string) => {
    if (!projectKey || !user || !opened) return null;
    try {
      let found = null;
      const normalizedKey = projectKey.trim().toLowerCase();
      const userProjects = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
      const local = userProjects.find((p: any) => String(p?.slug || p?.id || '').trim().toLowerCase() === normalizedKey);
      const knownId = local?.membership_id ? String(local.membership_id).trim() : null;
      if (knownId) {
        try {
          const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(knownId)}/`, {
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
          });
          if (r.ok) found = await r.json();
        } catch { /* fallback */ }
      }
      if (!found) {
        const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/?page_size=500`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (r.ok) {
          const raw = await r.json();
          const members = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
          const uid = String((user as any)?.id || '').trim();
          const matches = members.filter((m: any) => {
            const mUid = m?.user?.id ?? m?.user_id ?? m?.user;
            return String(mUid || '').trim() === uid;
          });
          found = matches.find((m: any) => !String(m?.period_id ?? m?.period ?? '')) || matches[0] || null;
        }
      }
      return found;
    } catch (e) { console.warn('Fetch member failed', e); return null; }
  }, [apiBaseUrl, user, opened]);

  // ── Club membership effect ──
  useEffect(() => {
    const run = async () => {
      if (!selectedClubKey) { setClubMembershipId(null); setClubAccessRole('viewer'); return; }
      const m = await fetchMemberInfo(selectedClubKey);
      if (m) {
        setClubMembershipId(m.id);
        const r = String(m.role || 'viewer').toLowerCase();
        setClubAccessRole((['admin', 'editor', 'viewer'].includes(r) ? r : 'viewer') as any);
      } else { setClubMembershipId(null); setClubAccessRole('viewer'); }
    };
    void run();
  }, [selectedClubKey, user, opened, fetchMemberInfo]);

  // ── Team membership effect ──
  useEffect(() => {
    const run = async () => {
      if (!selectedTeamKey) { setTeamMembershipId(null); setTeamAccessRole('viewer'); setFunctionalRoles([]); setInitialFunctionalRoles([]); return; }
      const m = await fetchMemberInfo(selectedTeamKey);
      if (m) {
        setTeamMembershipId(m.id);
        const r = String(m.role || 'viewer').toLowerCase();
        setTeamAccessRole((['admin', 'editor', 'viewer'].includes(r) ? r : 'viewer') as any);
        const fr = readFunctionalRolesFromMembership(m);
        setFunctionalRoles(fr); setInitialFunctionalRoles(fr);
      } else { setTeamMembershipId(null); setTeamAccessRole('viewer'); setFunctionalRoles([]); setInitialFunctionalRoles([]); }
    };
    void run();
  }, [selectedTeamKey, user, opened, fetchMemberInfo]);

  // ── Avatar upload ──
  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${user.id}/avatar/`, {
        method: 'POST', credentials: 'include', headers: { 'X-CSRFToken': getCsrfToken() }, body: fd,
      });
      if (!res.ok) { const errBody = await res.text().catch(() => ''); throw new Error(`Upload failed: ${res.status} ${errBody.slice(0, 300)}`); }
      onSaved?.();
    } catch (err) { console.error('Avatar upload error:', err); setExtraError('Avatar upload mislukt.'); }
    finally { setAvatarUploading(false); }
  }, [apiBaseUrl, user?.id, onSaved]);

  // ── Role update functions ──
  const updateClubRole = useCallback(async () => {
    if (!selectedClubKey || !clubMembershipId) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedClubKey)}/members/${encodeURIComponent(clubMembershipId)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include', body: JSON.stringify({ role: clubAccessRole }),
    });
    if (!res.ok) { const txt = await res.text(); throw new Error(`Failed to update club role: ${txt}`); }
  }, [apiBaseUrl, selectedClubKey, clubMembershipId, clubAccessRole]);

  const updateTeamRole = useCallback(async () => {
    if (!selectedTeamKey || !teamMembershipId) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/members/${encodeURIComponent(teamMembershipId)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include', body: JSON.stringify({ role: teamAccessRole }),
    });
    if (!res.ok) { const txt = await res.text(); throw new Error(`Failed to update team role: ${txt}`); }
    const prev = new Set(initialFunctionalRoles);
    const next = new Set(functionalRoles);
    const toAdd = Array.from(next).filter(r => !prev.has(r));
    const toRemove = Array.from(prev).filter(r => !next.has(r));
    const uid = Number((user as any)?.id);
    if (toAdd.length) {
      const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/functional-roles/assign/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toAdd }),
      });
      if (!r.ok) throw new Error('Failed to assign roles');
    }
    if (toRemove.length) {
      const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/functional-roles/unassign/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toRemove }),
      });
      if (!r.ok) throw new Error('Failed to unassign roles');
    }
    setInitialFunctionalRoles(Array.from(next).sort());
  }, [apiBaseUrl, selectedTeamKey, teamMembershipId, teamAccessRole, functionalRoles, initialFunctionalRoles, user]);

  const updateOrgRoleIfNeeded = useCallback(async () => {
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug || !orgMembershipId) return;
    const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    const currentEntry = orgs.find((o: any) => String(o?.membership_id || '').trim() === String(orgMembershipId));
    const currentRole = String(currentEntry?.role || '').trim().toLowerCase();
    if (currentRole === String(orgRole)) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(orgMembershipId)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include', body: JSON.stringify({ role: orgRole }),
    });
    if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || 'Failed to update organisation role'); }
  }, [apiBaseUrl, organisationSlug, orgMembershipId, orgRole, user]);

  const linkToOrganisation = useCallback(async () => {
    if (!user) return;
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug) throw new Error('No federation selected');
    setAddingToOrg(true); setExtraError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include', body: JSON.stringify({ email: user.email, role: inviteOrgRole }),
      });
      if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || 'Failed to add user to federation'); }
      await onSaved?.();
    } finally { setAddingToOrg(false); }
  }, [apiBaseUrl, user, organisationSlug, inviteOrgRole, onSaved]);

  const performLinkToProject = useCallback(async (key: string, role: string, type: 'club' | 'team') => {
    if (!user) return;
    const projectKey = String(key || '').trim();
    if (!projectKey) throw new Error('Select a project first');
    setAddingToProject(true); setExtraError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include', body: JSON.stringify({ user_id: Number((user as any)?.id), role }),
      });
      if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || 'Failed to link user to project'); }
      if (type === 'club') setSelectedClubKey(projectKey);
      if (type === 'team') { setSelectedTeamKey(projectKey); const p = orgProjects.find(op => op.key === projectKey); if (p?.parentKey) setSelectedClubKey(p.parentKey); }
      setActiveTab('access');
      await onSaved?.();
    } finally { setAddingToProject(false); }
  }, [apiBaseUrl, user, orgProjects, onSaved]);

  return {
    activeTab, setActiveTab, formData, setFormData, saving, setSaving, extraError, setExtraError,
    avatarUploading, avatarPreview, avatarInputRef, handleAvatarSelect,
    orgRole, setOrgRole, orgMembershipId,
    selectedClubKey, setSelectedClubKey, clubMembershipId, clubAccessRole, setClubAccessRole,
    selectedTeamKey, setSelectedTeamKey, teamMembershipId, teamAccessRole, setTeamAccessRole,
    functionalRoles, setFunctionalRoles,
    linkClubKey, setLinkClubKey, linkTeamKey, setLinkTeamKey, linkAccessRole, setLinkAccessRole,
    orgProjects, orgProjectsLoading, orgProjectsError,
    inviteOrgRole, setInviteOrgRole, addingToOrg, addingToProject,
    availableProjects,
    updateClubRole, updateTeamRole, updateOrgRoleIfNeeded,
    linkToOrganisation, performLinkToProject,
  };
}
