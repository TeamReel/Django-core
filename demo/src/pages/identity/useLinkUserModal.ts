import { useEffect, useMemo, useState } from 'react';
import { logger } from '@/utils/logger';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { api, ApiError } from '@/api';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { OrgMembershipListItem } from '@/types/api/organisation';
import type { ProjectMembership } from '@/types/api/project';
import type { Organisation, ProjectOption, User, PeriodOption, LinkUserModalProps } from './linkUserModalTypes';

type HookProps = Pick<LinkUserModalProps, 'opened' | 'user' | 'organisations' | 'clubs' | 'teams' | 'initialOrganisationSlugOrId' | 'onSuccess' | 'onClose'>;

export function useLinkUserModal({
  opened,
  user,
  organisations,
  clubs,
  teams,
  initialOrganisationSlugOrId,
  onSuccess,
  onClose,
}: HookProps) {
  const confirm = useConfirm();
  // ── state ──────────────────────────────────────────────────
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

  const apiBaseUrl = getApiV1BaseUrl();

  // ── derived / memos ────────────────────────────────────────
  const userDisplayName = useMemo(() => {
    if (!user) return 'User';
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return full || String(user.email || 'User');
  }, [user]);

  const orgById = useMemo(() => {
    const map = new Map<string, Organisation>();
    for (const o of organisations || []) map.set(String(o.id), o);
    return map;
  }, [organisations]);

  const initialOrgIdFromSlugOrId = useMemo(() => {
    const raw = String(initialOrganisationSlugOrId || '').trim();
    if (!raw) return '';
    const direct = orgById.get(raw);
    if (direct) return String(direct.id);
    const found = (organisations || []).find((o) => String(o.slug || '').toLowerCase() === raw.toLowerCase());
    return found ? String(found.id) : '';
  }, [initialOrganisationSlugOrId, orgById, organisations]);

  const resolvedOrg = useMemo(() => {
    if (!organisationId) return null;
    return orgById.get(String(organisationId)) || null;
  }, [orgById, organisationId]);

  const getProjectOrgId = (p: ProjectOption): string => {
    const org = p?.organisation;
    if (!org) return '';
    if (typeof org === 'string' || typeof org === 'number') return String(org);
    return String(org.id || '');
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
      if (cid && String(t?.parent_id || '') !== cid) return false;
      return true;
    });
  }, [clubId, organisationId, teams]);

  const existingOrgIds = useMemo(() => {
    const orgs = Array.isArray(user?.organisations) ? user?.organisations : [];
    return new Set(orgs.map((o) => String(o?.id ?? '')));
  }, [user]);

  const existingProjectIds = useMemo(() => {
    const projects = Array.isArray(user?.projects) ? user.projects : [];
    return new Set(projects.map((p) => String(p?.id ?? p?.slug ?? '')).filter(Boolean));
  }, [user]);

  const projectMembershipIdByProjectId = useMemo(() => {
    const map = new Map<string, string>();
    const projects = Array.isArray(user?.projects) ? user.projects : [];
    for (const p of projects) {
      const projectId = String(p?.id ?? '').trim();
      const membershipId = String(p?.membership_id ?? '').trim();
      if (projectId && membershipId) map.set(projectId, membershipId);
    }
    return map;
  }, [user]);

  const canSubmit = Boolean(user) && Boolean(organisationId || clubId || teamId);

  // ── effects ────────────────────────────────────────────────
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

  useEffect(() => {
    if (!opened) return;
    setFunctionalRoles([]);
  }, [opened, teamId]);

  useEffect(() => {
    if (!opened) return;
    if (!teamId) return;
    const t = (teams || []).find((x) => String(x.id) === String(teamId));
    const parent = String(t?.parent_id || '').trim();
    if (parent && !clubId) setClubId(parent);
  }, [clubId, opened, teamId, teams]);

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
        const url = `${apiBaseUrl}/periods/?page_size=250&project_id=${encodeURIComponent(tid)}&type=season`;
        const results = await fetchAllPages<PeriodOption>(
          url,
          { credentials: 'include' },
          { ttlMs: 15_000, cacheKey: `periods:seasons:link-user:${tid}`, maxPages: 10, maxItems: 2000 },
        );
        if (cancelled) return;
        const seasons = (results || []).filter((p) => !p?.parent_period);
        setSeasonOptions(seasons);
      } catch {
        if (cancelled) return;
        setSeasonOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl, opened, teamId]);

  // ── API mutations ──────────────────────────────────────────
  const resolveOrgSlugOrIdForApi = (): string => {
    const org = resolvedOrg;
    const fromResolved = String(org?.slug || org?.id || '').trim();
    if (fromResolved) return fromResolved;
    return String(initialOrganisationSlugOrId || '').trim();
  };

  const createOrganisationMembership = async () => {
    if (!user) return;
    const org = resolvedOrg;
    if (!org) return;
    if (existingOrgIds.has(String(org.id))) return;

    const orgSlugOrId = String(org?.slug || org?.id || '').trim();
    if (!orgSlugOrId) throw new Error('Organisation slug/id missing');

    try {
      await api.post(`/organisations/${encodeURIComponent(orgSlugOrId)}/members/`, { email: user.email, role: orgRole });
    } catch (e) {
      if (e instanceof ApiError) {
        const bodyText = typeof e.body === 'string' ? e.body : JSON.stringify(e.body || '');
        if (/already|exists|duplicate/i.test(bodyText)) return;
      }
      throw e instanceof ApiError ? new Error(e.detail || 'Failed to assign user to federation') : e;
    }
  };

  const createProjectMembership = async (projectId: string, periodId?: string) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;
    if (!periodId && existingProjectIds.has(pid)) return;

    try {
      await api.post(`/projects/${encodeURIComponent(pid)}/members/`, {
        user_id: Number(user.id),
        role: accessRole,
        period_id: String(periodId || '').trim() || undefined,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        const bodyText = typeof e.body === 'string' ? e.body : JSON.stringify(e.body || '');
        if (/already|exists|duplicate/i.test(bodyText)) return;
      }
      throw e instanceof ApiError ? new Error(e.detail || 'Failed to assign user to project') : e;
    }
  };

  const assignFunctionalRoles = async (projectId: string, roles: string[]) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;
    const cleaned = (Array.isArray(roles) ? roles : []).map((r) => String(r || '').trim()).filter(Boolean);
    if (cleaned.length === 0) return;

    await api.post(`/projects/${encodeURIComponent(pid)}/functional-roles/assign/`, { user_id: Number(user.id), roles: cleaned });
  };

  const findOrganisationMembershipId = async (): Promise<string> => {
    if (!user) throw new Error('User missing');
    const orgIdValue = String(organisationId || '').trim();
    if (!orgIdValue) throw new Error('Select a federation first');

    const orgs = Array.isArray(user?.organisations) ? user.organisations : [];
    const direct = orgs.find((o) => String(o?.id ?? '') === orgIdValue);
    const directMembershipId = String(direct?.membership_id ?? '').trim();
    if (directMembershipId) return directMembershipId;

    const orgSlugOrId = resolveOrgSlugOrIdForApi();
    if (!orgSlugOrId) throw new Error('Federation slug/id missing');

    const members = await fetchAllPages<OrgMembershipListItem>(
      `${apiBaseUrl}/organisations/${encodeURIComponent(orgSlugOrId)}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `org:${orgSlugOrId}:members:lookup:${String(user.id)}`, maxPages: 50, maxItems: 10_000 },
    );

    const email = String(user.email || '').trim().toLowerCase();
    const uid = String(user.id);
    const found = (members || []).find((m) => {
      const memberId = String(m?.id ?? '').trim();
      if (!memberId) return false;
      const mu = m?.user || m;
      const mid = String(mu?.id ?? '').trim();
      const memail = String(mu?.email ?? (m as unknown as Record<string, unknown>)?.email ?? '').trim().toLowerCase();
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

    await api.delete(`/organisations/${encodeURIComponent(orgSlugOrId)}/members/${encodeURIComponent(membershipId)}/`);
  };

  const findProjectMembershipId = async (pid: string): Promise<string> => {
    if (!user) throw new Error('User missing');
    const direct = String(projectMembershipIdByProjectId.get(pid) || '').trim();
    if (direct) return direct;

    const members = await fetchAllPages<ProjectMembership>(
      `${apiBaseUrl}/projects/${encodeURIComponent(pid)}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `project:${pid}:members:lookup:${String(user.id)}`, maxPages: 50, maxItems: 10_000 },
    );

    const email = String(user.email || '').trim().toLowerCase();
    const uid = String(user.id);
    const found = (members || []).find((m) => {
      const memberId = String(m?.id ?? '').trim();
      if (!memberId) return false;
      const mu = m?.user || m;
      const mid = String(mu?.id ?? '').trim();
      const memail = String(mu?.email ?? (m as unknown as Record<string, unknown>)?.email ?? '').trim().toLowerCase();
      return (uid && mid && uid === mid) || (email && memail && email === memail);
    });
    const membershipId = String(found?.id ?? '').trim();
    if (!membershipId) throw new Error('Could not find project membership for this user');
    return membershipId;
  };

  const unlinkProjectMembership = async (projectId: string) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) throw new Error('Select a club/team first');
    const membershipId = await findProjectMembershipId(pid);

    await api.delete(`/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`);
  };

  // ── submit ─────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccessNote(null);

    try {
      if (organisationId) await createOrganisationMembership();
      if (clubId) await createProjectMembership(String(clubId));
      if (teamId) {
        await createProjectMembership(String(teamId), seasonId || undefined);
        await assignFunctionalRoles(String(teamId), functionalRoles);
      }
      setSuccessNote('Linked successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      logger.error('Failed to link user', err);
      setError(err instanceof Error ? err.message : 'Failed to link user');
    } finally {
      setSaving(false);
    }
  };

  // ── unlink handler (DRY helper for the 3 unlink buttons) ──
  const handleUnlink = async (kind: 'federation' | 'club' | 'team', projectId?: string) => {
    const kindLabel = kind === 'federation' ? 'federatie' : kind === 'club' ? 'club' : 'team';
    const ok = await confirm({ title: 'Ontkoppelen', message: `Gebruiker ontkoppelen van ${kindLabel}?`, confirmLabel: 'Ontkoppelen', variant: 'danger' });
    if (!ok) return;
    setSaving(true);
    setError(null);
    setSuccessNote(null);
    try {
      if (kind === 'federation') {
        await unlinkOrganisationMembership();
      } else {
        await unlinkProjectMembership(String(projectId));
      }
      setSuccessNote(`${kindLabel} ontkoppeld`);
      onSuccess();
      onClose();
    } catch (err) {
      logger.error(`Failed to unlink ${kind}`, err);
      setError(err instanceof Error ? err.message : `Failed to unlink ${kind}`);
    } finally {
      setSaving(false);
    }
  };

  return {
    // state
    organisationId, setOrganisationId,
    orgRole, setOrgRole,
    clubId, setClubId,
    teamId, setTeamId,
    accessRole, setAccessRole,
    functionalRoles, setFunctionalRoles,
    seasonId, setSeasonId,
    seasonOptions,
    saving, error, successNote,
    // derived
    userDisplayName,
    filteredClubs, filteredTeams,
    existingOrgIds, existingProjectIds,
    canSubmit,
    // actions
    onSubmit,
    handleUnlink,
  };
}
