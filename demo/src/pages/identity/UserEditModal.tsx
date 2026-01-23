import { useMemo, useState, useEffect, type FormEvent } from 'react';

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
};

type OrgProjectChoice = {
  key: string;
  name: string;
  parentName?: string | null;
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

  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('');
  const [projectMembershipId, setProjectMembershipId] = useState<string | null>(null);
  const [projectAccessRole, setProjectAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [initialFunctionalRoles, setInitialFunctionalRoles] = useState<string[]>([]);

  const [linkProjectKey, setLinkProjectKey] = useState<string>('');
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

    // Create a map of org projects to look up hierarchy info (isTeam) if available.
    // Note: orgProjects might be empty initially until loaded, so this enrichment improves as data loads.
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

        // Strategy 1: Check if the project object itself hints at parent/team (unlikely in simple list, but possible)
        if (p?.parent_id || p?.parent || p?.is_team || p?.isTeam) {
            isTeam = true;
        }

        // Strategy 2: Check against loaded orgProjects (authoritative source for hierarchy)
        if (!isTeam) {
            const match = orgProjectMap.get(key);
            if (match && match.isTeam) isTeam = true;
        }

        // Strategy 3: Naming heuristic (matches "Team", digits at end, or contains "-")
        if (!isTeam) {
             // If name matches "Team X" or "O19-1" or ends in digits like "Feyenoord 1" (and not just "Feyenoord")
             // But "Feyenoord 1" implies team. "Feyenoord" implies club.
             // Heuristic: If it has a dash OR explicitly says "Team" OR ends in a digit-based suffix (like "-1", " 1", " U19")
             if (
                 name.toLowerCase().includes('team') ||
                 name.includes('-') ||
                 /\s\d+$/.test(name) ||  // "Feyenoord 1"
                 /\sO\d+/i.test(name) || // "Feyenoord O19"
                 /\sU\d+/i.test(name)    // "Feyenoord U19"
             ) {
                 isTeam = true;
             }
        }

        return {
          key,
          name,
          isTeam
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

  useEffect(() => {
    if (user) {
      setActiveTab(scopeProjectKey ? 'access' : 'personal');
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_active: user.is_active,
        role: user.role
      });

      // Default selected project scope
      const forced = String(scopeProjectKey || '').trim();
      if (forced) setSelectedProjectKey(forced);
      else setSelectedProjectKey(availableProjects[0]?.key || '');

      // Org membership role defaults
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
    // Load club/team options scoped to the current federation (organisation) when available.
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
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to load projects (${res.status})`);
        }

        const raw = await res.json().catch(() => null);
        const list = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
        const choices: OrgProjectChoice[] = (Array.isArray(list) ? list : [])
          .map((p: any) => {
            const key = String(p?.slug || p?.id || '').trim();
            const name = String(p?.name || p?.title || p?.slug || p?.id || '').trim();
            const parentName = String(p?.parent_name || p?.parentName || '').trim() || null;
            const parentId = String(p?.parent_id || p?.parentId || '').trim();
            return {
              key,
              name,
              parentName,
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

  useEffect(() => {
    // Fetch project membership for selected project scope so we can edit access + functional roles
    const run = async () => {
      if (!opened || !user) return;
      const projectKey = String(selectedProjectKey || '').trim();
      if (!projectKey) {
        setProjectMembershipId(null);
        setProjectAccessRole('viewer');
        setFunctionalRoles([]);
        setInitialFunctionalRoles([]);
        return;
      }

      try {
        let found = null;

        // Strategy 1: Try to look up membership ID from the user object locally.
        // This avoids pagination limits (500) on the list endpoint if the project is large.
        const userProjects = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
        const localProject = userProjects.find((p: any) =>
          String(p?.slug || p?.id || '').trim().toLowerCase() === String(projectKey).toLowerCase()
        );
        const knownMembershipId = localProject?.membership_id ? String(localProject.membership_id).trim() : null;

        if (knownMembershipId) {
          try {
            const directRes = await fetch(
              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(knownMembershipId)}/`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
              }
            );
            if (directRes.ok) {
              found = await directRes.json();
            }
          } catch (err) {
            console.warn('Direct membership fetch failed, falling back to list search:', err);
          }
        }

        // Strategy 2: List search (fallback)
        if (!found) {
          const res = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/?page_size=500`,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
              },
              credentials: 'include',
            }
          );
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `Failed to load project membership (${res.status})`);
          }

          const raw = await res.json().catch(() => null);
          const members = (raw as any)?.data?.results || (raw as any)?.results || (raw as any)?.data || [];
          const uid = String((user as any)?.id || '').trim();
          const matches = Array.isArray(members)
            ? members.filter((m: any) => String(m?.user?.id ?? m?.user_id ?? '').trim() === uid)
            : [];

          // Prefer the base (non-period) membership when multiple exist.
          const isBaseMembership = (m: any) => !String(m?.period_id ?? m?.period ?? '').trim();
          found = matches.find(isBaseMembership) || matches[0] || null;
        }

        const membershipId = String(found?.id || knownMembershipId || '').trim();
        setProjectMembershipId(membershipId || null);

        const roleRaw = String(found?.role || 'viewer').trim().toLowerCase();
        if (roleRaw === 'admin' || roleRaw === 'editor' || roleRaw === 'viewer') {
          setProjectAccessRole(roleRaw as any);
        } else {
          setProjectAccessRole('viewer');
        }

        const fr = found ? readFunctionalRolesFromMembership(found) : [];
        setFunctionalRoles(fr);
        setInitialFunctionalRoles(fr);
      } catch (e) {
        setProjectMembershipId(null);
        setProjectAccessRole('viewer');
        setFunctionalRoles([]);
        setInitialFunctionalRoles([]);
        setExtraError(e instanceof Error ? e.message : 'Failed to load membership');
      }
    };

    void run();
  }, [opened, user, selectedProjectKey, apiBaseUrl]);

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

  const updateProjectRolesIfNeeded = async (): Promise<void> => {
    const projectKey = String(selectedProjectKey || '').trim();
    if (!projectKey) return;
    if (!projectMembershipId) throw new Error('User is not a member of this project');

    // 1) Update access role
    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(projectMembershipId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ role: projectAccessRole }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update project access role');
    }

    // 2) Update functional roles via diff
    const prev = new Set((Array.isArray(initialFunctionalRoles) ? initialFunctionalRoles : []).map((r) => String(r || '').trim()).filter(Boolean));
    const next = new Set((Array.isArray(functionalRoles) ? functionalRoles : []).map((r) => String(r || '').trim()).filter(Boolean));
    const toAdd = Array.from(next).filter((r) => !prev.has(r));
    const toRemove = Array.from(prev).filter((r) => !next.has(r));

    const uid = Number((user as any)?.id);
    if (!uid) throw new Error('Missing user id');

    if (toAdd.length) {
      const assignRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/functional-roles/assign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: uid, roles: toAdd }),
        }
      );
      if (!assignRes.ok) {
        const text = await assignRes.text().catch(() => '');
        throw new Error(text || 'Failed to assign functional roles');
      }
    }

    if (toRemove.length) {
      const unassignRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectKey)}/functional-roles/unassign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: uid, roles: toRemove }),
        }
      );
      if (!unassignRes.ok) {
        const text = await unassignRes.text().catch(() => '');
        throw new Error(text || 'Failed to unassign functional roles');
      }
    }

    // Update baseline so subsequent edits diff correctly
    const nextSorted = Array.from(next.values()).sort((a, b) => a.localeCompare(b));
    setInitialFunctionalRoles(nextSorted);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setExtraError(null);
    try {
      await onSave(formData);

      // Optional: org role edit
      await updateOrgRoleIfNeeded();

      // Optional: project roles edit
      if (String(selectedProjectKey || '').trim()) {
        await updateProjectRolesIfNeeded();
      }

      // Refresh parent data only after *all* updates are done.
      await onSaved?.();

      onClose();
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

  const linkToProject = async (): Promise<void> => {
    if (!user) return;
    const projectKey = String(linkProjectKey || '').trim();
    if (!projectKey) throw new Error('Select a club/team first');

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
          body: JSON.stringify({ user_id: Number((user as any)?.id), role: linkAccessRole }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to link user to club/team');
      }

      // Jump to access tab and load the newly linked membership for editing.
      setSelectedProjectKey(projectKey);
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

                  {scopeProjectKey ? (
                    <div style={{ marginBottom: '10px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                      Scope: {String(scopeProjectKey)}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Choose a club</label>
                      <select
                        value={selectedProjectKey && !availableProjects.find(p => p.key === selectedProjectKey && p.isTeam)?.isTeam ? selectedProjectKey : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) setSelectedProjectKey(val);
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                      >
                        <option value="">(select)</option>
                        {availableProjects.filter(p => !p.isTeam).map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                       <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                        Missing a club? Use the “Add to club/team” tab.
                      </div>
                    </div>
                  )}

                  {selectedProjectKey && !availableProjects.find(p => p.key === selectedProjectKey && p.isTeam)?.isTeam ? (
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Access role</label>
                        <select
                          value={projectAccessRole}
                          onChange={(e) => setProjectAccessRole(e.target.value as any)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                        {!projectMembershipId ? (
                          <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                            User is not (directly) a member of this club.
                          </div>
                        ) : null}
                      </div>

                  ) : null}
                </div>

                 <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '12px' }}>
                  <div style={{ fontWeight: 800, marginBottom: '10px' }}>Team Settings</div>

                   {scopeProjectKey ? (
                    <div style={{ marginBottom: '10px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                      Scope: {String(scopeProjectKey)}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Choose a team</label>
                      <select
                        value={selectedProjectKey && availableProjects.find(p => p.key === selectedProjectKey && p.isTeam)?.isTeam ? selectedProjectKey : ''}
                        onChange={(e) => {
                             const val = e.target.value;
                             if (val) setSelectedProjectKey(val);
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                      >
                        <option value="">(select)</option>
                        {availableProjects.filter(p => p.isTeam).map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                       <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                        Missing a team? Use the “Add to club/team” tab.
                      </div>
                    </div>
                  )}


                  {selectedProjectKey && availableProjects.find(p => p.key === selectedProjectKey && p.isTeam)?.isTeam ? (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Access role</label>
                        <select
                          value={projectAccessRole}
                          onChange={(e) => setProjectAccessRole(e.target.value as any)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                        {!projectMembershipId ? (
                          <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                            User is not (directly) a member of this team.
                          </div>
                        ) : null}
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

                        <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px', lineHeight: 1.35 }}>
                          Note: Team Admins automatically show as “Coach” in the API.
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                      Select a club/team to edit access + functional roles.
                    </div>
                  )}
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
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Club / Team</label>
                  <select
                    value={linkProjectKey}
                    onChange={(e) => setLinkProjectKey(e.target.value)}
                    disabled={orgProjectsLoading || !organisationSlug || addingToProject}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
                  >
                    <option value="">(select)</option>
                    {orgProjects.map((p) => {
                      const label = p.isTeam && p.parentName ? `${p.parentName} → ${p.name}` : p.name;
                      return (
                        <option key={p.key} value={p.key}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                    Pick a Club (parent) or Team (child). After linking, you can edit access + functional roles in the “Access & roles” tab.
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 220px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Initial access role</label>
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

                    <div style={{ flex: '0 0 auto', marginTop: '22px' }}>
                      <button
                        type="button"
                        disabled={addingToProject || !linkProjectKey}
                        onClick={async () => {
                          try {
                            await linkToProject();
                          } catch (e) {
                            setExtraError(e instanceof Error ? e.message : 'Failed to link to club/team');
                          }
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid #007bff',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          cursor: addingToProject || !linkProjectKey ? 'not-allowed' : 'pointer',
                          fontWeight: 800,
                        }}
                      >
                        {addingToProject ? 'Adding…' : 'Add to club/team'}
                      </button>
                    </div>
                  </div>
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
