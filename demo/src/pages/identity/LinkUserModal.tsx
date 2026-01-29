import React, { useEffect, useMemo, useState } from 'react';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';

type Organisation = {
  id: string | number;
  name: string;
  slug?: string;
};

type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string | number };
  parent_id?: string | number | null;
};

type User = {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  organisations?: Array<{ id: string | number; slug?: string; name?: string }>;
  projects?: Array<{ id?: string | number; slug?: string | null; membership_id?: string | number | null }>;
};

type PeriodOption = {
  id: string;
  name: string;
  parent_period?: any;
  data?: any;
};

export default function LinkUserModal({
  opened,
  onClose,
  user,
  organisations,
  clubs,
  teams,
  initialOrganisationSlugOrId,
  onSuccess,
}: {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  organisations: Organisation[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  initialOrganisationSlugOrId?: string;
  onSuccess: () => void;
}) {
  const [organisationId, setOrganisationId] = useState('');
  const [orgRole, setOrgRole] = useState<'admin' | 'member'>('member');

  const [clubId, setClubId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [accessRole, setAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);

  const [seasonId, setSeasonId] = useState('');
  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] ||
    '';

  const userDisplayName = useMemo(() => {
    if (!user) return 'User';
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return full || String(user.email || 'User');
  }, [user]);

  const orgById = useMemo(() => {
    const map = new Map<string, Organisation>();
    for (const o of organisations || []) {
      map.set(String(o.id), o);
    }
    return map;
  }, [organisations]);

  const initialOrgIdFromSlugOrId = useMemo(() => {
    const raw = String(initialOrganisationSlugOrId || '').trim();
    if (!raw) return '';
    // Try exact match on id
    const direct = orgById.get(raw);
    if (direct) return String(direct.id);
    // Try match on slug
    const found = (organisations || []).find((o) => String(o.slug || '').toLowerCase() === raw.toLowerCase());
    return found ? String(found.id) : '';
  }, [initialOrganisationSlugOrId, orgById, organisations]);

  const resolvedOrg = useMemo(() => {
    if (!organisationId) return null;
    return orgById.get(String(organisationId)) || null;
  }, [orgById, organisationId]);

  const getProjectOrgId = (p: ProjectOption): string => {
    const org = (p as any)?.organisation;
    if (!org) return '';
    if (typeof org === 'string' || typeof org === 'number') return String(org);
    return String((org as any)?.id || '');
  };

  const filteredClubs = useMemo(() => {
    const oid = String(organisationId || '').trim();
    const list = Array.isArray(clubs) ? clubs : [];
    if (!oid) return list;
    return list.filter((c) => String(getProjectOrgId(c)) === oid);
  }, [clubs, organisationId]);

  const filteredTeams = useMemo(() => {
    const oid = String(organisationId || '').trim();
    const cid = String(clubId || '').trim();
    const list = Array.isArray(teams) ? teams : [];
    return list.filter((t) => {
      if (oid && String(getProjectOrgId(t)) !== oid) return false;
      if (cid && String((t as any)?.parent_id || '') !== cid) return false;
      return true;
    });
  }, [clubId, organisationId, teams]);

  const existingOrgIds = useMemo(() => {
    const orgs = Array.isArray(user?.organisations) ? user?.organisations : [];
    return new Set(orgs.map((o: any) => String(o?.id ?? '')));
  }, [user]);

  const existingProjectIds = useMemo(() => {
    const projects = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
    return new Set(projects.map((p: any) => String(p?.id ?? p?.slug ?? '')).filter(Boolean));
  }, [user]);

  const projectMembershipIdByProjectId = useMemo(() => {
    const map = new Map<string, string>();
    const projects = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
    for (const p of projects) {
      const projectId = String(p?.id ?? '').trim();
      const membershipId = String(p?.membership_id ?? '').trim();
      if (projectId && membershipId) map.set(projectId, membershipId);
    }
    return map;
  }, [user]);

  const canSubmit = Boolean(user) && Boolean(organisationId || clubId || teamId);

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSuccessNote(null);
    setOrgRole('member');
    setAccessRole('viewer');
    setFunctionalRoles([]);
    setClubId('');
    setTeamId('');
    setSeasonId('');
    setSeasonOptions([]);
    setOrganisationId(initialOrgIdFromSlugOrId || '');
  }, [initialOrgIdFromSlugOrId, opened]);

  // Reset functional roles when switching teams.
  useEffect(() => {
    if (!opened) return;
    setFunctionalRoles([]);
  }, [opened, teamId]);

  // If a team is selected, auto-set the parent club if known.
  useEffect(() => {
    if (!opened) return;
    if (!teamId) return;
    const t = (teams || []).find((x) => String(x.id) === String(teamId));
    const parent = String((t as any)?.parent_id || '').trim();
    if (parent && !clubId) setClubId(parent);
  }, [clubId, opened, teamId, teams]);

  // Load season options for the selected team.
  useEffect(() => {
    if (!opened) return;
    const tid = String(teamId || '').trim();
    if (!tid) {
      setSeasonOptions([]);
      setSeasonId('');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const url = `${apiBaseUrl}/api/v1/periods/?page_size=250&project_id=${encodeURIComponent(tid)}&type=season`;
        const results = await fetchAllPages<PeriodOption>(
          url,
          { credentials: 'include' },
          { ttlMs: 15_000, cacheKey: `periods:seasons:link-user:${tid}`, maxPages: 10, maxItems: 2000 },
        );

        if (cancelled) return;
        const seasons = (results || []).filter((p: any) => !p?.parent_period);
        setSeasonOptions(seasons);
      } catch {
        if (cancelled) return;
        setSeasonOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, opened, teamId]);

  const createOrganisationMembership = async () => {
    if (!user) return;
    const org = resolvedOrg;
    if (!org) return;

    // Best-effort idempotency: if the user already has this org in the list response, skip.
    if (existingOrgIds.has(String(org.id))) return;

    const orgSlugOrId = String((org as any)?.slug || (org as any)?.id || '').trim();
    if (!orgSlugOrId) throw new Error('Organisation slug/id missing');

    const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/members/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        email: user.email,
        role: orgRole,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // If backend says "already exists", treat as success.
      if (/already|exists|duplicate/i.test(text)) return;
      throw new Error(text || 'Failed to assign user to federation');
    }
  };

  const createProjectMembership = async (projectId: string, periodId?: string) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;

    // Best-effort idempotency.
    // If a period is specified, we allow creating an additional membership scoped to that period.
    if (!periodId && existingProjectIds.has(pid)) return;

    const roleToSend = accessRole;
    const effectivePeriodId = String(periodId || '').trim() || undefined;

    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: Number(user.id),
        role: roleToSend,
        period_id: effectivePeriodId,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (/already|exists|duplicate/i.test(text)) return;
      throw new Error(text || 'Failed to assign user to project');
    }
  };

  const assignFunctionalRoles = async (projectId: string, roles: string[]) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;
    const cleaned = (Array.isArray(roles) ? roles : [])
      .map((r) => String(r || '').trim())
      .filter(Boolean);
    if (cleaned.length === 0) return;

    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/functional-roles/assign/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: Number(user.id),
        roles: cleaned,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to assign functional roles');
    }
  };

  const resolveOrgSlugOrIdForApi = (): string => {
    const org = resolvedOrg;
    const fromResolved = String((org as any)?.slug || (org as any)?.id || '').trim();
    if (fromResolved) return fromResolved;
    const fallback = String(initialOrganisationSlugOrId || '').trim();
    return fallback;
  };

  const findOrganisationMembershipId = async (): Promise<string> => {
    if (!user) throw new Error('User missing');
    const orgIdValue = String(organisationId || '').trim();
    if (!orgIdValue) throw new Error('Select a federation first');

    // Fast path: sometimes org entries already contain membership_id.
    const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    const direct = orgs.find((o: any) => String(o?.id ?? '') === orgIdValue);
    const directMembershipId = String(direct?.membership_id ?? '').trim();
    if (directMembershipId) return directMembershipId;

    const orgSlugOrId = resolveOrgSlugOrIdForApi();
    if (!orgSlugOrId) throw new Error('Federation slug/id missing');

    // Fallback: fetch org members and locate by email/id.
    const members = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/members/?page_size=500`,
      { credentials: 'include' },
      {
        ttlMs: 5_000,
        cacheKey: `org:${orgSlugOrId}:members:lookup:${String(user.id)}`,
        maxPages: 50,
        maxItems: 10_000,
      },
    );

    const email = String(user.email || '').trim().toLowerCase();
    const uid = String(user.id);
    const found = (members || []).find((m: any) => {
      const memberId = String(m?.id ?? '').trim();
      if (!memberId) return false;
      const mu = m?.user || m;
      const mid = String(mu?.id ?? '').trim();
      const memail = String(mu?.email ?? m?.email ?? '').trim().toLowerCase();
      return (uid && mid && uid === mid) || (email && memail && email === memail);
    });
    const membershipId = String(found?.id ?? '').trim();
    if (!membershipId) throw new Error('Could not find federation membership for this user');
    return membershipId;
  };

  const unlinkOrganisationMembership = async () => {
    if (!user) return;
    const orgSlugOrId = resolveOrgSlugOrIdForApi();
    if (!orgSlugOrId) throw new Error('Federation slug/id missing');

    const membershipId = await findOrganisationMembershipId();

    const res = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to unlink user from federation');
    }
  };

  const unlinkProjectMembership = async (projectId: string) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) throw new Error('Select a club/team first');

    const findProjectMembershipId = async (): Promise<string> => {
      const direct = String(projectMembershipIdByProjectId.get(pid) || '').trim();
      if (direct) return direct;

      const members = await fetchAllPages<any>(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/?page_size=500`,
        { credentials: 'include' },
        {
          ttlMs: 5_000,
          cacheKey: `project:${pid}:members:lookup:${String(user.id)}`,
          maxPages: 50,
          maxItems: 10_000,
        },
      );

      const email = String(user.email || '').trim().toLowerCase();
      const uid = String(user.id);
      const found = (members || []).find((m: any) => {
        const memberId = String(m?.id ?? '').trim();
        if (!memberId) return false;
        const mu = m?.user || m;
        const mid = String(mu?.id ?? '').trim();
        const memail = String(mu?.email ?? m?.email ?? '').trim().toLowerCase();
        return (uid && mid && uid === mid) || (email && memail && email === memail);
      });

      const membershipId = String(found?.id ?? '').trim();
      if (!membershipId) throw new Error('Could not find project membership for this user');
      return membershipId;
    };

    const membershipId = await findProjectMembershipId();

    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to unlink user from project');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccessNote(null);

    try {
      // Always try to create org membership first (if selected).
      if (organisationId) {
        await createOrganisationMembership();
      }

      // Club/team memberships (optional).
      if (clubId) {
        await createProjectMembership(String(clubId));
      }
      if (teamId) {
        await createProjectMembership(String(teamId), seasonId || undefined);
        await assignFunctionalRoles(String(teamId), functionalRoles);
      }

      setSuccessNote('Linked successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link user');
    } finally {
      setSaving(false);
    }
  };

  if (!opened) return null;

  const accessRoleOptions: Array<{ value: 'viewer' | 'editor' | 'admin'; label: string }> = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'editor', label: 'Editor' },
    { value: 'admin', label: 'Admin' },
  ];

  const functionalRoleOptions: Array<{ value: string; label: string }> = [
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'coach', label: 'Coach' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'manager', label: 'Manager' },
    { value: 'supporter', label: 'Supporter' },
  ];

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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '560px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>
          Link {userDisplayName}
        </h2>
        <div style={{ marginBottom: '16px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
          Link this user to a Federation (organisation) and optionally to a Club/Team.
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  color: '#dc3545',
                  border: '1px solid rgba(220, 53, 69, 0.2)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}
            {successNote && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(40, 167, 69, 0.1)',
                  color: '#1e7e34',
                  border: '1px solid rgba(40, 167, 69, 0.2)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                {successNote}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                  Federation
                </label>
                <select
                  value={organisationId}
                  onChange={(e) => setOrganisationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">(optional) Select Federation…</option>
                  {(organisations || []).map((org) => (
                    <option
                      key={String(org.id)}
                      value={String(org.id)}
                      disabled={existingOrgIds.has(String(org.id))}
                    >
                      {org.name}{existingOrgIds.has(String(org.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {organisationId && existingOrgIds.has(String(organisationId)) && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (!window.confirm('Unlink this user from the selected federation?')) return;
                        setSaving(true);
                        setError(null);
                        setSuccessNote(null);
                        try {
                          await unlinkOrganisationMembership();
                          setSuccessNote('Unlinked federation successfully.');
                          onSuccess();
                          onClose();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to unlink federation');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #dc3545',
                        backgroundColor: 'var(--app-surface)',
                        color: '#dc3545',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Unlink Federation
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                  Federation Role
                </label>
                <select
                  value={orgRole}
                  onChange={(e) => setOrgRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                  disabled={!organisationId}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                  Club
                </label>
                <select
                  value={clubId}
                  onChange={(e) => {
                    setClubId(e.target.value);
                    setTeamId('');
                    setSeasonId('');
                    setSeasonOptions([]);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">(optional) Select Club…</option>
                  {filteredClubs.map((c) => (
                    <option
                      key={String(c.id)}
                      value={String(c.id)}
                    >
                      {c.name}{existingProjectIds.has(String(c.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {clubId && existingProjectIds.has(String(clubId)) && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (!window.confirm('Unlink this user from the selected club?')) return;
                        setSaving(true);
                        setError(null);
                        setSuccessNote(null);
                        try {
                          await unlinkProjectMembership(String(clubId));
                          setSuccessNote('Unlinked club successfully.');
                          onSuccess();
                          onClose();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to unlink club');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #dc3545',
                        backgroundColor: 'var(--app-surface)',
                        color: '#dc3545',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Unlink Club
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setSeasonId('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">(optional) Select Team…</option>
                  {filteredTeams.map((t) => (
                    <option
                      key={String(t.id)}
                      value={String(t.id)}
                    >
                      {t.name}{existingProjectIds.has(String(t.id)) ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
                {teamId && existingProjectIds.has(String(teamId)) && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (!window.confirm('Unlink this user from the selected team?')) return;
                        setSaving(true);
                        setError(null);
                        setSuccessNote(null);
                        try {
                          await unlinkProjectMembership(String(teamId));
                          setSuccessNote('Unlinked team successfully.');
                          onSuccess();
                          onClose();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to unlink team');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #dc3545',
                        backgroundColor: 'var(--app-surface)',
                        color: '#dc3545',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Unlink Team
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                Access Role (permissions)
              </label>
              <select
                value={accessRole}
                onChange={(e) => setAccessRole((e.target.value as any) || 'viewer')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  fontSize: '14px',
                }}
                disabled={!clubId && !teamId}
              >
                {accessRoleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px', lineHeight: 1.35 }}>
                This controls backend access for the Club/Team (viewer/editor/admin). Team-level functional roles are managed
                separately and can be multi-valued.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                Functional Roles (team only)
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px 12px',
                  padding: '10px',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--app-surface)',
                  opacity: teamId ? 1 : 0.6,
                }}
              >
                {functionalRoleOptions.map((opt) => {
                  const checked = functionalRoles.includes(opt.value);
                  return (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        disabled={!teamId}
                        checked={checked}
                        onChange={(e) => {
                          const nextChecked = e.target.checked;
                          setFunctionalRoles((prev) => {
                            const set = new Set(prev);
                            if (nextChecked) set.add(opt.value);
                            else set.delete(opt.value);
                            return Array.from(set);
                          });
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
              <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px', lineHeight: 1.35 }}>
                Tip: Team Admins automatically show as “Coach” in the API.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                Season (optional)
              </label>
              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  fontSize: '14px',
                }}
                disabled={!teamId || seasonOptions.length === 0}
              >
                <option value="">{!teamId ? 'Select a team first…' : '(optional) Select Season…'}</option>
                {seasonOptions.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px', lineHeight: 1.35 }}>
                If set, the team membership will be scoped to this season via `period_id`.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: saving || !canSubmit ? '#cccccc' : '#0066cc',
                  color: 'white',
                  cursor: saving || !canSubmit ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: saving || !canSubmit ? 0.65 : 1,
                }}
              >
                {saving ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
