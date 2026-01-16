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
  organisationSlug?: string;
  scopeProjectKey?: string;
}

type ProjectChoice = {
  key: string;
  name: string;
};

export default function UserEditModal({
  opened,
  onClose,
  user,
  onSave,
  organisationSlug,
  scopeProjectKey,
}: UserEditModalProps) {
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
    return list
      .map((p: any) => ({
        key: String(p?.slug || p?.id || '').trim(),
        name: String(p?.name || p?.title || p?.slug || p?.id || '').trim(),
      }))
      .filter((p: any) => Boolean(p.key));
  }, [user]);

  const readFunctionalRolesFromMembership = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  useEffect(() => {
    if (user) {
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
        const found = Array.isArray(members)
          ? members.find((m: any) => String(m?.user?.id ?? m?.user_id ?? '').trim() === uid)
          : null;

        const membershipId = String(found?.id || '').trim();
        setProjectMembershipId(membershipId || null);

        const roleRaw = String(found?.role || 'viewer').trim().toLowerCase();
        if (roleRaw === 'admin' || roleRaw === 'editor' || roleRaw === 'viewer') {
          setProjectAccessRole(roleRaw as any);
        } else {
          setProjectAccessRole('viewer');
        }

        const fr = readFunctionalRolesFromMembership(found);
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

    run();
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

      onClose();
    } catch (error) {
      console.error(error);
      setExtraError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!opened || !user) return null;

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
        padding: '24px',
        borderRadius: '8px',
        width: '500px',
        maxWidth: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>Edit User</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active || false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
                />
                <span style={{ fontWeight: 500 }}>Active</span>
              </label>
            </div>

            {organisationSlug && orgMembershipId ? (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Organisation role</label>
                <select
                  value={orgRole}
                  onChange={(e) => setOrgRole(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            ) : null}

            <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '12px' }}>
              <div style={{ fontWeight: 700, marginBottom: '10px' }}>Project / Team roles</div>

              {scopeProjectKey ? (
                <div style={{ marginBottom: '10px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                  Scope: {String(scopeProjectKey)}
                </div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Project</label>
                  <select
                    value={selectedProjectKey}
                    onChange={(e) => setSelectedProjectKey(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">(none)</option>
                    {availableProjects.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedProjectKey ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Access role</label>
                    <select
                      value={projectAccessRole}
                      onChange={(e) => setProjectAccessRole(e.target.value as any)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                    {!projectMembershipId ? (
                      <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                        User is not (directly) a member of this project.
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Functional roles</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '8px 12px',
                        padding: '10px',
                        borderRadius: '6px',
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
              ) : (
                <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                  Select a club/team filter (or a project) to edit access + functional roles.
                </div>
              )}
            </div>

            {extraError ? (
              <div style={{ padding: '10px', border: '1px solid rgba(220, 53, 69, 0.3)', background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545', borderRadius: '6px' }}>
                {extraError}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
