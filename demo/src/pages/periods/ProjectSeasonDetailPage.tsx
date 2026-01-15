import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import {
  BreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
  PageContent,
  PageHeader,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
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
import { createTeamreelDemoTransaction } from '../../utils/teamreelTransactions';
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
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`
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
      { label: org?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'squad', label: 'Squad' },
  ];

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
    <AppShell>
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
                onClick={async () => {
                  try {
                    const orgIdForTxn = String(org?.id || '').trim();
                    const projectIdForTxn = String(project?.id || '').trim();
                    const seasonUuid = String(resolvedSeasonId || effectiveSeasonId || '').trim();
                    const currentUserId = Number((user as any)?.id);

                    if (!orgIdForTxn || !projectIdForTxn || !seasonUuid) {
                      alert('Missing org/project/season context for transaction');
                      return;
                    }
                    if (!Number.isFinite(currentUserId)) {
                      alert('No current user id available');
                      return;
                    }

                    await createTeamreelDemoTransaction({
                      apiBaseUrl,
                      scope: 'season',
                      organizationId: orgIdForTxn,
                      projectId: projectIdForTxn,
                      seasonId: seasonUuid,
                      periodId: seasonUuid,
                      activityId: null,
                      currentUserId,
                      chargedUserId: null,
                    });

                    // Switch to the transactions tab so the result is visible immediately.
                    navigateToTab('transactions');
                  } catch (e: any) {
                    alert(e?.message || 'Failed to create transaction');
                  }
                }}
                style={actionButtonStyle('primary')}
              >
                Create transaction
              </button>
            </div>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <Card><div style={{ padding: '16px' }}>Loading...</div></Card>
          ) : (
            <>
              {/* Tabs (match TeamDetail/ProjectDetail) */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  borderBottom: '1px solid var(--app-border)',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--app-border)',
                      borderBottom: activeTab === tab.id ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                      backgroundColor: activeTab === tab.id ? 'var(--app-surface)' : 'var(--app-surface-2)',
                      color: 'var(--app-text)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: activeTab === tab.id ? 600 : 500,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

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
                                        to={`${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`}
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

                  <h3 className="text-lg font-semibold mb-4">Hierarchy: Competitions & Matches (grouped by competition)</h3>
                  {competitionsLoading ? (
                    <Alert variant="info">Loading competitions…</Alert>
                  ) : competitions.length === 0 ? (
                    <Alert variant="info">No competitions found in this season.</Alert>
                  ) : (
                    (() => {
                      const matchesNotice = matchesLoading ? (
                        <div style={{ marginBottom: '10px' }}>
                          <Alert variant="info">Loading matches…</Alert>
                        </div>
                      ) : null;

                      const normalized = hierarchySearch.trim().toLowerCase();
                      const filteredCompetitions = !normalized
                        ? competitions
                        : competitions.filter((c) => {
                            const compName = String(c?.name || '').toLowerCase();
                            if (compName.includes(normalized)) return true;
                            const compId = String(c?.id || '');
                            const compMatches = matches.filter((m: any) => String(m.period_id || m.period?.id || '') === compId);
                            return compMatches.some((m: any) => String(m?.title || m?.name || '').toLowerCase().includes(normalized));
                          });

                      return (
                        <>
                          {matchesNotice}
                          {filteredCompetitions.map((competition) => {
                        const compId = String(competition.id);
                        const compMatches = matches
                          .filter((m: any) => String(m.period_id || m.period?.id || '') === compId)
                          .slice(0, 10);

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
                                to={`${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`}
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

                            {matchesLoading ? (
                              <div style={{ paddingLeft: '16px', color: 'var(--app-muted-text)', fontSize: '14px' }}>Loading matches…</div>
                            ) : compMatches.length === 0 ? (
                              <div style={{ paddingLeft: '16px', color: 'var(--app-muted-text)', fontSize: '14px' }}>No matches in this competition</div>
                            ) : (
                              <div style={{ overflowX: 'auto', marginLeft: '16px' }}>
                                <Table style={compactTableStyle}>
                                  <thead>
                                    <tr>
                                      <th style={compactThStyle}>Match</th>
                                      <th style={compactThStyle}>Date</th>
                                      <th style={compactThStyle} className="text-right"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compMatches.map((match: any) => (
                                      <tr key={match.id}>
                                        <td style={compactTextTdStyle}>
                                          <Link
                                            to={`${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}/matches/${(match as any).slug || match.id}`}
                                            className="text-blue-600 hover:underline"
                                            style={{ textDecoration: 'none' }}
                                          >
                                            {match.title || match.name || 'Match'}
                                          </Link>
                                        </td>
                                        <td style={compactTextTdStyle}>{match.start_time ? new Date(match.start_time).toLocaleString() : '—'}</td>
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
                                                      setMatches((prev) => prev.filter((m) => String(m.id) !== String(match.id)));
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
                              </div>
                            )}
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
                          style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '140px', fontWeight: 500 }}
                        >
                          Add User
                        </button>
                        <div style={{ color: 'var(--app-muted-text)', fontSize: '13px' }}>
                          Add a user to this season’s squad.
                        </div>
                      </div>
                    )}

                    {membersLoading && <Alert variant="info">Loading squad…</Alert>}
                    {membersError && <Alert variant="error">{membersError}</Alert>}

                    {!membersLoading && !membersError && members.length === 0 ? (
                      <Alert variant="info">No members found for this season.</Alert>
                    ) : !membersLoading && !membersError ? (
                      <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                          <thead>
                            <tr>
                              <th style={compactThStyle}>Name</th>
                              <th style={compactThStyle}>Email</th>
                              <th style={compactThStyle}>Role</th>
                              <th style={compactThStyle}>Position</th>
                              <th style={compactThStyle}>#</th>
                              <th style={compactThStyle} className="text-right">Actions</th>
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
                              const role = String(m.role || 'member');
                              const position = m.metadata?.position || '—';
                              const shirtNumber = m.metadata?.shirt_number ?? '';
                              const membershipId = String(m.id || '').trim();
                              const userId = memberUser?.id;

                              return (
                                <tr key={membershipId}>
                                  <td style={compactTextTdStyle}>
                                    {userId ? (
                                      <Link
                                        to={`/users/${userId}`}
                                        className="text-blue-600 hover:underline"
                                        style={{ textDecoration: 'none' }}
                                      >
                                        {name}
                                      </Link>
                                    ) : (
                                      name
                                    )}
                                  </td>
                                  <td style={compactTextTdStyle}>{email}</td>
                                  <td style={compactTdStyle}>
                                    <Badge variant={role === 'admin' || role === 'manager' ? 'warning' : 'default'}>
                                      {role}
                                    </Badge>
                                  </td>
                                  <td style={compactTextTdStyle}>{position}</td>
                                  <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                                  <td style={compactTdStyle}>
                                    <div style={compactActionsStyle}>
                                      {userId ? (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => navigate(`/users/${userId}`)}
                                          style={actionButtonStyle('primary')}
                                        >
                                          View
                                        </button>
                                      ) : (
                                        <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                                      )}

                                      {userCanEditProject && membershipId && (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={async () => {
                                            if (!window.confirm(`Remove ${name} from this season squad?`)) return;
                                            const projectIdForMembers = String((project as any)?.id || '').trim();
                                            if (!projectIdForMembers) return;
                                            try {
                                              const res = await fetch(
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
                                                const text = await res.text();
                                                throw new Error(text || 'Failed to remove member');
                                              }
                                              setMembersReloadToken((x) => x + 1);
                                            } catch (e) {
                                              alert(e instanceof Error ? e.message : 'Failed to remove member');
                                            }
                                          }}
                                          style={actionButtonStyle('danger')}
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    ) : null}
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
                                  to={`${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`}
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
                                  const compKey = periodPathKey(match.period as any) || compId;
                                  const matchKey = (match as any).slug || match.id;
                                  const matchPath = compId
                                    ? `${seasonsBasePath}/${seasonPathKey}/competitions/${compKey}/matches/${matchKey}`
                                    : `/matches/${matchKey}`;
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
                                    to={`${seasonsBasePath}/${seasonPathKey}/competitions/${String(match.period?.id)}`}
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
                onCreateTransaction={async () => {
                  const orgIdForTxn = String(org?.id || '').trim();
                  const projectIdForTxn = String(project?.id || '').trim();
                  const seasonUuid = String(resolvedSeasonId || effectiveSeasonId || '').trim();
                  const currentUserId = Number((user as any)?.id);

                  if (!orgIdForTxn || !projectIdForTxn || !seasonUuid) {
                    throw new Error('Missing org/project/season context');
                  }
                  if (!Number.isFinite(currentUserId)) {
                    throw new Error('No current user id');
                  }

                  await createTeamreelDemoTransaction({
                    apiBaseUrl,
                    scope: 'season',
                    organizationId: orgIdForTxn,
                    projectId: projectIdForTxn,
                    seasonId: seasonUuid,
                    periodId: seasonUuid,
                    activityId: null,
                    currentUserId,
                    chargedUserId: null,
                  });
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

            // Reload competitions list (matches will be fetched on-demand).
            if (resolvedSeasonId) {
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

            // Refresh matches if currently visible.
            if (activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'competitions') {
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
    </AppShell>
  );
};

export default ProjectSeasonDetailPage;
