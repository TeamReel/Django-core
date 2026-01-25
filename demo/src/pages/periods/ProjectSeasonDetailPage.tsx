import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import {
  BreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
  PageContent,
  PageHeader,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchEditModal from '../identity/MatchEditModal';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodCreateModal from '../identity/PeriodCreateModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import SeasonSquadAddMemberModal from '../identity/SeasonSquadAddMemberModal';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date: string;
  end_date: string;
  parent_period?: { id: string; name: string } | null;
  children_count?: number;
  matches_count?: number;
  children_matches_count?: number;
};

type ListResponse<T> = {
  results: T[];
  count: number;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
};

type Organisation = {
  id: string;
  name: string;
  slug?: string;
  user_role?: 'admin' | 'member';
};

const getCsrfToken = (): string => {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] ||
    ''
  );
};

const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

const isSeasonPeriod = (p: any): boolean => {
  // A season must be a root period (no parent)
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;

  // Fallback for seeders without explicit metadata.type
  const name = String(p?.name || '').toLowerCase();
  if (name.startsWith('season') || name.startsWith('seizoen')) return true;

  const seasonKey = p?.data?.season ?? p?.metadata?.season;
  if (seasonKey) return true;

  return false;
};

export const ProjectSeasonDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId, projectId, seasonId, clubId } = useParams<{ orgId: string; projectId: string; seasonId: string; clubId?: string }>();
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');
  const [seasonsForSwitcher, setSeasonsForSwitcher] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersReloadToken, setMembersReloadToken] = useState(0);

  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [teamRosterLoading, setTeamRosterLoading] = useState(false);
  const [teamRosterError, setTeamRosterError] = useState<string | null>(null);
  const [teamRosterReloadToken, setTeamRosterReloadToken] = useState(0);

  const [eligibleSearch, setEligibleSearch] = useState('');
  const [selectedEligibleUserIds, setSelectedEligibleUserIds] = useState<Set<string>>(new Set());
  const [selectedSquadMembershipIds, setSelectedSquadMembershipIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string>('');
  const [addPosition, setAddPosition] = useState('');
  const [addShirtNumber, setAddShirtNumber] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal (match TeamDetail page patterns: edit in-place, no /edit route)
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);

  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  const seasonWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

  const createModalOrganisations = useMemo(() => {
    if (!org) return [];
    return [{ id: String(org.id), name: String(org.name || ''), slug: (org as any).slug }];
  }, [org]);

  const createModalClubs = useMemo(() => {
    const baseOrgId = String(org?.id || '').trim();
    const c = club || null;
    if (c) {
      return [{ id: String((c as any).id), name: String((c as any).name || ''), slug: (c as any).slug, organisation: baseOrgId || undefined } as any];
    }
    return [] as any[];
  }, [club, org]);

  const createModalTeams = useMemo(() => {
    const team = project || null;
    if (!team) return [] as any[];
    const clubIdValue = String((club as any)?.id || '').trim();
    return [{ id: String((team as any).id), name: String((team as any).name || ''), slug: (team as any).slug, parent_id: clubIdValue || undefined } as any];
  }, [project, club]);

  // Permission checks (match ProjectDetailPage logic)
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const orgIdMatches = (candidate: any) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String((org as any)?.id || '').trim();
      const oslug = String((org as any)?.slug || '').trim();
      const route = String(orgSlugOrId || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };

    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((org as any)?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const projectDetailPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'competitions', 'matches', 'squad', 'transactions']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const seasonKeyOrId = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();
    if (!seasonKeyOrId) return;

    if (tabId === 'overview') {
      navigate(`${seasonsBasePath}/${seasonKeyOrId}`);
      return;
    }

    navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=${encodeURIComponent(tabId)}`);
  };

  const handleSeasonSwitch = (option: BreadcrumbSwitcherOption) => {
    const suffix = location.search ? location.search : '';
    navigate(`${seasonsBasePath}/${option.slug || option.id}${suffix}`);
  };

  const seasonPathKey = periodPathKey(season) || effectiveSeasonId;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/${orgSlugOrId}`) },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/${orgSlugOrId}/${clubSlugOrId}`),
            },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={String(resolvedSeasonId || (season as any)?.id || '')}
            options={seasonsForSwitcher.map((s) => ({
              id: String(s.id),
              label: String(s.name || s.slug || s.id),
              slug: periodPathKey(s) || String(s.id),
            }))}
            onSelect={handleSeasonSwitch}
            hasDropdown={seasonsForSwitcher.length > 1}
          />
        ),
        current: true,
      },
    ],
    [
      navigate,
      org?.name,
      project?.name,
      club?.name,
      orgSlugOrId,
      seasonsBasePath,
      projectDetailPath,
      isTeamRoute,
      clubSlugOrId,
      effectiveSeasonId,
      season,
      seasonsForSwitcher,
    ]
  );

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const periodId = String(periodToEdit?.id || '').trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save period');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(season?.id)) {
      setSeason((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
    }
    setCompetitions((prev) => prev.map((p: any) => (String(p.id) === String(updated?.id) ? { ...p, ...updated } : p)));
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save match');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => (String(m.id) === String(updated?.id) ? { ...m, ...updated } : m)));
  };

  // Helper to count matches per competition
  const getMatchCountForCompetition = (competition: any): number => {
    const annotated = Number(
      (competition as any)?.matches_count ?? (competition as any)?.children_matches_count
    );
    if (!matches.length && Number.isFinite(annotated) && annotated >= 0) return annotated;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;
    return matches.filter((m: any) => {
      const periodId = String(m.period_id || m.period?.id || '');
      return periodId === competitionId;
    }).length;
  };

  const getMatchParticipantsCount = (match: any): number => {
    const direct = Number(
      (match as any)?.participants_count ??
        (match as any)?.participations_count ??
        (match as any)?.participantsCount ??
        (match as any)?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const maybeParticipants = (match as any)?.participants;
    if (Array.isArray(maybeParticipants)) return maybeParticipants.length;
    const maybeParticipations = (match as any)?.participations;
    if (Array.isArray(maybeParticipations)) return maybeParticipations.length;

    return 0;
  };

  const getCompetitionParticipantsCount = (competition: any): number => {
    const direct = Number(
      (competition as any)?.participants_count ??
        (competition as any)?.participations_count ??
        (competition as any)?.participantsCount ??
        (competition as any)?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;

    // Best-effort aggregation from loaded matches.
    const related = matches.filter((m: any) => String(m.period_id || m.period?.id || '') === competitionId);
    if (related.length === 0) return 0;
    return related.reduce((sum: number, m: any) => sum + getMatchParticipantsCount(m), 0);
  };

  const seasonMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number((season as any)?.children_matches_count ?? (season as any)?.matches_count);
    if (Number.isFinite(annotated) && annotated >= 0) return annotated;
    return 0;
  }, [matches.length, season]);

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();

        const orgJson: Organisation = rawOrg?.data || rawOrg;
        const projectJson: Project = rawProject?.data || rawProject;

        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            const rawClub: any = await (clubRes as any).json();
            setClub(rawClub?.data || rawClub);
          } catch {
            // ignore
          }
        }

        // Fetch only root periods for the season switcher (much smaller than all periods)
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(
          String(projectJson.id)
        )}&parent_id=null&page_size=500`;
        const rootPeriods = await fetchAllPages<Period>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` }
        );

        // Seasons switcher options: root seasons within the same team/project
        const seasonOptions = rootPeriods.filter(isSeasonPeriod);
        setSeasonsForSwitcher(seasonOptions);

        // Resolve season UUID from URL param (UUID or slugified name)
        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p) => periodPathKey(p) === String(effectiveSeasonId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');
        setResolvedSeasonId(seasonUuid);

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' });
        if (!seasonRes.ok) throw new Error('Failed to load season');
        const rawSeason: any = await seasonRes.json();
        const seasonJson: Period = rawSeason?.data || rawSeason;
        setSeason(seasonJson);

        const desiredKey = periodPathKey(seasonJson);
        if (desiredKey && desiredKey !== String(effectiveSeasonId)) {
          const suffix = location.search ? location.search : '';
          navigate(`${seasonsBasePath}/${desiredKey}${suffix}`, { replace: true });
        }

        // Load competitions (direct children of this season) using server-side filtering
        setCompetitionsLoading(true);
        try {
          const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(
            seasonUuid
          )}&page_size=500`;
          const competitionResults = await fetchAllPages<Period>(
            competitionsUrl,
            { credentials: 'include' },
            { ttlMs: 60_000, cacheKey: `periods:children:${seasonUuid}` }
          );
          setCompetitions(competitionResults);
        } finally {
          setCompetitionsLoading(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId, isTeamRoute, clubSlugOrId]);

  // Fetch season squad memberships (season-scoped roster)
  useEffect(() => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectIdForMembers || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(
          projectIdForMembers
        )}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;

        const membersList = await fetchAllPages<any>(
          membersUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

        if (!cancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load squad';
        if (!cancelled) setMembersError(msg);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, project, resolvedSeasonId, membersReloadToken]);

  // Fetch full team roster (all memberships on the team, any period) so we can show
  // "team members not in squad" for quick assignment.
  useEffect(() => {
    if (activeTab !== 'squad') return;
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    let cancelled = false;
    const run = async () => {
      setTeamRosterLoading(true);
      setTeamRosterError(null);
      try {
        const rosterUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/?page_size=500`;
        const roster = await fetchAllPages<any>(
          rosterUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );
        if (!cancelled) setTeamRoster(Array.isArray(roster) ? roster : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load team roster';
        if (!cancelled) setTeamRosterError(msg);
      } finally {
        if (!cancelled) setTeamRosterLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, project, teamRosterReloadToken]);

  const getUserId = (m: any): string => {
    const u = m?.user || m;
    const id = u?.id ?? m?.user_id;
    return String(id || '').trim();
  };

  const getUserLabel = (m: any): { name: string; email: string } => {
    const u = m?.user || m;
    const name =
      u?.name ||
      `${u?.first_name || ''} ${u?.last_name || ''}`.trim() ||
      String(u?.email || '').trim() ||
      '—';
    const email = String(u?.email || '').trim() || '—';
    return { name, email };
  };

  const normalizeAccessRole = (raw: any): 'viewer' | 'editor' | 'admin' => {
    const role = String(raw || '').trim().toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'editor') return 'editor';
    if (role === 'viewer') return 'viewer';
    if (['coach', 'trainer'].includes(role)) return 'editor';
    if (['manager', 'owner'].includes(role)) return 'admin';
    return 'viewer';
  };

  const getBestRoleForUser = (userId: string): 'viewer' | 'editor' | 'admin' => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const base = relevant.find((m: any) => !String(m?.period_id ?? m?.period ?? '').trim());
    const anyOne = relevant[0];
    return normalizeAccessRole(base?.role ?? anyOne?.role ?? 'viewer');
  };

  const getFunctionalRolesFromMembership = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  const getFunctionalRolesForUser = (userId: string): string[] => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const set = new Set<string>();
    for (const m of relevant) {
      for (const r of getFunctionalRolesFromMembership(m)) set.add(r);
    }
    return Array.from(set.values());
  };

  const squadUserIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of members || []) {
      const uid = getUserId(m);
      if (uid) s.add(uid);
    }
    return s;
  }, [members]);

  const eligibleTeamMembers = useMemo(() => {
    const byUserId = new Map<string, any>();
    for (const m of teamRoster || []) {
      const uid = getUserId(m);
      if (!uid) continue;
      if (squadUserIdSet.has(uid)) continue;
      if (!byUserId.has(uid)) byUserId.set(uid, m);
    }

    const q = String(eligibleSearch || '').trim().toLowerCase();
    const list = Array.from(byUserId.values());
    const filtered = q
      ? list.filter((m: any) => {
          const { name, email } = getUserLabel(m);
          return `${name} ${email}`.toLowerCase().includes(q);
        })
      : list;

    return filtered.sort((a: any, b: any) => {
      const la = getUserLabel(a).name.toLowerCase();
      const lb = getUserLabel(b).name.toLowerCase();
      return la.localeCompare(lb);
    });
  }, [eligibleSearch, squadUserIdSet, teamRoster]);

  const toggleEligibleUser = (userId: string) => {
    setSelectedEligibleUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSquadMembership = (membershipId: string) => {
    setSelectedSquadMembershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const getRetryDelayMsFromResponse = async (res: Response): Promise<number | null> => {
    const header = res.headers.get('retry-after');
    if (header) {
      const seconds = Number(header);
      if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
    }

    try {
      const rawText = await res.text();
      // Example payload:
      // {"status":"error","error":{"message":"Request was throttled. Expected available in 30 seconds."}}
      const match = rawText.match(/Expected available in\s+(\d+)\s+seconds/i);
      if (match?.[1]) {
        const seconds = Number(match[1]);
        if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
      }
      // If response isn't JSON or doesn't match, fall through.
    } catch {
      // ignore
    }

    return null;
  };

  const fetchWithThrottleRetry = async (
    input: RequestInfo | URL,
    init: RequestInit,
    opts?: { maxAttempts?: number; baseDelayMs?: number }
  ): Promise<Response> => {
    const maxAttempts = opts?.maxAttempts ?? 6;
    const baseDelayMs = opts?.baseDelayMs ?? 500;

    let attempt = 0;
    // We intentionally run sequentially to reduce pressure on API.
    // This helper adds retry + backoff when the server throttles (HTTP 429).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      const res = await fetch(input, init);

      if (res.status !== 429) return res;

      if (attempt >= maxAttempts) return res;

      const retryDelayMs = (await getRetryDelayMsFromResponse(res)) ?? baseDelayMs * attempt;
      await sleep(Math.min(60_000, retryDelayMs));
    }
  };

  const assignUsersToSeasonSquad = async (userIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectIdForMembers || !seasonUuid) return;

    const ids = (userIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-user write throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              members: ids.map((uid) => ({
                user_id: Number(uid),
                role: getBestRoleForUser(uid),
                period_id: String(seasonUuid),
              })),
            }),
          }
        );

        if (res.status === 404) {
          // Older backend: fall back to sequential single-member POSTs.
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to assign users');
        } else {
          setSelectedEligibleUserIds((prev) => {
            const next = new Set(prev);
            for (const uid of ids) next.delete(uid);
            return next;
          });
          setMembersReloadToken((x) => x + 1);
          setTeamRosterReloadToken((x) => x + 1);
          return;
        }
      }

      for (const uid of ids) {
        // Pace requests to avoid hitting server throttles when selecting many users.
        await sleep(250);
        const role = getBestRoleForUser(uid);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              user_id: Number(uid),
              role,
              period_id: String(seasonUuid),
            }),
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          // ignore duplicates
          if (!/already|exists|duplicate/i.test(text)) {
            throw new Error(text || 'Failed to assign user');
          }
        }
      }

      setSelectedEligibleUserIds((prev) => {
        const next = new Set(prev);
        for (const uid of ids) next.delete(uid);
        return next;
      });
      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to assign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const unassignMembershipsFromSeasonSquad = async (membershipIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    const ids = (membershipIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-row throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk-delete/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ membership_ids: ids }),
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to unassign users');
        }

        setSelectedSquadMembershipIds((prev) => {
          const next = new Set(prev);
          for (const membershipId of ids) next.delete(membershipId);
          return next;
        });
        setMembersReloadToken((x) => x + 1);
        setTeamRosterReloadToken((x) => x + 1);
        return;
      }

      for (const membershipId of ids) {
        // Pace requests to avoid hitting server throttles when unassigning many users.
        await sleep(200);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/${encodeURIComponent(membershipId)}/`,
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
          throw new Error(text || 'Failed to unassign user');
        }
      }

      setSelectedSquadMembershipIds((prev) => {
        const next = new Set(prev);
        for (const membershipId of ids) next.delete(membershipId);
        return next;
      });
      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to unassign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Search for users that can be added to this season squad
  useEffect(() => {
    if (!userCanEditProject) return;
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    const q = String(memberSearch || '').trim();
    if (!projectIdForMembers || !seasonUuid || q.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('search', q);
        params.set('period', seasonUuid);
        const res = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/searchable-users/?${params.toString()}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('Failed to search users');
        const raw: any = await res.json();
        const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        if (!cancelled) setMemberSearchResults(list);
      } catch {
        if (!cancelled) setMemberSearchResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiBaseUrl, project, resolvedSeasonId, memberSearch, userCanEditProject]);

  // Fetch matches only when the user is on a tab that actually needs them.
  useEffect(() => {
    const needsMatches = activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'competitions';
    if (!needsMatches) return;
    const projectNumericId = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectNumericId || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMatchesLoading(true);
      try {
        // Server supports include_descendants so we can fetch season matches without scanning all activities.
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
          projectNumericId
        )}&period_id=${encodeURIComponent(
          seasonUuid
        )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;

        const seasonMatches = await fetchAllPages<any>(
          url,
          { credentials: 'include' },
          {
            ttlMs: 30_000,
            cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`,
            maxItems: 250,
          }
        );

        if (!cancelled) setMatches(seasonMatches);
      } catch (e) {
        console.error('Failed to fetch matches:', e);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, project, resolvedSeasonId]);

  return (
    <>
      <div>
        <PageHeader
          title={season ? season.name : 'Season'}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="app-action-button"
                onClick={() => navigate(seasonsBasePath)}
                style={actionButtonStyle('neutral')}
              >
                Back
              </button>
              <button
                type="button"
                className="app-action-button"
                onClick={() => {
                  setSelectedDetailPeriod(season);
                  setIsPeriodDetailModalOpen(true);
                }}
                style={actionButtonStyle('primary')}
              >
                View
              </button>
              {userCanEditProject && (
                <button
                  type="button"
                  className="app-action-button"
                  onClick={() => {
                    setSelectedEditPeriod(season);
                    setIsPeriodEditModalOpen(true);
                  }}
                  style={actionButtonStyle('warning')}
                >
                  Edit
                </button>
              )}
              {userCanDeleteProject && (
                <button
                  type="button"
                  className="app-action-button"
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete season ${season?.name}?`)) return;
                    try {
                      const res = await fetch(
                        `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(resolvedSeasonId || effectiveSeasonId)}/`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                          },
                          credentials: 'include',
                        }
                      );

                      if (res.ok) {
                        navigate(seasonsBasePath);
                      } else {
                        alert('Error deleting season');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Error deleting season');
                    }
                  }}
                  style={actionButtonStyle('danger')}
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                className="app-action-button"
                onClick={() => setIsCreateTxnModalOpen(true)}
                style={actionButtonStyle('primary')}
              >
                Create transaction
              </button>
            </div>
          }
        />

        <CreateTransactionModal
          isOpen={isCreateTxnModalOpen}
          onClose={() => setIsCreateTxnModalOpen(false)}
          onCreated={() => {
            navigateToTab('transactions');
          }}
          title="Create season transaction"
          scope="season"
          organizationId={String(org?.id || '').trim()}
          defaultProjectId={project?.id != null ? String(project.id) : null}
          seasonId={String(resolvedSeasonId || effectiveSeasonId || '').trim() || null}
          periodId={String(resolvedSeasonId || effectiveSeasonId || '').trim() || null}
          activityId={null}
          currentUserId={Number((user as any)?.id)}
          chargedUserId={null}
          walletOptions={seasonWalletOptions}
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <Card><div style={{ padding: '16px' }}>Loading...</div></Card>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Dates</div>
                      <div className="text-sm font-semibold mt-1">
                        {season?.start_date ? new Date(season.start_date).toLocaleDateString() : '—'} –{' '}
                        {season?.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}
                      </div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Competitions</div>
                      <div className="text-2xl font-bold mt-1">{competitions.length}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Matches</div>
                      <div className="text-2xl font-bold mt-1">{seasonMatchesCount}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Squad</div>
                      <div className="text-2xl font-bold mt-1">{members.length}</div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Overview content */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Competitions</h3>
                          <Button variant="secondary" size="sm" onClick={() => navigateToTab('competitions')}>
                            View All
                          </Button>
                        </div>
                        {competitionsLoading ? (
                          <div className="text-sm text-gray-500 py-4 text-center">Loading competitions…</div>
                        ) : competitions.length === 0 ? (
                          <div className="text-sm text-gray-500 py-4 text-center">No competitions in this season.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  <th style={compactThStyle}>Competition</th>
                                  <th style={compactThStyle}>Matches</th>
                                  <th style={compactThStyle} className="text-right"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {competitions.slice(0, 5).map((competition) => (
                                  <tr key={competition.id}>
                                    <td style={compactTextTdStyle}>
                                      <Link
                                        to={
                                          isTeamRoute
                                            ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                                            : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                                        }
                                        className="text-blue-600 hover:underline"
                                        style={{ textDecoration: 'none', backgroundColor: 'transparent' }}
                                      >
                                        {competition.name}
                                      </Link>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <div style={compactActionsStyle}>
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => {
                                            setSelectedDetailPeriod(competition);
                                            setIsPeriodDetailModalOpen(true);
                                          }}
                                          style={actionButtonStyle('primary')}
                                        >
                                          View
                                        </button>
                                        {userCanEditProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={() => {
                                              setSelectedEditPeriod(competition);
                                              setIsPeriodEditModalOpen(true);
                                            }}
                                            style={actionButtonStyle('warning')}
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {userCanDeleteProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={async () => {
                                              if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                              try {
                                                const res = await fetch(`${apiBaseUrl}/api/v1/periods/${competition.id}/`, {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRFToken': getCsrfToken(),
                                                  },
                                                  credentials: 'include',
                                                });

                                                if (res.ok) {
                                                  setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(competition.id)));
                                                } else {
                                                  alert('Error deleting competition');
                                                }
                                              } catch (e) {
                                                console.error(e);
                                                alert('Error deleting competition');
                                              }
                                            }}
                                            style={actionButtonStyle('danger')}
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </Card>

                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Hierarchy</h3>
                          <Button variant="secondary" size="sm" onClick={() => navigateToTab('hierarchy')}>
                            View Hierarchy
                          </Button>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            Browse competitions and matches grouped by competition.
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Right Column: Quick Actions */}
                    <div className="space-y-6">
                      <Card>
                        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('competitions')}
                          >
                            Manage Competitions
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('matches')}
                          >
                            View Matches
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('squad')}
                          >
                            View Squad
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'hierarchy' && (
                <Card>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Input
                        value={hierarchySearch}
                        onChange={(e) => setHierarchySearch(e.target.value)}
                        placeholder="Filter competitions/matches"
                        style={{ width: '240px' }}
                      />
                      <Button variant="secondary" size="sm" onClick={() => setHierarchySearch('')}>
                        Clear
                      </Button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {userCanEditProject && (
                        <>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => setIsCreateCompetitionModalOpen(true)}
                            style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '140px', fontWeight: 500 }}
                          >
                            Add Competition
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => setIsCreateMatchModalOpen(true)}
                            style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: 500 }}
                          >
                            Add Match
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-4">Hierarchy: Competitions</h3>
                  {competitionsLoading ? (
                    <Alert variant="info">Loading competitions…</Alert>
                  ) : competitions.length === 0 ? (
                    <Alert variant="info">No competitions found in this season.</Alert>
                  ) : (
                    (() => {
                      const normalized = hierarchySearch.trim().toLowerCase();
                      const filteredCompetitions = !normalized
                        ? competitions
                        : competitions.filter((c) => {
                            const compName = String(c?.name || '').toLowerCase();
                            return compName.includes(normalized);
                          });

                      return (
                        <>
                          {matchesLoading ? (
                            <div style={{ marginBottom: '10px' }}>
                              <Alert variant="info">Loading match counts…</Alert>
                            </div>
                          ) : null}
                          {filteredCompetitions.map((competition) => {
                            const compId = String(competition.id);
                            return (
                              <div key={compId} style={{ marginBottom: '2rem' }}>
                                <div
                                  style={{
                                    backgroundColor: 'var(--app-surface-2)',
                                    padding: '12px 16px',
                                    borderRadius: '4px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                  }}
                                >
                                  <Link
                                    to={
                                      isTeamRoute
                                        ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                                        : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                                    }
                                    className="text-blue-600 hover:underline"
                                    style={{
                                      textDecoration: 'none',
                                      backgroundColor: 'transparent',
                                      margin: 0,
                                      flex: 1,
                                      fontSize: '16px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {competition.name || `Competition ${compId}`}
                                  </Link>
                                  <Badge variant="default">{getMatchCountForCompetition(competition)} Matches</Badge>
                                  <button
                                    type="button"
                                    className="app-action-button"
                                    onClick={() => {
                                      setSelectedDetailPeriod(competition);
                                      setIsPeriodDetailModalOpen(true);
                                    }}
                                    style={actionButtonStyle('primary')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setSelectedEditPeriod(competition);
                                        setIsPeriodEditModalOpen(true);
                                      }}
                                      style={actionButtonStyle('warning')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                        try {
                                          const res = await fetch(`${apiBaseUrl}/api/v1/periods/${competition.id}/`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'X-CSRFToken': getCsrfToken(),
                                            },
                                            credentials: 'include',
                                          });

                                          if (res.ok) {
                                            setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(competition.id)));
                                          } else {
                                            alert('Error deleting competition');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting competition');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()
                  )}
                </Card>
              )}

              {activeTab === 'squad' && (
                <Card>
                  <div style={{ padding: '16px 16px 0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Players & Staff</h3>
                      <Badge variant="default">{members.length} Members</Badge>
                    </div>
                    <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
                      Season-scoped roster (filtered by period).
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    {userCanEditProject && (
                      <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => setIsAddSquadMemberModalOpen(true)}
                          style={{ ...actionButtonStyle('neutral'), padding: '8px 16px', fontSize: '14px', minWidth: '140px', fontWeight: 500 }}
                        >
                          Add User (advanced)
                        </button>
                        <div style={{ color: 'var(--app-muted-text)', fontSize: '13px' }}>
                          Use quick Assign/Unassign below for team members.
                        </div>
                      </div>
                    )}

                    {membersLoading && <Alert variant="info">Loading squad…</Alert>}
                    {membersError && <Alert variant="error">{membersError}</Alert>}

                    {teamRosterLoading && <Alert variant="info">Loading team roster…</Alert>}
                    {teamRosterError && <Alert variant="error">{teamRosterError}</Alert>}

                    {userCanEditProject ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', alignItems: 'start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <div style={{ display: 'grid', gap: 2 }}>
                              <div style={{ fontWeight: 600 }}>Not in squad (team members)</div>
                              <div style={{ fontSize: 13, color: 'var(--app-muted-text)' }}>
                                Select users that belong to the team and assign them to this season squad.
                              </div>
                            </div>
                            <button
                              type="button"
                              className="app-action-button"
                              disabled={bulkSubmitting || selectedEligibleUserIds.size === 0}
                              onClick={async () => {
                                const userIds = Array.from(selectedEligibleUserIds.values()).filter(Boolean);
                                await assignUsersToSeasonSquad(userIds);
                              }}
                              style={{ ...actionButtonStyle('success'), padding: '8px 14px', fontSize: '14px', minWidth: '160px', fontWeight: 500 }}
                              title="Assign selected users to the squad"
                            >
                              Assign ({selectedEligibleUserIds.size})
                            </button>
                          </div>

                          <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Input
                              value={eligibleSearch}
                              onChange={(e) => setEligibleSearch(e.target.value)}
                              placeholder="Search team members"
                              style={{ width: '280px' }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                                setSelectedEligibleUserIds(allSelected ? new Set() : new Set(allIds));
                              }}
                              disabled={bulkSubmitting || eligibleTeamMembers.length === 0}
                            >
                              {(() => {
                                const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                                return allSelected ? 'Unselect all' : 'Select all';
                              })()}
                            </Button>
                          </div>

                          {eligibleTeamMembers.length === 0 ? (
                            <Alert variant="info">Everyone who belongs to the team is already in this season squad.</Alert>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table style={compactTableStyle}>
                                <thead>
                                  <tr>
                                    <th style={{ ...compactThStyle, width: '44px' }}></th>
                                    <th style={compactThStyle}>Name</th>
                                    <th style={compactThStyle}>Email</th>
                                    <th style={compactThStyle}>Access</th>
                                    <th style={compactThStyle}>Functional</th>
                                    <th style={{ ...compactThStyle, width: '120px' }} className="text-right">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {eligibleTeamMembers.map((m: any) => {
                                    const userId = getUserId(m);
                                    const { name, email } = getUserLabel(m);
                                    const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
                                    const role = getBestRoleForUser(userId);
                                    const functionalRoles = getFunctionalRolesForUser(userId);
                                    return (
                                      <tr key={`eligible:${userId || email}`}>
                                        <td style={compactTdStyle}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!userId || bulkSubmitting}
                                            onChange={() => {
                                              if (!userId) return;
                                              toggleEligibleUser(userId);
                                            }}
                                          />
                                        </td>
                                        <td style={compactTextTdStyle}>{name}</td>
                                        <td style={compactTextTdStyle}>{email}</td>
                                        <td style={compactTdStyle}>
                                          <Badge variant="default">{role}</Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          {functionalRoles.length ? (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                              {functionalRoles.map((r) => (
                                                <Badge key={r} variant="default">
                                                  {r}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td style={compactTdStyle} className="text-right">
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            disabled={!userId || bulkSubmitting}
                                            onClick={async () => {
                                              if (!userId) return;
                                              await assignUsersToSeasonSquad([userId]);
                                            }}
                                            style={{ ...actionButtonStyle('success'), padding: '6px 10px', fontSize: '13px' }}
                                            title="Assign this user to the season squad"
                                          >
                                            Assign
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <div style={{ display: 'grid', gap: 2 }}>
                              <div style={{ fontWeight: 600 }}>In squad</div>
                              <div style={{ fontSize: 13, color: 'var(--app-muted-text)' }}>
                                Select squad members and unassign them from this season.
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const allIds = (members || [])
                                    .map((m: any) => String(m?.id || '').trim())
                                    .filter(Boolean);
                                  const allSelected =
                                    allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                                  setSelectedSquadMembershipIds(allSelected ? new Set() : new Set(allIds));
                                }}
                                disabled={bulkSubmitting || (members || []).length === 0}
                              >
                                {(() => {
                                  const allIds = (members || [])
                                    .map((m: any) => String(m?.id || '').trim())
                                    .filter(Boolean);
                                  const allSelected =
                                    allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                                  return allSelected ? 'Unselect all' : 'Select all';
                                })()}
                              </Button>

                              <button
                                type="button"
                                className="app-action-button"
                                disabled={bulkSubmitting || selectedSquadMembershipIds.size === 0}
                                onClick={async () => {
                                  const ids = Array.from(selectedSquadMembershipIds.values()).filter(Boolean);
                                  await unassignMembershipsFromSeasonSquad(ids);
                                }}
                                style={{ ...actionButtonStyle('danger'), padding: '8px 14px', fontSize: '14px', minWidth: '170px', fontWeight: 500 }}
                                title="Unassign selected users from the squad"
                              >
                                Unassign ({selectedSquadMembershipIds.size})
                              </button>
                            </div>
                          </div>

                          {!membersLoading && !membersError && members.length === 0 ? (
                            <Alert variant="info">No members found for this season.</Alert>
                          ) : !membersLoading && !membersError ? (
                            <div className="overflow-x-auto">
                              <Table style={compactTableStyle}>
                                <thead>
                                  <tr>
                                    <th style={{ ...compactThStyle, width: '44px' }}></th>
                                    <th style={compactThStyle}>Name</th>
                                    <th style={compactThStyle}>Email</th>
                                    <th style={compactThStyle}>Access</th>
                                    <th style={compactThStyle}>Functional</th>
                                    <th style={compactThStyle}>Position</th>
                                    <th style={compactThStyle}>#</th>
                                    <th style={{ ...compactThStyle, width: '120px' }} className="text-right">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map((m: any) => {
                                    const memberUser = m.user || m;
                                    const name =
                                      memberUser.name ||
                                      `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                                      memberUser.email ||
                                      '—';

                                    const email = memberUser.email || '—';
                                    const role = normalizeAccessRole(m.role || 'viewer');
                                    const functionalRoles = getFunctionalRolesFromMembership(m);
                                    const position = m.metadata?.position || '—';
                                    const shirtNumber = m.metadata?.shirt_number ?? '';
                                    const membershipId = String(m.id || '').trim();
                                    const checked = Boolean(membershipId && selectedSquadMembershipIds.has(membershipId));

                                    return (
                                      <tr key={membershipId}>
                                        <td style={compactTdStyle}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!membershipId || bulkSubmitting}
                                            onChange={() => {
                                              if (!membershipId) return;
                                              toggleSquadMembership(membershipId);
                                            }}
                                          />
                                        </td>
                                        <td style={compactTextTdStyle}>{name}</td>
                                        <td style={compactTextTdStyle}>{email}</td>
                                        <td style={compactTdStyle}>
                                          <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                            {role}
                                          </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          {functionalRoles.length ? (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                              {functionalRoles.map((r: string) => (
                                                <Badge key={r} variant="default">
                                                  {r}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td style={compactTextTdStyle}>{position}</td>
                                        <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                                        <td style={compactTdStyle} className="text-right">
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            disabled={!membershipId || bulkSubmitting}
                                            onClick={async () => {
                                              if (!membershipId) return;
                                              await unassignMembershipsFromSeasonSquad([membershipId]);
                                            }}
                                            style={{ ...actionButtonStyle('danger'), padding: '6px 10px', fontSize: '13px' }}
                                            title="Unassign this user from the season squad"
                                          >
                                            Unassign
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      // Read-only view (no bulk actions)
                      <>
                        {!membersLoading && !membersError && members.length === 0 ? (
                          <Alert variant="info">No members found for this season.</Alert>
                        ) : !membersLoading && !membersError ? (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  <th style={compactThStyle}>Name</th>
                                  <th style={compactThStyle}>Email</th>
                                  <th style={compactThStyle}>Access</th>
                                  <th style={compactThStyle}>Functional</th>
                                  <th style={compactThStyle}>Position</th>
                                  <th style={compactThStyle}>#</th>
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((m: any) => {
                                  const memberUser = m.user || m;
                                  const name =
                                    memberUser.name ||
                                    `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                                    memberUser.email ||
                                    '—';

                                  const email = memberUser.email || '—';
                                  const role = normalizeAccessRole(m.role || 'viewer');
                                  const functionalRoles = getFunctionalRolesFromMembership(m);
                                  const position = m.metadata?.position || '—';
                                  const shirtNumber = m.metadata?.shirt_number ?? '';

                                  return (
                                    <tr key={String(m.id || email)}>
                                      <td style={compactTextTdStyle}>{name}</td>
                                      <td style={compactTextTdStyle}>{email}</td>
                                      <td style={compactTdStyle}>
                                        <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                          {role}
                                        </Badge>
                                      </td>
                                      <td style={compactTdStyle}>
                                        {functionalRoles.length ? (
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {functionalRoles.map((r: string) => (
                                              <Badge key={r} variant="default">
                                                {r}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td style={compactTextTdStyle}>{position}</td>
                                      <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === 'competitions' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Competitions</h3>
                      {userCanEditProject ? (
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => setIsCreateCompetitionModalOpen(true)}
                          style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '140px', fontWeight: 500 }}
                        >
                          Add Competition
                        </button>
                      ) : null}
                    </div>
                    {competitionsLoading ? (
                      <Alert variant="info">Loading competitions…</Alert>
                    ) : competitions.length === 0 ? (
                      <Alert variant="info">No competitions found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Dates</th>
                            <th style={compactThStyle}>Matches</th>
                            <th style={compactThStyle}>Participants</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitions.map((competition) => (
                            <tr key={competition.id}>
                              <td style={compactTextTdStyle}>
                                <Link
                                  to={
                                    isTeamRoute
                                      ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                                      : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                                  }
                                  className="text-blue-600 hover:underline"
                                  style={{ textDecoration: 'none' }}
                                >
                                  {competition.name}
                                </Link>
                              </td>
                              <td style={compactTextTdStyle}>
                                {new Date(competition.start_date).toLocaleDateString()} –{' '}
                                {new Date(competition.end_date).toLocaleDateString()}
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getCompetitionParticipantsCount(competition)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button
                                    type="button"
                                    className="app-action-button"
                                    onClick={() => {
                                      setSelectedDetailPeriod(competition);
                                      setIsPeriodDetailModalOpen(true);
                                    }}
                                    style={actionButtonStyle('primary')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setSelectedEditPeriod(competition);
                                        setIsPeriodEditModalOpen(true);
                                      }}
                                            style={actionButtonStyle('warning')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                        try {
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/periods/${competition.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': getCsrfToken(),
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
                                          } else {
                                            alert('Error deleting competition');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting competition');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === 'matches' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Matches</h3>
                      {userCanEditProject ? (
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => setIsCreateMatchModalOpen(true)}
                          style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: 500 }}
                        >
                          Add Match
                        </button>
                      ) : null}
                    </div>
                    {matchesLoading ? (
                      <Alert variant="info">Loading matches…</Alert>
                    ) : matches.length === 0 ? (
                      <Alert variant="info">No matches found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Match</th>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Date</th>
                            <th style={compactThStyle}>Participants</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={match.id}>
                              <td style={compactTextTdStyle}>
                                {(() => {
                                  const compId = String(
                                    (match as any).period_id || match.period?.id || (match as any).period || ''
                                  ).trim();
                                  const compKey = periodPathKey((match as any).period || null) || compId;
                                  const matchKey = (match as any).slug || match.id;
                                  const matchPath = isTeamRoute
                                    ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
                                    : `/matches/${String(matchKey)}`;
                                  return (
                                <Link
                                      to={matchPath}
                                  className="text-blue-600 hover:underline"
                                  style={{ textDecoration: 'none' }}
                                >
                                  {match.title || match.name}
                                </Link>
                                  );
                                })()}
                              </td>
                              <td style={compactTextTdStyle}>
                                {match.period?.id ? (
                                  <Link
                                    to={
                                      isTeamRoute
                                        ? `${seasonsBasePath}/${seasonPathKey}/${String(match.period?.id)}`
                                        : `${seasonsBasePath}/${seasonPathKey}/competitions/${String(match.period?.id)}`
                                    }
                                    className="text-blue-600 hover:underline"
                                    style={{ textDecoration: 'none' }}
                                  >
                                    {match.period?.name || 'Competition'}
                                  </Link>
                                ) : (
                                  match.period?.name || '—'
                                )}
                              </td>
                              <td style={compactTextTdStyle}>
                                {match.start_time ? new Date(match.start_time).toLocaleString() : '—'}
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getMatchParticipantsCount(match)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button
                                    type="button"
                                    className="app-action-button"
                                    onClick={() => {
                                      setSelectedDetailMatch(match);
                                      setIsMatchDetailModalOpen(true);
                                    }}
                                    style={actionButtonStyle('primary')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setSelectedEditMatch(match);
                                        setIsMatchEditModalOpen(true);
                                      }}
                                      style={actionButtonStyle('warning')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete match ${match.title || match.name}?`)) return;
                                        try {
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/activities/${match.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': getCsrfToken(),
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setMatches((prev) => prev.filter((m) => m.id !== match.id));
                                          } else {
                                            alert('Error deleting match');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting match');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Card>
              )}

            </>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <TransactionsPanel
                title="Transactions"
                description="Season-scoped transactions (usage_event.metadata.season_id)"
                filters={{
                  organization_id: String(org?.id || ''),
                  project_id: String(project?.id || ''),
                  season_id: String(resolvedSeasonId || effectiveSeasonId || ''),
                }}
              />
            </div>
          )}
        </PageContent>

        <PeriodEditModal
          opened={isPeriodEditModalOpen}
          onClose={() => {
            setIsPeriodEditModalOpen(false);
            setSelectedEditPeriod(null);
          }}
          period={selectedEditPeriod}
          onSave={async (payload) => {
            if (!selectedEditPeriod) return;
            await savePeriodEdits(selectedEditPeriod, payload);
          }}
        />

        <PeriodDetailModal
          opened={isPeriodDetailModalOpen}
          onClose={() => {
            setIsPeriodDetailModalOpen(false);
            setSelectedDetailPeriod(null);
          }}
          period={selectedDetailPeriod}
        />

        <MatchDetailModal
          opened={isMatchDetailModalOpen}
          onClose={() => {
            setIsMatchDetailModalOpen(false);
            setSelectedDetailMatch(null);
          }}
          match={selectedDetailMatch}
        />

        <MatchEditModal
          opened={isMatchEditModalOpen}
          onClose={() => {
            setIsMatchEditModalOpen(false);
            setSelectedEditMatch(null);
          }}
          match={selectedEditMatch}
          onSave={async (payload) => {
            if (!selectedEditMatch) return;
            await saveMatchEdits(selectedEditMatch, payload);
          }}
        />

        <PeriodCreateModal
          opened={isCreateCompetitionModalOpen}
          onClose={() => setIsCreateCompetitionModalOpen(false)}
          title="Create Competition"
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          requireOrganisation
          requireClub
          requireTeam
          requireSeason
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          initialSeasonId={String(resolvedSeasonId || season?.id || '')}
          onCreate={async (payload) => {
            const orgIdValue = String(payload.organisation_id || org?.id || '').trim();
            const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
            const seasonIdValue = String(payload.parent_period_id || resolvedSeasonId || season?.id || '').trim();
            if (!orgIdValue) throw new Error('Select a federation first');
            if (!teamIdValue) throw new Error('Select a team first');
            if (!seasonIdValue) throw new Error('Select a season first');

            const res = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({
                organisation_id: orgIdValue,
                project_id: teamIdValue ? Number(teamIdValue) : undefined,
                parent_period_id: seasonIdValue,
                name: payload.name,
                description: payload.description,
                start_date: payload.start_date,
                end_date: payload.end_date,
                metadata: { type: 'competition' },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create competition');
            }

            // Update UI immediately; refresh list in background.
            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setCompetitions((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((p: any) => String((p as any)?.id || '').trim() === createdId)) return list;
                  return [created as any, ...list];
                });
              }
            }

            // Reload competitions list (matches will be fetched on-demand).
            if (resolvedSeasonId) {
              void (async () => {
                setCompetitionsLoading(true);
                try {
                  const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(resolvedSeasonId)}&page_size=500`;
                  const competitionResults = await fetchAllPages<Period>(
                    competitionsUrl,
                    { credentials: 'include' },
                    { ttlMs: 10_000, cacheKey: `periods:children:${resolvedSeasonId}` }
                  );
                  setCompetitions(competitionResults);
                } finally {
                  setCompetitionsLoading(false);
                }
              })();
            }
          }}
        />

        <MatchCreateModal
          opened={isCreateMatchModalOpen}
          onClose={() => setIsCreateMatchModalOpen(false)}
          mode="season-detail"
          apiBaseUrl={apiBaseUrl}
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          initialSeasonId={String(resolvedSeasonId || season?.id || '')}
          onCreate={async (payload) => {
            const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
            const competitionIdValue = String(payload.period_id || '').trim();
            if (!teamIdValue) throw new Error('Select a team first');
            if (!competitionIdValue) throw new Error('Select a competition first');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({
                title: payload.title,
                activity_type: 'match',
                project_id: teamIdValue ? Number(teamIdValue) : undefined,
                opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
                period_id: competitionIdValue,
                start_time: payload.start_time,
                end_time: payload.end_time,
                location: payload.location,
                description: payload.description,
                metadata: {
                  venue: payload.venue || 'Home',
                  is_home: (payload.venue || 'Home') === 'Home',
                },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create match');
            }

            // Update UI immediately; refresh matches in background if currently visible.
            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setMatches((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                  return [created, ...list];
                });
              }
            }

            // Refresh matches if currently visible.
            if (activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'competitions') {
              void (async () => {
                setMatchesLoading(true);
                try {
                  const projectNumericId = String((project as any)?.id || '').trim();
                  const seasonUuid = String(resolvedSeasonId || '').trim();
                  if (projectNumericId && seasonUuid) {
                    const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
                      projectNumericId
                    )}&period_id=${encodeURIComponent(
                      seasonUuid
                    )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;
                    const seasonMatches = await fetchAllPages<any>(
                      url,
                      { credentials: 'include' },
                      { ttlMs: 10_000, cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`, maxItems: 250 }
                    );
                    setMatches(seasonMatches);
                  }
                } finally {
                  setMatchesLoading(false);
                }
              })();
            }
          }}
        />

        <SeasonSquadAddMemberModal
          opened={isAddSquadMemberModalOpen}
          onClose={() => setIsAddSquadMemberModalOpen(false)}
          apiBaseUrl={apiBaseUrl}
          seasonId={String(resolvedSeasonId || '').trim()}
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          onAdd={async (payload) => {
            const teamIdValue = String(payload.project_id || '').trim();
            const seasonUuid = String(resolvedSeasonId || '').trim();
            const userIdValue = String(payload.user_id || '').trim();
            if (!teamIdValue || !seasonUuid || !userIdValue) return;

            try {
              setAddingMember(true);
              const body: any = {
                user_id: Number(userIdValue),
                role: 'viewer',
                period_id: seasonUuid,
                metadata: {
                  position: String(payload.position || '').trim(),
                  shirt_number: String(payload.shirt_number || '').trim(),
                },
              };

              const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamIdValue)}/members/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify(body),
              });

              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to add member');
              }

              // Optimistically reflect the new membership in the current squad list.
              // (Prevents confusing UX when the add succeeds but the refreshed list is stale.)
              try {
                const created: any = await res.json().catch(() => null);
                const createdMembership = created?.data ?? created;
                const createdId = String(createdMembership?.id || '').trim();
                if (createdId) {
                  setMembers((prev) => {
                    const list = Array.isArray(prev) ? prev : [];
                    if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                    return [createdMembership, ...list];
                  });
                }
              } catch {
                // ignore
              }

              setMembersReloadToken((x) => x + 1);
            } finally {
              setAddingMember(false);
            }
          }}
        />
      </div>
    </>
  );
};

export default ProjectSeasonDetailPage;
