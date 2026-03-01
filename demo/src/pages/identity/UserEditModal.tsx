import { useMemo, useState, useEffect, useRef, type FormEvent } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role?: string;
  organisations?: any[];
  projects?: any[];
}

interface UserEditModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userData: Partial<User>) => Promise<void>;
  onSaved?: () => Promise<void> | void;
  organisationSlug?: string;
  scopeProjectKey?: string;
}

type ProjectChoice = {
  key: string;
  name: string;
  isTeam?: boolean;
  parentKey?: string;
};

type OrgProjectChoice = {
  key: string;
  name: string;
  parentName?: string | null;
  parentKey?: string | null;
  isTeam: boolean;
};

export default function UserEditModal({
  opened,
  onClose,
  user,
  onSave,
  onSaved,
  organisationSlug,
  scopeProjectKey,
}: UserEditModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'access' | 'link'>('access');
  const [formData, setFormData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [orgRole, setOrgRole] = useState<'member' | 'admin'>('member');
  const [orgMembershipId, setOrgMembershipId] = useState<string | null>(null);

  // Split state for hierarchical editing
  const [selectedClubKey, setSelectedClubKey] = useState<string>('');
  const [clubMembershipId, setClubMembershipId] = useState<string | null>(null);
  const [clubAccessRole, setClubAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  const [selectedTeamKey, setSelectedTeamKey] = useState<string>('');
  const [teamMembershipId, setTeamMembershipId] = useState<string | null>(null);
  const [teamAccessRole, setTeamAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [initialFunctionalRoles, setInitialFunctionalRoles] = useState<string[]>([]);

  // Link state
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

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

  // ── RBAC role mapping ──────────────────────────────────────────────
  const ADMIN_LIKE_ROLES = new Set(['admin', 'editor', 'owner', 'manager', 'coach']);

  const getRbacLabel = (accessRole: string, isTeam: boolean): string => {
    const isAdmin = ADMIN_LIKE_ROLES.has(accessRole);
    if (isAdmin) return isTeam ? 'Team Admin' : 'Club Admin';
    return isTeam ? 'Team Member' : 'Supporter';
  };

  const getRbacColor = (label: string): string => {
    switch (label) {
      case 'Club Admin': return '#f59e0b';
      case 'Team Admin': return '#3b82f6';
      case 'Team Member': return '#10b981';
      case 'Supporter': return '#8b5cf6';
      case 'Land Admin': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const RbacBadge = ({ label }: { label: string }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      color: '#fff',
      backgroundColor: getRbacColor(label),
      letterSpacing: '0.02em',
    }}>
      🔰 {label}
    </span>
  );

  const getCookie = (name: string) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const getCsrfToken = () => getCookie('csrftoken') || '';

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${user.id}/avatar/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: fd,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error('Avatar upload response:', res.status, errBody);
        throw new Error(`Upload failed: ${res.status} ${errBody.slice(0, 300)}`);
      }
      onSaved?.();
    } catch (err) {
      console.error('Avatar upload error:', err);
      setExtraError('Avatar upload mislukt.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const availableProjects = useMemo<ProjectChoice[]>(() => {
    // Primary source: user.projects (from admin detail endpoint)
    let list = Array.isArray((user as any)?.projects) ? (user as any).projects : [];

    // Fallback: derive from project_memberships (from org members endpoint)
    if (list.length === 0) {
      const pms = Array.isArray((user as any)?.project_memberships) ? (user as any).project_memberships : [];
      const seen = new Set<string>();
      list = pms
        .map((pm: any) => {
          const proj = pm?.project || {};
          const key = String(proj?.slug || proj?.id || pm?.project_id || '').trim();
          if (!key || seen.has(key)) return null;
          seen.add(key);
          return {
            slug: proj?.slug || key,
            id: proj?.id || pm?.project_id,
            name: proj?.name || key,
            parent_id: proj?.parent_id ?? null,
            parent_slug: proj?.parent_slug ?? null,
          };
        })
        .filter(Boolean);
    }

    // If user has no projects at all but orgProjects are loaded, use those
    // so the dropdowns still show clubs/teams that the user can be linked to.
    if (list.length === 0 && orgProjects.length > 0) {
      return orgProjects.map((op) => ({
        key: op.key,
        name: op.name,
        isTeam: op.isTeam,
        parentKey: op.parentKey ?? undefined,
      }));
    }

    const orgProjectMap = new Map<string, OrgProjectChoice>();
    if (Array.isArray(orgProjects)) {
      for (const op of orgProjects) {
        if (op.key) orgProjectMap.set(op.key, op);
      }
    }

    return list
      .map((p: any) => {
        const key = String(p?.slug || p?.id || '').trim();
        const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();

        let isTeam = false;
        let parentKey: string | undefined = undefined;

        // Try to determine parent from orgProjects map
        const match = orgProjectMap.get(key);
        if (match) {
          if (match.isTeam) isTeam = true;
          if (match.parentKey) parentKey = match.parentKey;
        }

        // Fallback strategies for isTeam
        if (!isTeam) {
            if (p?.parent_id || p?.parent || p?.is_team || p?.isTeam) isTeam = true;
        }
        if (!isTeam) {
             if (
                 name.toLowerCase().includes('team') ||
                 name.includes('-') ||
                 /\s\d+$/.test(name) ||
                 /\sO\d+/i.test(name) ||
                 /\sU\d+/i.test(name)
             ) {
                 isTeam = true;
             }
        }

        // Fallback for parentKey from local project object if available
        if (!parentKey && (p?.parent_id || p?.parent_slug)) {
            parentKey = String(p.parent_slug || p.parent_id).trim();
        }

        return {
          key,
          name,
          isTeam,
          parentKey
        };
      })
      .filter((p: any) => Boolean(p.key));
  }, [user, orgProjects]);

  const readFunctionalRolesFromMembership = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.id !== prevUserIdRef.current) {
        setActiveTab(scopeProjectKey ? 'access' : 'personal');

        // Reset selections
        setSelectedClubKey('');
        setSelectedTeamKey('');
        setAvatarPreview(null);

        // Attempt to apply scope
        const forced = String(scopeProjectKey || '').trim();
        if (forced) {
            // Find in available projects to see if it is team or club
            const found = availableProjects.find(p => p.key === forced);
            if (found) {
                if (found.isTeam) {
                    setSelectedTeamKey(found.key);
                    if (found.parentKey) setSelectedClubKey(found.parentKey);
                } else {
                    setSelectedClubKey(found.key);
                }
            } else {
                // If not found (maybe not loaded yet?), just try setting it as club default
                setSelectedClubKey(forced);
            }
        } else {
            // Default: Select first club
            const firstClub = availableProjects.find(p => !p.isTeam);
            if (firstClub) setSelectedClubKey(firstClub.key);
        }

        prevUserIdRef.current = user.id;
      }

      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_active: user.is_active,
        role: user.role
      });

      const orgSlug = String(organisationSlug || '').trim().toLowerCase();
      const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
      const orgEntry = orgSlug
        ? orgs.find((o: any) => String(o?.slug || '').toLowerCase() === orgSlug)
        : null;
      const membershipId = String(orgEntry?.membership_id || '').trim();
      setOrgMembershipId(membershipId || null);
      const roleRaw = String(orgEntry?.role || '').trim().toLowerCase();
      if (roleRaw === 'admin' || roleRaw === 'member') {
        setOrgRole(roleRaw as any);
      } else {
        setOrgRole('member');
      }

      setExtraError(null);
    }
  }, [user, organisationSlug, scopeProjectKey, availableProjects]);

  useEffect(() => {
    // Load local org projects for hierarchy
    const run = async () => {
      if (!opened) return;
      const orgSlug = String(organisationSlug || '').trim();
      if (!orgSlug) {
        setOrgProjects([]);
        setOrgProjectsError(null);
        return;
      }

      setOrgProjectsLoading(true);
      setOrgProjectsError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=500`,
          {
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error(`Failed to load projects`);

        const raw = await res.json().catch(() => null);
        const list = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
        const rawItems = Array.isArray(list) ? list : [];

        // Build ID -> Slug map for correct parent resolution
        const idToSlug = new Map<string, string>();
        for (const p of rawItems) {
             const pid = String(p?.id || '').trim();
             const pslug = String(p?.slug || '').trim();
             if (pid && pslug) idToSlug.set(pid, pslug);
        }

        const choices: OrgProjectChoice[] = rawItems
          .map((p: any) => {
            const key = String(p?.slug || p?.id || '').trim();
            const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();
            const parentName = String(p?.parent_name || p?.parentName || '').trim() || null;
            const parentId = String(p?.parent_id || p?.parentId || '').trim();

            // Resolve parent key: Prefer slug, fallback to ID lookup, fallback to recursive lookup
            let parentKey = String(p?.parent_slug || p?.parentSlug || parentId || '').trim() || undefined;
            if (parentKey && idToSlug.has(parentKey)) {
                parentKey = idToSlug.get(parentKey);
            }

            return {
              key,
              name,
              parentName,
              parentKey,
              isTeam: Boolean(parentId),
            };
          })
          .filter((p) => Boolean(p.key) && Boolean(p.name))
          .sort((a, b) => {
            const ak = `${a.parentName || ''}::${a.name}`.toLowerCase();
            const bk = `${b.parentName || ''}::${b.name}`.toLowerCase();
            return ak.localeCompare(bk);
          });

        setOrgProjects(choices);
      } catch (e) {
        setOrgProjects([]);
        setOrgProjectsError(e instanceof Error ? e.message : 'Failed to load projects');
      } finally {
        setOrgProjectsLoading(false);
      }
    };

    void run();
  }, [opened, organisationSlug, apiBaseUrl]);

  const fetchMemberInfo = async (projectKey: string) => {
    if (!projectKey || !user || !opened) return null;
    try {
        let found = null;
        const normalizedKey = projectKey.trim().toLowerCase();

        // Strategy 1: Local lookup from user object (fastest, avoids list limit)
        const userProjects = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
        const local = userProjects.find((p: any) => String(p?.slug || p?.id || '').trim().toLowerCase() === normalizedKey);
        const knownId = local?.membership_id ? String(local.membership_id).trim() : null;

        if (knownId) {
            try {
                const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(knownId)}/`, {
                   headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                   credentials: 'include'
                });
                if (r.ok) found = await r.json();
            } catch {}
        }

        // Strategy 2: List lookup (fallback)
        if (!found) {
             const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/?page_size=500`, {
                   headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                   credentials: 'include'
             });
             if (r.ok) {
                 const raw = await r.json();
                 const members = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
                 const uid = String((user as any)?.id || '').trim();
                 const matches = members.filter((m: any) => {
                     // Robust ID extraction: handles expanded User object ({id: 1}), flat user ID (1), or snake_case user_id
                     const mUid = m?.user?.id ?? m?.user_id ?? m?.user;
                     return String(mUid || '').trim() === uid;
                 });
                 found = matches.find((m: any) => !String(m?.period_id ?? m?.period ?? '')) || matches[0] || null;
             }
        }
        return found;
    } catch (e) {
        console.warn('Fetch member failed', e);
        return null;
    }
  };

  // 1. Club Membership Effect
  useEffect(() => {
    const run = async () => {
        if (!selectedClubKey) {
            setClubMembershipId(null);
            setClubAccessRole('viewer');
            return;
        }
        const m = await fetchMemberInfo(selectedClubKey);
        if (m) {
            setClubMembershipId(m.id);
            const r = String(m.role || 'viewer').toLowerCase();
            setClubAccessRole((['admin','editor','viewer'].includes(r) ? r : 'viewer') as any);
        } else {
            setClubMembershipId(null);
            setClubAccessRole('viewer');
        }
    };
    void run();
  }, [selectedClubKey, user, opened]);

  // 2. Team Membership Effect
  useEffect(() => {
    const run = async () => {
        if (!selectedTeamKey) {
            setTeamMembershipId(null);
            setTeamAccessRole('viewer');
            setFunctionalRoles([]);
            setInitialFunctionalRoles([]);
            return;
        }
        const m = await fetchMemberInfo(selectedTeamKey);
        if (m) {
            setTeamMembershipId(m.id);
            const r = String(m.role || 'viewer').toLowerCase();
            setTeamAccessRole((['admin','editor','viewer'].includes(r) ? r : 'viewer') as any);
            const fr = readFunctionalRolesFromMembership(m);
            setFunctionalRoles(fr);
            setInitialFunctionalRoles(fr);
        } else {
            // Check if we already have a membership but it's not loaded
            setTeamMembershipId(null);
            setTeamAccessRole('viewer');
            setFunctionalRoles([]);
            setInitialFunctionalRoles([]);
        }
    };
    void run();
  }, [selectedTeamKey, user, opened]);

  const updateClubRole = async () => {
      if (!selectedClubKey || !clubMembershipId) {
          // If trying to save a context where user is not a member, skip or error?
          // We only update if membership exists.
          return;
      }
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedClubKey)}/members/${encodeURIComponent(clubMembershipId)}/`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
         credentials: 'include',
         body: JSON.stringify({ role: clubAccessRole })
      });
      if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Failed to update club role: ${txt}`);
      }
  };

  const updateTeamRole = async () => {
       if (!selectedTeamKey || !teamMembershipId) return;

       // 1 update access role
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/members/${encodeURIComponent(teamMembershipId)}/`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
         credentials: 'include',
         body: JSON.stringify({ role: teamAccessRole })
      });
      if (!res.ok) {
           const txt = await res.text();
           throw new Error(`Failed to update team role: ${txt}`);
      }

      // 2 update functional roles
      const prev = new Set(initialFunctionalRoles);
      const next = new Set(functionalRoles);
      const toAdd = Array.from(next).filter(r => !prev.has(r));
      const toRemove = Array.from(prev).filter(r => !next.has(r));
      const uid = Number((user as any)?.id);

      if (toAdd.length) {
          const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/functional-roles/assign/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
              credentials: 'include',
              body: JSON.stringify({ user_id: uid, roles: toAdd })
          });
          if (!r.ok) throw new Error('Failed to assign roles');
      }
      if (toRemove.length) {
          const r = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(selectedTeamKey)}/functional-roles/unassign/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
              credentials: 'include',
              body: JSON.stringify({ user_id: uid, roles: toRemove })
          });
          if (!r.ok) throw new Error('Failed to unassign roles');
      }

      setInitialFunctionalRoles(Array.from(next).sort());
  };

  const updateOrgRoleIfNeeded = async (): Promise<void> => {
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug) return;
    if (!orgMembershipId) return;

    const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    const currentEntry = orgs.find((o: any) => String(o?.membership_id || '').trim() === String(orgMembershipId));
    const currentRole = String(currentEntry?.role || '').trim().toLowerCase();
    if (currentRole === String(orgRole)) return;

    const res = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(orgMembershipId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ role: orgRole }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update organisation role');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setExtraError(null);
    try {
      await onSave(formData);

      // Save all roles
      await updateOrgRoleIfNeeded();
      await updateClubRole();
      await updateTeamRole();

      // Refresh parent data only after *all* updates are done.
      await onSaved?.();

      // Keep modal open to allow further edits
    } catch (error) {
      console.error(error);
      setExtraError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const linkToOrganisation = async (): Promise<void> => {
    if (!user) return;
    const orgSlug = String(organisationSlug || '').trim();
    if (!orgSlug) throw new Error('No federation selected');

    setAddingToOrg(true);
    setExtraError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ email: user.email, role: inviteOrgRole }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to add user to federation');
      }

      await onSaved?.();
    } finally {
      setAddingToOrg(false);
    }
  };

  const performLinkToProject = async (key: string, role: string, type: 'club' | 'team') => {
    if (!user) return;
    const projectKey = String(key || '').trim();
    if (!projectKey) throw new Error('Select a project first');

    setAddingToProject(true);
    setExtraError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: Number((user as any)?.id), role: role }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to link user to project');
      }

      // Jump to access tab and load the newly linked membership for editing.
      if (type === 'club') setSelectedClubKey(projectKey);
      if (type === 'team') {
          setSelectedTeamKey(projectKey);
          // Try to set club parent if known
          const p = orgProjects.find(op => op.key === projectKey);
          if (p?.parentKey) setSelectedClubKey(p.parentKey);
      }

      setActiveTab('access');
      await onSaved?.();
    } finally {
      setAddingToProject(false);
    }
  };

  if (!opened || !user) return null;

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: '999px',
    border: active ? '1px solid #007bff' : '1px solid var(--app-border)',
    backgroundColor: active ? 'rgba(0, 123, 255, 0.12)' : 'var(--app-surface-2)',
    color: 'var(--app-text)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  });

  return (
    <div className="flex-center" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000
    }}>
      <div className="flex-col rounded-8" style={{
        backgroundColor: 'var(--app-surface)',
        width: '860px',
        maxWidth: '90%',
        maxHeight: '90vh',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <div className="border-bottom" style={{ padding: '16px 18px' }}>
          <div className="flex-between gap-12">
            <div>
              <div className="fs-16 fw-800">Edit user</div>
              <div className="fs-12 text-muted" style={{ marginTop: '2px' }}>{user.email}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontWeight: 800,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-row gap-8 mt-12 flex-wrap">
            <button type="button" onClick={() => setActiveTab('personal')} style={tabButtonStyle(activeTab === 'personal')}>
              Personal
            </button>
            <button type="button" onClick={() => setActiveTab('access')} style={tabButtonStyle(activeTab === 'access')}>
              Access & roles
            </button>
            <button type="button" onClick={() => setActiveTab('link')} style={tabButtonStyle(activeTab === 'link')}>
              Add to club/team
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-col flex-1" style={{ minHeight: 0 }}>
          <div
            className="overflow-y-auto flex-1"
            style={{
              padding: '18px',
              minHeight: 0,
            }}
          >
            {activeTab === 'personal' ? (
              <div className="flex-col" style={{ gap: '14px' }}>
                <div className="fw-800" style={{ marginBottom: '2px' }}>Personal settings</div>

                {/* Profile photo */}
                <div className="flex-row gap-16">
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid var(--app-border)',
                      flexShrink: 0,
                      background: 'var(--app-surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {avatarPreview || (user as any)?.avatar_url ? (
                      <img
                        src={avatarPreview || (user as any)?.avatar_url}
                        alt="Avatar"
                        className="w-full h-full"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '28px', color: 'var(--app-muted-text)' }}>
                        {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-col gap-6">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border)',
                        background: 'var(--app-surface-2)',
                        color: 'var(--app-text)',
                        cursor: avatarUploading ? 'wait' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {avatarUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                    <span className="fs-11 text-muted">JPG, PNG — max 5 MB</span>
                  </div>
                </div>

                <div className="flex-row gap-16">
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">First name</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-4 fw-600">Last name</label>
                    <input
                      type="text"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-4 fw-600">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                  />
                </div>

                <div>
                  <label className="flex-row gap-10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
                    />
                    <span className="fw-700">Active</span>
                  </label>
                </div>
              </div>
            ) : null}

            {activeTab === 'access' ? (
              <div className="flex-col gap-16">

                {/* RBAC role summary */}
                    <div className="rounded-8" style={{ padding: '12px 14px', border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                  <div className="fs-12 text-muted mb-8 fw-700">
                    Huidige TeamReel rollen
                  </div>
                  <div className="flex-row gap-8 flex-wrap">
                    {orgMembershipId && orgRole === 'admin' && <RbacBadge label="Land Admin" />}
                    {selectedClubKey && clubMembershipId && <RbacBadge label={getRbacLabel(clubAccessRole, false)} />}
                    {selectedTeamKey && teamMembershipId && <RbacBadge label={getRbacLabel(teamAccessRole, true)} />}
                    {!orgMembershipId && !clubMembershipId && !teamMembershipId && (
                      <span className="fs-12 text-muted">
                        Geen actieve rollen gevonden. Selecteer een club of team hieronder.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="fw-800" style={{ marginBottom: '6px' }}>Federation settings</div>
                  {organisationSlug ? (
                    <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                      <div className="flex-row gap-12 flex-wrap">
                        <div style={{ flex: '1 1 260px' }}>
                          <div className="fs-12 text-muted mb-4">Federation</div>
                          <div className="fw-800">{String(organisationSlug)}</div>
                        </div>

                        {orgMembershipId ? (
                          <div style={{ flex: '1 1 220px' }}>
                            <label className="block fw-700" style={{ marginBottom: '6px' }}>Org role</label>
                            <div className="flex-row gap-10 flex-wrap">
                              <select
                                value={orgRole}
                                onChange={(e) => setOrgRole(e.target.value as any)}
                                style={{ flex: '1 1 140px', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                                disabled={saving}
                              >
                                <option value="member">member</option>
                                <option value="admin">admin → Land Admin</option>
                              </select>
                              {orgRole === 'admin' && <RbacBadge label="Land Admin" />}
                            </div>
                          </div>
                        ) : (
                          <div style={{ flex: '1 1 360px' }}>
                            <div className="fs-12 text-muted" style={{ marginBottom: '6px' }}>
                              This user is not a direct member of this federation.
                            </div>
                            <div className="flex-row gap-10 flex-wrap">
                              <select
                                value={inviteOrgRole}
                                onChange={(e) => setInviteOrgRole(e.target.value as any)}
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                                disabled={addingToOrg || saving}
                              >
                                <option value="member">member</option>
                                <option value="admin">admin</option>
                              </select>
                              <button
                                type="button"
                                disabled={addingToOrg || saving}
                                onClick={async () => {
                                  try {
                                    await linkToOrganisation();
                                  } catch (e) {
                                    setExtraError(e instanceof Error ? e.message : 'Failed to add to federation');
                                  }
                                }}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #007bff',
                                  backgroundColor: '#007bff',
                                  color: '#fff',
                                  cursor: addingToOrg || saving ? 'not-allowed' : 'pointer',
                                  fontWeight: 800,
                                }}
                              >
                                {addingToOrg ? 'Adding…' : 'Add to federation'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted fs-12">
                      Tip: open this modal from a federation context to edit federation membership.
                    </div>
                  )}
                </div>

                <div className="border-top" style={{ paddingTop: '12px' }}>
                  <div className="fw-800" style={{ marginBottom: '10px' }}>Club Settings</div>

                  <div style={{ marginBottom: '10px' }}>
                    <label className="block fw-700" style={{ marginBottom: '6px' }}>Choose a club</label>
                    <select
                      value={selectedClubKey}
                      onChange={(e) => setSelectedClubKey(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                    >
                      <option value="">(select)</option>
                      {availableProjects.filter(p => !p.isTeam).map((p) => (
                        <option key={p.key} value={p.key}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedClubKey && clubMembershipId ? (
                    <div className="mb-12">
                        <label className="block fw-700" style={{ marginBottom: '6px' }}>TeamReel rol</label>
                        <div className="flex-row gap-12 flex-wrap">
                          <select
                            value={clubAccessRole}
                            onChange={(e) => setClubAccessRole(e.target.value as any)}
                            style={{ flex: '1 1 200px', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                          >
                            <option value="admin">admin → Club Admin</option>
                            <option value="editor">editor → Club Admin</option>
                            <option value="viewer">viewer → Supporter</option>
                          </select>
                          <RbacBadge label={getRbacLabel(clubAccessRole, false)} />
                        </div>
                        <div className="fs-11" style={{ marginTop: '6px', color: 'var(--app-muted-text)' }}>
                          {ADMIN_LIKE_ROLES.has(clubAccessRole)
                            ? 'Club Admin — volledige toegang tot alle teams en content van deze club.'
                            : 'Supporter — kan content bekijken, geen bewerkrechten.'}
                        </div>
                    </div>
                  ) : selectedClubKey ? (
                    <div className="text-muted fs-12" style={{ marginBottom: '10px' }}>
                         Gebruiker is geen lid van deze club. Ga naar "Add to club/team" om toe te voegen.
                    </div>
                  ) : null}
                </div>

                 <div className="border-top" style={{ paddingTop: '12px' }}>
                  <div className="fw-800" style={{ marginBottom: '10px' }}>Team Settings</div>

                   <div style={{ marginBottom: '10px' }}>
                      <label className="block fw-700" style={{ marginBottom: '6px' }}>Choose a team</label>
                      <select
                        value={selectedTeamKey}
                        onChange={(e) => setSelectedTeamKey(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                      >
                        <option value="">(select)</option>
                        {availableProjects.filter(p => p.isTeam).filter(p => !selectedClubKey || p.parentKey === selectedClubKey).map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                       <div className="text-muted fs-12" style={{ marginTop: '6px' }}>
                        {selectedClubKey ? 'Showing teams for selected club.' : 'Select a club above to filter teams.'}
                      </div>
                    </div>

                  {selectedTeamKey && teamMembershipId ? (
                    <>
                      <div className="mb-12">
                        <label className="block fw-700" style={{ marginBottom: '6px' }}>TeamReel rol</label>
                        <div className="flex-row gap-12 flex-wrap">
                          <select
                            value={teamAccessRole}
                            onChange={(e) => setTeamAccessRole(e.target.value as any)}
                            style={{ flex: '1 1 200px', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                          >
                            <option value="admin">admin → Team Admin</option>
                            <option value="editor">editor → Team Admin</option>
                            <option value="viewer">viewer → Team Member</option>
                          </select>
                          <RbacBadge label={getRbacLabel(teamAccessRole, true)} />
                        </div>
                        <div className="fs-11" style={{ marginTop: '6px', color: 'var(--app-muted-text)' }}>
                          {ADMIN_LIKE_ROLES.has(teamAccessRole)
                            ? 'Team Admin — kan teamleden, content en wedstrijden beheren.'
                            : 'Team Member — kan eigen content uploaden en teamcontent bekijken.'}
                        </div>
                      </div>

                      <div>
                        <div className="fw-800" style={{ marginBottom: '6px' }}>Functional roles (team only)</div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '8px 12px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid var(--app-border)',
                            backgroundColor: 'var(--app-surface-2)',
                          }}
                        >
                          {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
                            const checked = functionalRoles.includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className="flex-row gap-8 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextChecked = e.currentTarget.checked;
                                    setFunctionalRoles((prev) => {
                                      const normalized = (Array.isArray(prev) ? prev : [])
                                        .map((r) => String(r || '').trim())
                                        .filter(Boolean);
                                      const set = new Set(normalized);
                                      if (nextChecked) set.add(opt.value);
                                      else set.delete(opt.value);
                                      return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                                    });
                                  }}
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : selectedTeamKey ? (
                    <div className="text-muted fs-12">
                        Gebruiker is geen lid van dit team. Ga naar "Add to club/team" om toe te voegen.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === 'link' ? (
              <div className="flex-col gap-12">
                <div className="fw-800">Add user to organisation</div>
                {!organisationSlug ? (
                  <div className="text-muted fs-12">
                    Open this from a federation context so we can list clubs/teams.
                  </div>
                ) : null}

                {orgProjectsError ? (
                  <div style={{ padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>
                    {orgProjectsError}
                  </div>
                ) : null}

                {/* 1. Federation Section */}
                {!orgMembershipId ? (
                    <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                        <div style={{marginBottom: '10px'}} className="fw-800">Add to Federation</div>
                        <div className="flex-row gap-10 flex-wrap">
                             <div style={{ flex: '1 1 auto' }}>
                                <label className="block fw-700" style={{ marginBottom: '6px' }}>Role</label>
                                <select
                                value={inviteOrgRole}
                                onChange={(e) => setInviteOrgRole(e.target.value as any)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                                disabled={addingToOrg || saving}
                                >
                                <option value="member">member</option>
                                <option value="admin">admin</option>
                                </select>
                             </div>
                             <div style={{ flex: '0 0 auto', marginTop: '22px' }}>
                                <button
                                type="button"
                                disabled={addingToOrg || saving}
                                onClick={async () => {
                                    try {
                                    await linkToOrganisation();
                                    } catch (e) {
                                    setExtraError(e instanceof Error ? e.message : 'Failed to add to federation');
                                    }
                                }}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #007bff',
                                    backgroundColor: '#007bff',
                                    color: '#fff',
                                    cursor: addingToOrg || saving ? 'not-allowed' : 'pointer',
                                    fontWeight: 800,
                                }}
                                >
                                {addingToOrg ? 'Adding…' : 'Add to Federation'}
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '10px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'rgba(40, 167, 69, 0.1)', color: 'var(--app-text)' }}>
                         <div className="fs-12 fw-700">✓ Member of {organisationSlug}</div>
                    </div>
                )}

                {/* 2. Project Section */}
                <div className="p-12 rounded-8" style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface-2)' }}>
                   <div style={{marginBottom: '10px'}} className="fw-800">Add to Club / Team</div>

                   <div style={{marginBottom: '10px'}}>
                      <label className="block fw-700" style={{ marginBottom: '6px' }}>1. Select Club</label>
                      <select
                        value={linkClubKey}
                        onChange={(e) => {
                            setLinkClubKey(e.target.value);
                            // Reset team when club changes
                            setLinkTeamKey('');
                        }}
                        disabled={orgProjectsLoading || !organisationSlug || addingToProject}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                      >
                        <option value="">(Select Club)</option>
                        {orgProjects.filter(p => !p.isTeam).map((p) => (
                           <option key={p.key} value={p.key}>{p.name}</option>
                        ))}
                      </select>
                   </div>

                   <div style={{marginBottom: '10px'}}>
                      <label className="block fw-700" style={{ marginBottom: '6px' }}>2. Select Team (optional)</label>
                      <select
                        value={linkTeamKey}
                        onChange={(e) => setLinkTeamKey(e.target.value)}
                        disabled={!linkClubKey || addingToProject}
                         style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                      >
                        <option value="">(Select Team)</option>
                        {orgProjects
                            .filter(p => p.isTeam)
                            .filter(p => !linkClubKey || p.parentKey === linkClubKey)
                            .map((p) => (
                                <option key={p.key} value={p.key}>{p.name}</option>
                            ))}
                      </select>
                   </div>

                    <div className="flex-row gap-10 mt-16 flex-wrap">
                       <div style={{flex: '1 1 auto'}}>
                          <label className="block fw-700" style={{ marginBottom: '6px' }}>Initial Role</label>
                          <select
                            value={linkAccessRole}
                            onChange={(e) => setLinkAccessRole(e.target.value as any)}
                            disabled={addingToProject}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                          </select>
                       </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }} className="mt-8">
                    <button
                        type="button"
                        disabled={addingToProject || !linkClubKey}
                        onClick={() => performLinkToProject(linkClubKey, linkAccessRole, 'club')}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: '1px solid #007bff',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          cursor: addingToProject || !linkClubKey ? 'not-allowed' : 'pointer',
                          fontWeight: 800,
                        }}
                    >
                        {addingToProject && !linkTeamKey ? 'Adding...' : 'Add to Club'}
                    </button>

                    <button
                        type="button"
                        disabled={addingToProject || !linkTeamKey}
                        onClick={() => performLinkToProject(linkTeamKey, linkAccessRole, 'team')}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: '1px solid #17a2b8',
                          backgroundColor: '#17a2b8',
                          color: '#fff',
                          cursor: addingToProject || !linkTeamKey ? 'not-allowed' : 'pointer',
                          fontWeight: 800,
                        }}
                    >
                        {addingToProject && linkTeamKey ? 'Adding...' : 'Add to Team'}
                    </button>
                </div>
              </div>
            ) : null}

            {extraError ? (
              <div style={{ marginTop: '14px', padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>
                {extraError}
              </div>
            ) : null}
          </div>

          <div className="border-top" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || addingToOrg || addingToProject}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: saving || addingToOrg || addingToProject ? 'not-allowed' : 'pointer',
                fontWeight: 800,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || addingToOrg || addingToProject}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #007bff',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: saving || addingToOrg || addingToProject ? 'not-allowed' : 'pointer',
                opacity: saving || addingToOrg || addingToProject ? 0.7 : 1,
                fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
