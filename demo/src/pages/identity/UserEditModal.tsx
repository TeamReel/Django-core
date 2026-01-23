import { useMemo, useState, useEffect, useRef, type FormEvent } from 'react';

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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

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

  const availableProjects = useMemo<ProjectChoice[]>(() => {
    const list = Array.isArray((user as any)?.projects) ? (user as any).projects : [];

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
        const choices: OrgProjectChoice[] = (Array.isArray(list) ? list : [])
          .map((p: any) => {
            const key = String(p?.slug || p?.id || '').trim();
            const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();
            const parentName = String(p?.parent_name || p?.parentName || '').trim() || null;
            const parentId = String(p?.parent_id || p?.parentId || '').trim();
            // Try to resolve parentKey if parentId is not just an ID but maybe a slug?
            // The API usually returns parent_id as UUID. But often consistent with key if using IDs.
            // If the project key is a slug, parent_id might not match parentKey (slug).
            // However, for filtering, we usually compare against IDs if keys are IDs.
            // But here our keys are slugs usually...
            // Let's assume parentId is the ID. Ideally we'd want parentSlug.
            // If parentSlug is not available, we might struggle.
            // But let's check validation.py or serializer.
            // In Django REST, often Nested Parent is just ID.
            // If we use Slugs for keys, we need Parent Slug.
            const parentKey = String(p?.parent_slug || p?.parentSlug || parentId || '').trim() || undefined;

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
                 const matches = members.filter((m: any) => String(m?.user?.id ?? m?.user_id ?? '').trim() === uid);
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--app-surface)',
        borderRadius: '8px',
        width: '860px',
        maxWidth: '90%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Edit user</div>
              <div style={{ marginTop: '2px', fontSize: '12px', color: 'var(--app-muted-text)' }}>{user.email}</div>
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: '18px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            {activeTab === 'personal' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontWeight: 800, marginBottom: '2px' }}>Personal settings</div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>First name</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Last name</label>
                    <input
                      type="text"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
                    />
                    <span style={{ fontWeight: 700 }}>Active</span>
                  </label>
                </div>
              </div>
            ) : null}

            {activeTab === 'access' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: '6px' }}>Federation settings</div>
                  {organisationSlug ? (
                    <div style={{ padding: '12px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'var(--app-surface-2)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 260px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Federation</div>
                          <div style={{ fontWeight: 800 }}>{String(organisationSlug)}</div>
                        </div>

                        {orgMembershipId ? (
                          <div style={{ flex: '1 1 220px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Org role</label>
                            <select
                              value={orgRole}
                              onChange={(e) => setOrgRole(e.target.value as any)}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                              disabled={saving}
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                        ) : (
                          <div style={{ flex: '1 1 360px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '6px' }}>
                              This user is not a direct member of this federation.
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                      Tip: open this modal from a federation context to edit federation membership.
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '12px' }}>
                  <div style={{ fontWeight: 800, marginBottom: '10px' }}>Club Settings</div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Choose a club</label>
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
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Access role</label>
                        <select
                          value={clubAccessRole}
                          onChange={(e) => setClubAccessRole(e.target.value as any)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                    </div>
                  ) : selectedClubKey ? (
                    <div style={{ marginBottom: '10px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                         User is not a member of this club. Go to "Add to club/team" tabs to add them.
                    </div>
                  ) : null}
                </div>

                 <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '12px' }}>
                  <div style={{ fontWeight: 800, marginBottom: '10px' }}>Team Settings</div>

                   <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Choose a team</label>
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
                       <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                        {selectedClubKey ? 'Showing teams for selected club.' : 'Select a club above to filter teams.'}
                      </div>
                    </div>

                  {selectedTeamKey && teamMembershipId ? (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Access role</label>
                        <select
                          value={teamAccessRole}
                          onChange={(e) => setTeamAccessRole(e.target.value as any)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, marginBottom: '6px' }}>Functional roles (team only)</div>
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
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
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
                    <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                        User is not a member of this team.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === 'link' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontWeight: 800 }}>Add user to a club or team</div>
                {!organisationSlug ? (
                  <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                    Open this from a federation context so we can list clubs/teams.
                  </div>
                ) : null}

                {orgProjectsError ? (
                  <div style={{ padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>
                    {orgProjectsError}
                  </div>
                ) : null}

                <div style={{ padding: '12px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'var(--app-surface-2)' }}>
                   <div style={{marginBottom: '10px', fontWeight: 800}}>Select Scope</div>

                   <div style={{marginBottom: '10px'}}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>1. Select Club</label>
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
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>2. Select Team (optional)</label>
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

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                       <div style={{flex: '1 1 auto'}}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Initial Role</label>
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

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
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

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--app-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
