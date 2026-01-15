import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import { useAuth } from '@django-core/auth-ui';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };

type Participation = {
  id: string;
  member?: { id: string; user_name?: string };
  role?: string;
  status?: string;
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    team_name?: string;
    team_id?: string;
  };
};

type ActivityEvent = {
  id: string;
  event_type: string;
  minute?: number;
  team_project?: { id: string; name: string };
  member?: { id: string; user_name?: string };
  related_member?: { id: string; user_name?: string };
  data?: any;
};

type OrgMember = {
  id: string; // organisation membership id (uuid)
  role?: string; // organisation role (admin/member)
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

type ProjectMember = {
  id: string;
  role?: string; // viewer/editor/admin
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  user_id?: string | number;
};

type MatchDetail = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  activity_type?: string;
  project: { id: string; name: string; slug?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  period?: { id: string; name: string; parent_period?: { id: string; name: string } | null };
  metadata?: Record<string, any>;
  participations?: Participation[];
  events?: ActivityEvent[];
};

type Period = {
  id: string;
  name: string;
  parent_period?: { id: string; name: string } | null;
};

const getEnvelopeData = <T,>(raw: any): T => {
  return (raw?.data ?? raw) as T;
};

const getEnvelopeListResults = <T,>(raw: any): T[] => {
  const envelope = raw?.data ?? raw;
  const results = envelope?.results ?? envelope?.data?.results ?? envelope?.data ?? envelope;
  return Array.isArray(results) ? (results as T[]) : [];
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

export default function HierarchyMatchDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { orgId, projectId, seasonId, competitionId, matchId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
    clubId?: string;
  }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competition, setCompetition] = useState<Period | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [resolvedSeasonUuid, setResolvedSeasonUuid] = useState<string>('');
  const [resolvedCompetitionUuid, setResolvedCompetitionUuid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  const matchWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  const [eligibleMembers, setEligibleMembers] = useState<OrgMember[]>([]);
  const [orgMembersAll, setOrgMembersAll] = useState<OrgMember[]>([]);
  const [teamProjectMembers, setTeamProjectMembers] = useState<ProjectMember[]>([]);
  const [clubProjectMembers, setClubProjectMembers] = useState<ProjectMember[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [addHomeMemberId, setAddHomeMemberId] = useState<string>('');
  const [addAwayMemberId, setAddAwayMemberId] = useState<string>('');

  const isTeamRoute = Boolean(clubId);
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const effectiveCompetitionId = String(competitionId || '').trim();
  const effectiveMatchId = String(matchId || '').trim();

  const seasonsBasePath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'match', 'lineup', 'date']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const base = `${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}/matches/${effectiveMatchId}`;
    if (tabId === 'overview') {
      navigate(base);
      return;
    }
    navigate(`${base}?tab=${encodeURIComponent(tabId)}`);
  };

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !seasonKeyOrId || !effectiveCompetitionId || !effectiveMatchId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes, matchRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
            { credentials: 'include' }
          ),
          isTeamRoute
            ? fetch(
                `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
                { credentials: 'include' }
              )
            : Promise.resolve(null as any),
          fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(effectiveMatchId)}/`, { credentials: 'include' }),
        ]);

        if (orgRes.ok) setOrg(getEnvelopeData(await orgRes.json()));
        let projectJson: Project | null = null;
        if (projectRes.ok) {
          projectJson = getEnvelopeData<Project>(await projectRes.json());
          setProject(projectJson);
        }
        if (isTeamRoute && clubRes?.ok) setClub(getEnvelopeData(await clubRes.json()));

        if (!projectJson?.id) throw new Error('Failed to load project');

        // Resolve season UUID from URL param (UUID or slugified name) using root periods only
        let seasonUuid = '';
        if (looksLikeUuid(seasonKeyOrId)) {
          seasonUuid = String(seasonKeyOrId).trim();
        } else {
          const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(
            String(projectJson.id)
          )}&parent_id=null&page_size=500`;
          const rootRes = await fetch(rootPeriodsUrl, { credentials: 'include' });
          if (rootRes.ok) {
            const rootRaw: any = await rootRes.json().catch(() => null);
            const rootPeriods = getEnvelopeListResults<Period>(rootRaw);
            const resolved = rootPeriods.find((p: any) => periodPathKey(p) === String(seasonKeyOrId));
            seasonUuid = String((resolved as any)?.id || '').trim();
          }
        }

        // Resolve competition UUID from URL param (UUID or slugified name) against season children
        let competitionUuid = '';
        if (looksLikeUuid(effectiveCompetitionId)) {
          competitionUuid = String(effectiveCompetitionId).trim();
        } else if (seasonUuid) {
          const childrenUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(seasonUuid)}&page_size=500`;
          const childrenRes = await fetch(childrenUrl, { credentials: 'include' });
          if (childrenRes.ok) {
            const childrenRaw: any = await childrenRes.json().catch(() => null);
            const children = getEnvelopeListResults<Period>(childrenRaw);
            const resolved = children.find((p: any) => periodPathKey(p) === String(effectiveCompetitionId));
            competitionUuid = String((resolved as any)?.id || '').trim();
          }
        }

        if (!seasonUuid) throw new Error('Season not found');
        if (!competitionUuid) throw new Error('Competition not found');

        setResolvedSeasonUuid(seasonUuid);
        setResolvedCompetitionUuid(competitionUuid);

        const [seasonRes, competitionRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, { credentials: 'include' }),
        ]);

        if (!seasonRes.ok) throw new Error('Failed to load season');
        const seasonJson = getEnvelopeData<Period>(await seasonRes.json());
        setSeason(seasonJson);

        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const competitionJson = getEnvelopeData<Period>(await competitionRes.json());
        setCompetition(competitionJson);

        // Canonicalize URL to slugs when possible
        const desiredSeasonKey = periodPathKey(seasonJson) || '';
        const desiredCompetitionKey = periodPathKey(competitionJson) || '';
        if (
          desiredSeasonKey &&
          desiredCompetitionKey &&
          (String(desiredSeasonKey) !== String(seasonKeyOrId) ||
            String(desiredCompetitionKey) !== String(effectiveCompetitionId))
        ) {
          const suffix = location.search ? location.search : '';
          navigate(
            `${seasonsBasePath}/${desiredSeasonKey}/competitions/${desiredCompetitionKey}/matches/${effectiveMatchId}${suffix}`,
            { replace: true }
          );
          return;
        }

        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        const matchJson = getEnvelopeData<MatchDetail>(await matchRes.json());
        setMatch(matchJson);

        const desiredMatchKey = String((matchJson as any)?.slug || '').trim();
        if (desiredMatchKey && desiredMatchKey !== String(effectiveMatchId)) {
          const suffix = location.search ? location.search : '';
          const seasonKey = periodPathKey(seasonJson) || String(seasonKeyOrId);
          const compKey = periodPathKey(competitionJson) || String(effectiveCompetitionId);
          navigate(
            `${seasonsBasePath}/${seasonKey}/competitions/${compKey}/matches/${desiredMatchKey}${suffix}`,
            { replace: true }
          );
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    orgSlugOrId,
    projectSlugOrId,
    clubSlugOrId,
    isTeamRoute,
    seasonKeyOrId,
    effectiveCompetitionId,
    effectiveMatchId,
  ]);

  useEffect(() => {
    const run = async () => {
      if (!match?.project?.id || !orgSlugOrId) return;
      try {
        setRosterLoading(true);
        setRosterError(null);

        const asArray = (value: any): any[] => (Array.isArray(value) ? value : []);
        const unwrap = (raw: any): any => raw?.data ?? raw;
        const extractList = (payload: any): any[] => {
          const unwrapped = unwrap(payload);
          if (Array.isArray(unwrapped)) return unwrapped;

          // Common envelope shapes across the API:
          // - { data: [...] }
          // - { data: { results: [...] } }
          // - { data: { data: [...] } }
          // - { data: { data: { results: [...] } } }
          if (Array.isArray(unwrapped?.results)) return unwrapped.results;
          if (Array.isArray(unwrapped?.items)) return unwrapped.items;
          if (Array.isArray(unwrapped?.data)) return unwrapped.data;
          if (Array.isArray(unwrapped?.data?.results)) return unwrapped.data.results;
          if (Array.isArray(unwrapped?.data?.items)) return unwrapped.data.items;
          if (Array.isArray(unwrapped?.data?.data)) return unwrapped.data.data;
          if (Array.isArray(unwrapped?.data?.data?.results)) return unwrapped.data.data.results;

          return [];
        };

        // 1) Project members (user ids) — prefer season-scoped roster
        const seasonUuid = String(resolvedSeasonUuid || '').trim();
        const baseMembersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(match.project.id))}/members/`;

        const fetchMembers = async (withSeasonFilter: boolean) => {
          const params = new URLSearchParams();
          params.set('page_size', '500');
          if (withSeasonFilter && seasonUuid) params.set('period', seasonUuid);
          const res = await fetch(`${baseMembersUrl}?${params.toString()}`, { credentials: 'include' });
          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            return { ok: false, status: res.status, detail, list: [] as any[] };
          }
          const raw = await res.json().catch(() => null);
          return { ok: true, status: res.status, detail: '', list: extractList(raw) };
        };

        let projectMembers: any[] = [];
        let lastRosterError: string | null = null;
        if (seasonUuid) {
          const seasonAttempt = await fetchMembers(true);
          if (seasonAttempt.ok) {
            projectMembers = seasonAttempt.list;
          } else {
            lastRosterError = `Failed to load season roster (${seasonAttempt.status}) ${seasonAttempt.detail || ''}`.trim();
          }

          // Fallback: if season roster is empty (legacy data), use full team roster
          if (projectMembers.length === 0) {
            const fallbackAttempt = await fetchMembers(false);
            if (fallbackAttempt.ok) {
              projectMembers = fallbackAttempt.list;
            } else {
              lastRosterError = `Failed to load team roster (${fallbackAttempt.status}) ${fallbackAttempt.detail || ''}`.trim();
            }
          }
        } else {
          const fallbackAttempt = await fetchMembers(false);
          if (fallbackAttempt.ok) {
            projectMembers = fallbackAttempt.list;
          } else {
            lastRosterError = `Failed to load team roster (${fallbackAttempt.status}) ${fallbackAttempt.detail || ''}`.trim();
          }
        }

        if (projectMembers.length === 0 && lastRosterError) {
          throw new Error(lastRosterError);
        }

        if (!Array.isArray(projectMembers)) projectMembers = [];
        setTeamProjectMembers(projectMembers as ProjectMember[]);
        const projectUserIds = new Set(
          asArray(projectMembers)
            .map((m: any) => String(m?.user?.id ?? m?.user_id ?? ''))
            .filter(Boolean)
        );

        // 2) Organisation memberships (membership ids + user)
        const orgMembersRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(String(orgSlugOrId))}/members/?page_size=1000`,
          { credentials: 'include' }
        );
        if (!orgMembersRes.ok) throw new Error('Failed to load organisation members');
        const orgMembersRaw = await orgMembersRes.json().catch(() => null);
        const orgMembers = extractList(orgMembersRaw) as OrgMember[];
        setOrgMembersAll(orgMembers);

        // Intersection: project members must exist as org membership.
        const eligible = asArray(orgMembers)
          .filter((m: any) => m?.id && projectUserIds.has(String(m?.user?.id ?? '')))
          .sort((a: any, b: any) => {
            const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
            const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
            return an.localeCompare(bn);
          });

        setEligibleMembers(eligible);

        // Optional: club project members (to detect club admin/supporter personas)
        if (club?.id) {
          const clubMembersRes = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/members/?page_size=500`,
            { credentials: 'include' }
          );
          if (clubMembersRes.ok) {
            const clubMembersRaw = await clubMembersRes.json().catch(() => null);
            const clubMembers = extractList(clubMembersRaw);
            setClubProjectMembers(clubMembers as ProjectMember[]);
          }
        }
      } catch (e) {
        setRosterError(e instanceof Error ? e.message : 'Failed to load roster');
      } finally {
        setRosterLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, club?.id, match?.project?.id, orgSlugOrId, resolvedSeasonUuid]);

  const breadcrumbs = useMemo(() => {
    const projectDetailPath = isTeamRoute
      ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}`
      : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

    return [
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
        label: season?.name || 'Season',
        onClick: () => navigate(`${seasonsBasePath}/${seasonKeyOrId}`),
      },
      {
        label: competition?.name || 'Competition',
        onClick: () => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`),
      },
      { label: match?.title || 'Match', current: true },
    ] as any[];
  }, [
    club,
    clubSlugOrId,
    competition?.name,
    effectiveCompetitionId,
    isTeamRoute,
    match?.title,
    navigate,
    org?.name,
    orgSlugOrId,
    project?.name,
    projectSlugOrId,
    season?.name,
    seasonKeyOrId,
    seasonsBasePath,
  ]);

  const personaGroups = useMemo(() => {
    const byMemberId = new Map<string, OrgMember>();
    for (const m of orgMembersAll) byMemberId.set(String(m.id), m);

    const roleByTeamUserId = new Map<string, string>();
    for (const m of teamProjectMembers) {
      const uid = String(m?.user?.id ?? m?.user_id ?? '').trim();
      if (uid) roleByTeamUserId.set(uid, String(m.role || '').toLowerCase());
    }

    const roleByClubUserId = new Map<string, string>();
    for (const m of clubProjectMembers) {
      const uid = String(m?.user?.id ?? m?.user_id ?? '').trim();
      if (uid) roleByClubUserId.set(uid, String(m.role || '').toLowerCase());
    }

    const groups: Record<string, Participation[]> = {
      'Land Admin': [],
      'Club Admin': [],
      'Team Admin': [],
      'Team Member': [],
      Supporter: [],
      Other: [],
    };

    for (const p of match?.participations ?? []) {
      const memberId = String(p.member?.id || '').trim();
      const orgMember = memberId ? byMemberId.get(memberId) : undefined;
      const userId = String(orgMember?.user?.id ?? '').trim();

      const teamRole = userId ? roleByTeamUserId.get(userId) : undefined;
      const clubRole = userId ? roleByClubUserId.get(userId) : undefined;
      const orgRole = String(orgMember?.role || '').toLowerCase();

      if (teamRole === 'admin') {
        groups['Team Admin'].push(p);
      } else if (clubRole === 'admin') {
        groups['Club Admin'].push(p);
      } else if (teamRole) {
        groups['Team Member'].push(p);
      } else if (clubRole) {
        groups.Supporter.push(p);
      } else if (orgRole === 'admin') {
        groups['Land Admin'].push(p);
      } else {
        groups.Other.push(p);
      }
    }

    return groups;
  }, [clubProjectMembers, match?.participations, orgMembersAll, teamProjectMembers]);

  if (loading) {
    return (
      <AppShell>
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match…</div>
        </PageContent>
      </AppShell>
    );
  }

  if (error || !match) {
    return (
      <AppShell>
        <PageContent>
          <Alert variant="error">{error || 'Match not found'}</Alert>
          <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </PageContent>
      </AppShell>
    );
  }

  const date = match.start_time ? new Date(match.start_time) : null;
  const status = String(match.metadata?.status || 'scheduled');

  const homeTeamName = match.project?.name || 'Home';
  const awayTeamName = match.opponent_project?.name || 'Opponent';
  const scoreDisplay = status === 'finished'
    ? `${match.metadata?.home_score ?? 0} - ${match.metadata?.away_score ?? 0}`
    : 'vs';

  const sortLineup = (a: Participation, b: Participation) => {
    const isStarterA = String(a.role || '').toLowerCase() === 'starter';
    const isStarterB = String(b.role || '').toLowerCase() === 'starter';
    if (isStarterA && !isStarterB) return -1;
    if (!isStarterA && isStarterB) return 1;

    if (isStarterA) {
      if (a.data?.position === 'GK') return -1;
      if (b.data?.position === 'GK') return 1;
    }

    return (a.data?.jersey_number || 99) - (b.data?.jersey_number || 99);
  };

  const allParticipations = match.participations || [];
  const homeParticipations = allParticipations
    .filter(
      (p) => p.data?.side === 'home' || String(p.data?.team_id || '') === String(match.project?.id || '')
    )
    .sort(sortLineup);
  const awayParticipations = allParticipations
    .filter(
      (p) =>
        p.data?.side === 'away' ||
        (match.opponent_project && String(p.data?.team_id || '') === String(match.opponent_project.id))
    )
    .sort(sortLineup);

  const matchEvents = (match.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

  const renderLineup = (participations: Participation[] = []) => (
    <Table>
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Name</th>
          <th className="w-16">Pos</th>
        </tr>
      </thead>
      <tbody>
        {participations.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-gray-500 text-center py-4">
              No lineup available
            </td>
          </tr>
        ) : (
          participations.map((p) => (
            <tr key={p.id} className={String(p.role || '').toLowerCase() !== 'starter' ? 'bg-gray-50' : ''}>
              <td className="font-mono text-sm">{p.data?.jersey_number || '-'}</td>
              <td>
                <div className="font-medium">
                  {p.member?.user_name || 'Unknown Player'}
                  {p.data?.is_captain && (
                    <span className="ml-2 text-yellow-500" title="Captain">
                      ©
                    </span>
                  )}
                </div>
                {String(p.role || '').toLowerCase() !== 'starter' && p.role && (
                  <div className="text-xs text-gray-500 capitalize">{p.role.replace('_', ' ')}</div>
                )}
              </td>
              <td className="text-xs font-bold text-gray-400">{p.data?.position}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  const renderEventIcon = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'goal':
        return '⚽';
      case 'card_yellow':
        return '🟨';
      case 'card_red':
        return '🟥';
      case 'substitution':
        return 'cS'; // 🔄 glyph issue sometimes
      case 'injury':
        return '🚑';
      default:
        return '•';
    }
  };

  const displayMemberName = (m: OrgMember) => {
    const u: any = (m as any)?.user;
    const full = String(u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim()).trim();
    return full || String(u?.email || '—');
  };

  const upsertParticipationInState = (p: Participation) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const prevParts = prev.participations || [];
      const next = [...prevParts.filter((x) => String(x.id) !== String(p.id)), p];
      return { ...prev, participations: next };
    });
  };

  const removeParticipationFromState = (participationId: string) => {
    setMatch((prev) => {
      if (!prev) return prev;
      return { ...prev, participations: (prev.participations || []).filter((p) => String(p.id) !== String(participationId)) };
    });
  };

  const refreshMatch = async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const raw = await res.json().catch(() => null);
    setMatch(getEnvelopeData(raw));
  };

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    const raw = await res.json().catch(() => null);
    return (
      raw?.error?.message ||
      raw?.detail ||
      (typeof raw === 'string' ? raw : null) ||
      fallback
    );
  };

  const createParticipation = async (memberId: string, side: 'home' | 'away') => {
    if (!memberId) return;
    const teamId = side === 'home' ? String(match.project.id) : String(match.opponent_project?.id || '');
    const teamName = side === 'home' ? homeTeamName : awayTeamName;
    const body: any = {
      member_id: memberId,
      activity_id: String(match.id),
      role: 'starter',
      status: 'confirmed',
      data: {
        side,
        team_id: teamId || undefined,
        team_name: teamName,
      },
    };

    const res = await fetch(`${apiBaseUrl}/api/v1/participations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to add participant'));
    }
    const created = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(created));
    await refreshMatch();
  };

  const updateParticipation = async (p: Participation, patch: any) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to update participant'));
    }
    const updated = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(updated));
    await refreshMatch();
  };

  const deleteParticipation = async (p: Participation) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to remove participant'));
    }
    removeParticipationFromState(String(p.id));
    await refreshMatch();
  };

  const renderLineupEditor = (side: 'home' | 'away') => {
    const isHome = side === 'home';
    const title = isHome ? homeTeamName : awayTeamName;
    const selected = (isHome ? homeParticipations : awayParticipations) || [];
    const allSelectedMemberIds = new Set((match.participations || []).map((p) => String(p.member?.id || '')));

    // Available: eligible members that aren't already in the match (any side)
    const available = eligibleMembers.filter((m) => !allSelectedMemberIds.has(String(m.id)));
    const currentAddId = isHome ? addHomeMemberId : addAwayMemberId;
    const setCurrentAddId = isHome ? setAddHomeMemberId : setAddAwayMemberId;

    return (
      <Card title={`Lineup: ${title}`}>
        {rosterError && <Alert variant="error">{rosterError}</Alert>}
        {!rosterError && !rosterLoading && eligibleMembers.length === 0 && (
          <Alert variant="warning">
            No eligible players found. Add players to this season’s squad first, or ensure you have access to view the team roster.
          </Alert>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <label className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
            Add player
          </label>
          <select
            value={currentAddId}
            onChange={(e) => setCurrentAddId(e.target.value)}
            disabled={rosterLoading || available.length === 0}
            style={{
              minWidth: '240px',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text)',
            }}
          >
            <option value="">{rosterLoading ? 'Loading roster…' : available.length ? 'Select player…' : 'No players available'}</option>
            {available.map((m) => (
              <option key={String(m.id)} value={String(m.id)}>
                {displayMemberName(m)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={!currentAddId}
            onClick={async () => {
              try {
                await createParticipation(currentAddId, side);
                setCurrentAddId('');
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to add player');
              }
            }}
          >
            Add to lineup
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: '140px' }}>Role</th>
                <th style={{ width: '90px' }} className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {selected.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-gray-500 text-center py-4">
                    No lineup selected
                  </td>
                </tr>
              ) : (
                selected.map((p) => (
                  <tr key={String(p.id)}>
                    <td>
                      <div className="font-medium">{p.member?.user_name || 'Unknown Player'}</div>
                      {p.data?.jersey_number ? (
                        <div className="text-xs text-gray-500">#{p.data.jersey_number}</div>
                      ) : null}
                    </td>
                    <td>
                      <select
                        value={String(p.role || 'starter')}
                        onChange={async (e) => {
                          const nextRole = e.target.value;
                          try {
                            await updateParticipation(p, { role: nextRole });
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to update role');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid var(--app-border)',
                          background: 'var(--app-surface)',
                          color: 'var(--app-text)',
                        }}
                      >
                        <option value="starter">Starter</option>
                        <option value="substitute">Substitute</option>
                      </select>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (!window.confirm('Remove this player from the lineup?')) return;
                          try {
                            await deleteParticipation(p);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to remove player');
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    );
  };

  const roleLabel = (raw: any): string => {
    const r = String(raw || '').toLowerCase();
    if (r === 'land_admin' || r === 'land admin') return 'Land Admin';
    if (r === 'club_admin' || r === 'club admin') return 'Club Admin';
    if (r === 'team_admin' || r === 'team admin') return 'Team Admin';
    if (r === 'team_member' || r === 'team member') return 'Team Member';
    if (r === 'supporter') return 'Supporter';
    if (r === 'admin') return 'Admin';
    if (r === 'member') return 'Member';
    if (r === 'viewer') return 'Viewer';
    if (r === 'editor') return 'Editor';
    return raw ? String(raw) : '—';
  };


  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'match', label: 'Match' },
    { id: 'lineup', label: 'Lineup' },
    { id: 'date', label: 'Date' },
    { id: 'transactions', label: 'Transactions' },
  ];

  return (
    <AppShell>
      <div>
        <PageHeader
          title={match.title}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => navigate(`/studio/create?context=${match.id}`)}>
                ✨ Generate Content (AI)
              </Button>
              <Button
                onClick={() => setIsCreateTxnModalOpen(true)}
              >
                Create transaction
              </Button>
            </div>
          }
        />

        <CreateTransactionModal
          isOpen={isCreateTxnModalOpen}
          onClose={() => setIsCreateTxnModalOpen(false)}
          onCreated={() => {
            navigateToTab('transactions');
          }}
          title="Create match transaction"
          scope="match"
          organizationId={String(org?.id || '').trim()}
          defaultProjectId={project?.id != null ? String(project.id) : null}
          seasonId={String(resolvedSeasonUuid || '').trim() || null}
          periodId={String(match?.period?.id || '').trim() || null}
          activityId={String(match?.id || '').trim() || null}
          currentUserId={Number((user as any)?.id)}
          chargedUserId={Number((user as any)?.id)}
          walletOptions={matchWalletOptions}
        />

        <PageContent>
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
              <Card className="mb-6">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                  }}
                >
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{homeTeamName}</h3>
                    <Badge variant="default">Home</Badge>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: '150px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{scoreDisplay}</div>
                    <div style={{ marginTop: '12px', color: 'var(--app-text-secondary)' }}>
                      <Badge variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}>
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                      {date ? `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
                    </div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{awayTeamName}</h3>
                    <Badge variant="default">Away</Badge>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    borderTop: '1px solid var(--app-border)',
                    paddingTop: '10px',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  📍 {match.location || match.metadata?.venue || 'Unknown Venue'} • 🏆 {competition?.name || match.period?.name || 'Competition'}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Match Events">
                  {matchEvents.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">No events recorded.</div>
                  ) : (
                    <div className="space-y-3">
                      {matchEvents.map((evt) => {
                        const isHome = String(evt.team_project?.id || '') === String(match.project?.id || '');
                        return (
                          <div key={evt.id} className="flex items-center text-sm">
                            <div className="font-mono font-bold w-8 text-right mr-3 text-gray-400">{evt.minute}'</div>
                            <div className={`flex-1 flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                              <span className="text-xl mx-2" title={evt.event_type}>
                                {renderEventIcon(evt.event_type)}
                              </span>
                              <div>
                                <div className="font-medium">{evt.member?.user_name || 'Unknown'}</div>
                                {evt.related_member && (
                                  <div className="text-xs text-gray-500">({evt.related_member.user_name})</div>
                                )}
                                {String(evt.event_type || '').toLowerCase() === 'substitution' && evt.related_member && (
                                  <div className="text-xs text-green-600">IN: {evt.related_member.user_name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card title="Lineups">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{homeTeamName}</div>
                      {renderLineup(homeParticipations)}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{awayTeamName}</div>
                      {renderLineup(awayParticipations)}
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <TransactionsPanel
                title="Transactions"
                description="Match-scoped transactions (usage_event.metadata.activity_id)"
                filters={{
                  organization_id: String(org?.id || ''),
                  project_id: String(project?.id || ''),
                  activity_id: String(match?.id || ''),
                }}
              />
            </div>
          )}

          {activeTab === 'hierarchy' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '13px', marginBottom: '10px' }}>
                  Navigate the hierarchy around this match.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}`)}>
                    Season
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`)}
                  >
                    Competition
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}?tab=matches`)}
                  >
                    Matches
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'match' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Match Details</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <tbody>
                      <tr>
                        <th style={{ textAlign: 'left', width: '180px' }}>Title</th>
                        <td>{match.title}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Home</th>
                        <td>{homeTeamName}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Away</th>
                        <td>{awayTeamName}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Status</th>
                        <td>{status}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Venue</th>
                        <td>{match.location || match.metadata?.venue || '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Competition</th>
                        <td>
                          {competition ? (
                            <Link
                              to={`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`}
                              className="text-blue-600 hover:underline"
                              style={{ textDecoration: 'none' }}
                            >
                              {competition.name}
                            </Link>
                          ) : (
                            match.period?.name || '—'
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>
                    Selected users by role
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(personaGroups)
                      .filter(([, users]) => users.length > 0)
                      .map(([group, users]) => (
                        <div
                          key={group}
                          style={{
                            border: '1px solid var(--app-border)',
                            borderRadius: '8px',
                            padding: '12px',
                            background: 'var(--app-surface-2)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600 }}>{group}</div>
                            <Badge variant="default">{users.length}</Badge>
                          </div>
                          <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                            {users.map((p) => (
                              <div key={String(p.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500 }}>{p.member?.user_name || 'Unknown'}</span>
                                {p.role ? <Badge variant="default">{roleLabel(p.role)}</Badge> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    {Object.values(personaGroups).every((arr) => arr.length === 0) ? (
                      <Alert variant="info">No participants selected for this match.</Alert>
                    ) : null}
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--app-muted-text)' }}>Raw metadata</summary>
                    <pre
                      style={{
                        marginTop: '10px',
                        background: 'var(--app-surface-2)',
                        padding: '12px',
                        borderRadius: '6px',
                        overflowX: 'auto',
                        fontSize: '12px',
                      }}
                    >
                      {JSON.stringify(match.metadata || {}, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'lineup' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderLineupEditor('home')}
                  {match.opponent_project ? (
                    renderLineupEditor('away')
                  ) : (
                    <Card title="Lineup: Opponent">
                      <Alert variant="info">No opponent team configured for this match.</Alert>
                    </Card>
                  )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'date' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Date & Time</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <tbody>
                      <tr>
                        <th style={{ textAlign: 'left', width: '180px' }}>Start</th>
                        <td>{match.start_time ? new Date(match.start_time).toLocaleString() : '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>End</th>
                        <td>{match.end_time ? new Date(match.end_time).toLocaleString() : '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Round</th>
                        <td>{String(match.metadata?.round ?? '—')}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>
            </Card>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
}
