import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';

/* ------------------------------------------------------------------ */
/*  Hook return type                                                   */
/* ------------------------------------------------------------------ */

export interface UserDetailDataReturn {
  /* route */
  userId: string | undefined;
  orgId: string | undefined;
  navigate: ReturnType<typeof useNavigate>;
  location: ReturnType<typeof useLocation>;
  basePath: string;
  backPath: string;

  /* core data */
  user: any | null;
  setUser: (u: any | null) => void;
  loading: boolean;
  error: string | null;
  apiBaseUrl: string;
  userDisplayName: string;

  /* tabs */
  activeTab: string;
  setTab: (tab: string) => void;

  /* derived membership data */
  userOrgs: any[];
  userProjects: any[];
  primaryOrgSlug: string;
  clubMemberships: any[];
  directClubMembershipById: Map<string, any>;
  teamMemberships: any[];
  clubsForTab: any[];
  clubSlugById: Map<string, string>;
  teamSeasonPairs: Array<{
    teamId: string; teamName: string; teamSlug: string;
    clubId: string; clubName: string; seasonId: string; seasonName: string;
  }>;
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  hierarchyRows: Array<any>;

  /* relations */
  clubsById: Map<string, any>;
  linkedCompetitions: any[];
  linkedMatches: any[];
  loadingRelations: boolean;

  /* match edit/delete */
  saveMatchEdits: (matchToEdit: any, patch: any) => Promise<void>;
  deleteMatch: (matchToDelete: any) => Promise<void>;

  /* identity tab */
  identityEditing: boolean;
  setIdentityEditing: (v: boolean) => void;
  identityFirstName: string;
  setIdentityFirstName: (v: string) => void;
  identityLastName: string;
  setIdentityLastName: (v: string) => void;
  identitySaving: boolean;
  setIdentitySaving: (v: boolean) => void;
  identitySaveError: string | null;
  setIdentitySaveError: (v: string | null) => void;
  identitySaveSuccess: boolean;
  setIdentitySaveSuccess: (v: boolean) => void;

  /* balance */
  userBalance: string | null;
  userBalanceLoading: boolean;
  userBalanceError: string | null;
  userBalanceReloadToken: number;
  setUserBalanceReloadToken: React.Dispatch<React.SetStateAction<number>>;

  /* handlers */
  fetchUser: () => Promise<void>;
  handleSaveUser: (updatedUser: any) => Promise<void>;
  handleDeleteUser: () => Promise<void>;
  getCsrfToken: () => string;
  getPreferredOrganisationId: () => string;
  renderNavLink: (label: string, href?: string) => React.ReactNode;

  /* org membership CRUD */
  updateOrganisationMembershipRole: (orgSlugOrId: string, role: string) => Promise<void>;
  removeOrganisationMembership: (orgSlugOrId: string) => Promise<void>;

  /* project membership CRUD */
  updateProjectMembershipRole: (projectId: string, directMembershipId: any, role: string) => Promise<void>;
  removeProjectMembership: (projectId: string, directMembershipId?: any) => Promise<void>;

  /* modal state */
  isViewModalOpen: boolean;
  setIsViewModalOpen: (v: boolean) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: (v: boolean) => void;
  isCreateTxnModalOpen: boolean;
  setIsCreateTxnModalOpen: (v: boolean) => void;
  isMatchEditModalOpen: boolean;
  setIsMatchEditModalOpen: (v: boolean) => void;
  selectedEditMatch: any | null;
  setSelectedEditMatch: (v: any | null) => void;
  isEditMembershipModalOpen: boolean;
  setIsEditMembershipModalOpen: (v: boolean) => void;
  editingMembership: { projectId: string; projectName: string; currentRole: string; membershipId?: string } | null;
  setEditingMembership: (v: { projectId: string; projectName: string; currentRole: string; membershipId?: string } | null) => void;

  /* link modal options */
  linkOrgs: any[];
  linkClubs: any[];
  linkTeams: any[];
  linkOptionsLoading: boolean;
  linkOptionsError: string | null;

  /* transaction helpers */
  currentUserIdForTxn: number;
  targetUserIdForTxn: number;
  userWalletOptions: WalletOption[];
}

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function useUserDetailData(): UserDetailDataReturn {
  const { userId, orgId } = useParams<{ userId: string; orgId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  /* ---------- modal state --------------------------------------- */
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);
  const [linkOrgs, setLinkOrgs] = useState<any[]>([]);
  const [linkClubs, setLinkClubs] = useState<any[]>([]);
  const [linkTeams, setLinkTeams] = useState<any[]>([]);
  const [linkOptionsLoading, setLinkOptionsLoading] = useState(false);
  const [linkOptionsError, setLinkOptionsError] = useState<string | null>(null);

  const currentUserIdForTxn = Number((currentUser as any)?.id);
  const targetUserIdForTxn = Number((user as any)?.id || userId);
  const userWalletOptions = useMemo<WalletOption[]>(
    () => [
      { kind: 'default', label: 'Default (charge this user)' },
      { kind: 'organization', label: 'Organisation wallet' },
      { kind: 'me', label: 'My user wallet' },
    ],
    [],
  );

  const [editingMembership, setEditingMembership] = useState<{
    projectId: string; projectName: string; currentRole: string; membershipId?: string;
  } | null>(null);
  const [isEditMembershipModalOpen, setIsEditMembershipModalOpen] = useState(false);

  const [clubsById, setClubsById] = useState<Map<string, any>>(new Map());
  const [linkedCompetitions, setLinkedCompetitions] = useState<any[]>([]);
  const [linkedMatches, setLinkedMatches] = useState<any[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [relationsReloadToken, setRelationsReloadToken] = useState(0);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [hierarchySearch, setHierarchySearch] = useState('');

  /* ---------- balance state ------------------------------------- */
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [userBalanceLoading, setUserBalanceLoading] = useState(false);
  const [userBalanceError, setUserBalanceError] = useState<string | null>(null);
  const [userBalanceReloadToken, setUserBalanceReloadToken] = useState(0);

  /* ---------- identity tab state -------------------------------- */
  const [identityEditing, setIdentityEditing] = useState(false);
  const [identityFirstName, setIdentityFirstName] = useState('');
  const [identityLastName, setIdentityLastName] = useState('');
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaveError, setIdentitySaveError] = useState<string | null>(null);
  const [identitySaveSuccess, setIdentitySaveSuccess] = useState(false);

  /* ---------- tabs ---------------------------------------------- */
  const allowedTabs = useMemo(
    () => new Set(['overview', 'identity', 'balance', 'hierarchy', 'federations', 'clubs', 'teams', 'seasons', 'competitions', 'matches', 'transactions']),
    [],
  );

  const basePath = `/users/${userId}`;

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    return allowedTabs.has(tab) ? tab : 'overview';
  }, [allowedTabs, location.search]);

  const setTab = (tab: string) => {
    if (!allowedTabs.has(tab)) return;
    const params = new URLSearchParams(location.search);
    if (tab === 'overview') params.delete('tab');
    else params.set('tab', tab);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    navigate(`${basePath}${suffix}`);
  };

  /* ---------- helpers ------------------------------------------- */
  const getCsrfToken = (): string => {
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || ''
    );
  };

  const getPreferredOrganisationId = (): string => {
    const fromStorage = String(localStorage.getItem('django-core:currentOrgId') || '').trim();
    if (fromStorage) return fromStorage;

    const memberships =
      (user as any)?.memberships ||
      (user as any)?.organisation_memberships ||
      (user as any)?.organization_memberships;
    if (Array.isArray(memberships) && memberships.length > 0) {
      const first = memberships[0];
      const oid =
        first?.organisation?.id ||
        first?.organization?.id ||
        first?.org?.id ||
        first?.organisation_id ||
        first?.organization_id;
      if (oid) return String(oid);
    }

    return '';
  };

  const renderNavLink = (label: string, href?: string) => {
    const safe = String(label || '').trim();
    if (!href)
      return <span>{safe || '—'}</span>;
    return (
      <a
        href={href}
        onClick={(e: any) => {
          e.preventDefault();
          navigate(href);
        }}
        className="fw-600"
        style={{ color: '#007bff', textDecoration: 'none' }}
      >
        {safe || '—'}
      </a>
    );
  };

  /* ---------- derived data -------------------------------------- */
  const userOrgs = useMemo(() => {
    const orgs = user?.organisations;
    return Array.isArray(orgs) ? orgs : [];
  }, [user]);

  const userProjects = useMemo(() => {
    const projects = user?.projects;
    return Array.isArray(projects) ? projects : [];
  }, [user]);

  const primaryOrgSlug = useMemo(() => {
    if (orgId) return String(orgId);
    const first = userOrgs.find((o: any) => o?.slug) || userOrgs[0];
    return String(first?.slug || first?.id || '').trim();
  }, [orgId, userOrgs]);

  const clubMemberships = useMemo(() => {
    return userProjects.filter((p: any) => !p?.parent);
  }, [userProjects]);

  const directClubMembershipById = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of clubMemberships) {
      const id = String(c?.id || '').trim();
      if (id) m.set(id, c);
    }
    return m;
  }, [clubMemberships]);

  const teamMemberships = useMemo(() => {
    return userProjects.filter((p: any) => Boolean(p?.parent));
  }, [userProjects]);

  const clubsForTab = useMemo(() => {
    const merged = new Map<string, any>();

    for (const c of clubMemberships) {
      const id = String(c?.id || '').trim();
      if (!id) continue;
      merged.set(id, c);
    }

    for (const t of teamMemberships) {
      const clubId = String(t?.parent || '').trim();
      if (!clubId) continue;
      if (merged.has(clubId)) continue;

      const apiClub = clubsById.get(clubId);
      const inferred = {
        id: clubId,
        name: String(apiClub?.name || t?.parent_name || '').trim(),
        slug: String(apiClub?.slug || '').trim(),
        role: '',
        membership_id: null,
      };
      merged.set(clubId, inferred);
    }

    return Array.from(merged.values());
  }, [clubMemberships, teamMemberships, clubsById]);

  const clubSlugById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubMemberships) {
      const id = String(c?.id || '').trim();
      const slug = String(c?.slug || '').trim();
      if (id && slug) m.set(id, slug);
    }
    for (const [id, club] of clubsById.entries()) {
      const slug = String(club?.slug || '').trim();
      if (id && slug && !m.has(id)) m.set(id, slug);
    }
    return m;
  }, [clubMemberships, clubsById]);

  const teamSeasonPairs = useMemo(() => {
    const pairs: Array<{
      teamId: string; teamName: string; teamSlug: string;
      clubId: string; clubName: string; seasonId: string; seasonName: string;
    }> = [];
    for (const t of teamMemberships) {
      const teamId = String(t?.id || '').trim();
      const teamSlug = String(t?.slug || '').trim();
      const teamName = String(t?.name || '').trim();
      const clubId = String(t?.parent || '').trim();
      const clubName = String(t?.parent_name || '').trim();
      const seasonId = String(t?.period?.id || '').trim();
      const seasonName = String(t?.period?.name || '').trim();
      if (!teamId || !clubId || !seasonId) continue;
      pairs.push({ teamId, teamName, teamSlug, clubId, clubName, seasonId, seasonName });
    }
    const seen = new Set<string>();
    return pairs.filter((p) => {
      const k = `${p.teamId}::${p.seasonId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [teamMemberships]);

  const hierarchyRows = useMemo(() => {
    const q = hierarchySearch.trim().toLowerCase();
    const rows = teamSeasonPairs.map((p) => {
      const clubSlug = clubSlugById.get(p.clubId) || '';
      const teamPath = clubSlug
        ? `/${primaryOrgSlug}/${clubSlug}/${p.teamSlug || p.teamId}`
        : '';
      const seasonPath = clubSlug
        ? `/${primaryOrgSlug}/${clubSlug}/${p.teamSlug || p.teamId}/${p.seasonId}`
        : '';
      return { ...p, clubSlug, teamPath, seasonPath };
    });
    if (!q) return rows;
    return rows.filter((r) =>
      r.teamName.toLowerCase().includes(q) ||
      r.clubName.toLowerCase().includes(q) ||
      r.seasonName.toLowerCase().includes(q),
    );
  }, [teamSeasonPairs, hierarchySearch, clubSlugById, primaryOrgSlug]);

  const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
  const userDisplayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${userId}`
    : `User ${userId}`;

  /* ----------------------------------------------------------------
   *  Fetch / CRUD
   * -------------------------------------------------------------- */

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const status = response.status;
        let errorMsg = `Failed to fetch user details (${status})`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMsg = errorData.message;
          else if (errorData.detail) errorMsg = errorData.detail;
        } catch {
          // Ignore JSON parse error
        }
        throw new Error(errorMsg);
      }

      const rawData = await response.json();
      const userData = rawData.data || rawData;
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (updatedUser: any) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(updatedUser),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert((data as any)?.message || 'Failed to update user');
        throw new Error((data as any)?.message || 'Failed to update user');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save user changes');
      throw e;
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to delete user');
      }
      navigate(orgId ? `/organisations/${orgId}/users` : '/users');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  /* ---------- org membership CRUD ------------------------------- */
  const findOrganisationMembershipId = async (orgSlugOrId: string): Promise<string> => {
    if (!user) throw new Error('User missing');
    const slugOrId = String(orgSlugOrId || '').trim();
    if (!slugOrId) throw new Error('Missing federation');

    const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    const direct = orgs.find(
      (o: any) => String(o?.slug || o?.id || '') === slugOrId || String(o?.id || '') === slugOrId,
    );
    const directMembershipId = String(direct?.membership_id ?? '').trim();
    if (directMembershipId) return directMembershipId;

    const members = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `user-detail:org:${slugOrId}:members:${String(user.id)}`, maxPages: 50, maxItems: 10_000 },
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

  const updateOrganisationMembershipRole = async (orgSlugOrId: string, role: string) => {
    if (!user) return;
    const slugOrId = String(orgSlugOrId || '').trim();
    if (!slugOrId) return;

    const membershipId = await findOrganisationMembershipId(slugOrId);
    const res = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update federation role');
    }

    const data = await res.json().catch(() => ({}));
    if (data?.data?.detail && String(data.data.detail).includes('Promotion requested')) {
      alert('Role change requested. The user must accept the promotion before it takes effect.');
    }

    await fetchUser();
  };

  const removeOrganisationMembership = async (orgSlugOrId: string) => {
    if (!user) return;
    const slugOrId = String(orgSlugOrId || '').trim();
    if (!slugOrId) return;

    const membershipId = await findOrganisationMembershipId(slugOrId);
    const res = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to unlink federation');
    }

    await fetchUser();
  };

  /* ---------- project membership CRUD --------------------------- */
  const findProjectMembershipId = async (projectId: string, directMembershipId?: any): Promise<string> => {
    const direct = String(directMembershipId || '').trim();
    if (direct) return direct;
    if (!user) throw new Error('User missing');

    const members = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `user-detail:project:${String(projectId)}:members:${String(user.id)}`, maxPages: 50, maxItems: 10_000 },
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

  const removeProjectMembership = async (projectId: string, directMembershipId?: any) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;

    const membershipId = await findProjectMembershipId(pid, directMembershipId);
    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to remove membership');
    }

    await fetchUser();
  };

  const updateProjectMembershipRole = async (projectId: string, directMembershipId: any, role: string) => {
    if (!user) return;
    const pid = String(projectId || '').trim();
    if (!pid) return;

    const membershipId = await findProjectMembershipId(pid, directMembershipId);
    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update role');
    }

    const data = await res.json().catch(() => ({}));
    if (data?.data?.detail && String(data.data.detail).includes('Promotion requested')) {
      alert('Role change requested. The user must accept the promotion before it takes effect.');
    }

    await fetchUser();
  };

  /* ---------- match CRUD ---------------------------------------- */
  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchIdValue = String(matchToEdit?.id || '').trim();
    if (!matchIdValue) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch || {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update match');
    }

    setRelationsReloadToken((t) => t + 1);
  };

  const deleteMatch = async (matchToDelete: any) => {
    const matchIdValue = String(matchToDelete?.id || '').trim();
    if (!matchIdValue) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to delete match');
    }

    setRelationsReloadToken((t) => t + 1);
  };

  /* ---------- link options -------------------------------------- */
  const ensureLinkOptionsLoaded = async () => {
    if (linkOptionsLoading) return;
    if (linkOrgs.length && linkClubs.length && linkTeams.length) return;
    try {
      setLinkOptionsLoading(true);
      setLinkOptionsError(null);

      const [orgs, clubs, teams] = await Promise.all([
        fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=200`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'user-detail:link:orgs', maxItems: 5000 },
        ),
        fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'user-detail:link:clubs', maxItems: 20_000 },
        ),
        fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'user-detail:link:teams', maxItems: 50_000 },
        ),
      ]);

      setLinkOrgs(Array.isArray(orgs) ? orgs : []);
      setLinkClubs(Array.isArray(clubs) ? clubs : []);
      setLinkTeams(Array.isArray(teams) ? teams : []);
    } catch (e) {
      setLinkOptionsError(e instanceof Error ? e.message : 'Failed to load link options');
      setLinkOrgs([]);
      setLinkClubs([]);
      setLinkTeams([]);
    } finally {
      setLinkOptionsLoading(false);
    }
  };

  /* ----------------------------------------------------------------
   *  Effects
   * -------------------------------------------------------------- */

  // Balance
  useEffect(() => {
    if (activeTab !== 'balance') return;

    const orgIdForBalance = getPreferredOrganisationId();
    const isSelf =
      Number.isFinite(currentUserIdForTxn) &&
      Number.isFinite(targetUserIdForTxn) &&
      Number(currentUserIdForTxn) === Number(targetUserIdForTxn);

    if (!isSelf) {
      setUserBalance(null);
      setUserBalanceError('Balance is only available on your own user page.');
      setUserBalanceLoading(false);
      return;
    }

    if (!orgIdForBalance) {
      setUserBalance(null);
      setUserBalanceError('Select an organisation first (context switcher).');
      setUserBalanceLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        setUserBalanceLoading(true);
        setUserBalanceError(null);

        const response = await fetch(
          `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(orgIdForBalance)}/balance/me/`,
          { credentials: 'include', signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch balance (${response.status})`);
        }

        const raw = await response.json();
        const data = (raw as any)?.data ?? raw;
        const v = (data as any)?.current_balance;
        if (!cancelled) setUserBalance(v != null ? String(v) : null);
      } catch (e: any) {
        if (!cancelled) setUserBalanceError(e?.message || 'Failed to fetch balance');
      } finally {
        if (!cancelled) setUserBalanceLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, apiBaseUrl, userBalanceReloadToken]);

  // Link modal options
  useEffect(() => {
    if (!isLinkModalOpen) return;
    void ensureLinkOptionsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkModalOpen]);

  // Fetch user on mount
  useEffect(() => {
    let isMounted = true;
    if (userId) {
      const loadData = async () => {
        if (!isMounted) return;
        await fetchUser();
      };
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load relations (clubs, competitions, matches)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) return;
      if (!primaryOrgSlug) return;
      if (!user) return;

      setLoadingRelations(true);
      try {
        const clubs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?organisation_id=${encodeURIComponent(primaryOrgSlug)}&parent_project__isnull=true&page_size=200`,
          { credentials: 'include' },
          { ttlMs: 30_000, cacheKey: `user:${userId}:clubs:${primaryOrgSlug}`, maxItems: 2000 },
        );

        if (!cancelled) {
          const map = new Map<string, any>();
          for (const c of clubs || []) {
            const id = String(c?.id || '').trim();
            if (id) map.set(id, c);
          }
          setClubsById(map);
        }

        const competitionsAll: any[] = [];
        const matchesAll: any[] = [];

        for (const pair of teamSeasonPairs) {
          const teamId = pair.teamId;
          const seasonId = pair.seasonId;

          const competitions = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(seasonId)}&project_id=${encodeURIComponent(teamId)}&page_size=250`,
            { credentials: 'include' },
            { ttlMs: 30_000, cacheKey: `user:${userId}:competitions:${teamId}:${seasonId}`, maxItems: 2000 },
          );
          competitionsAll.push(...(competitions || []));

          const matches = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(teamId)}&period_id=${encodeURIComponent(seasonId)}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`,
            { credentials: 'include' },
            { ttlMs: 30_000, cacheKey: `user:${userId}:matches:${teamId}:${seasonId}`, maxItems: 250 },
          );
          matchesAll.push(...(matches || []));
        }

        if (!cancelled) {
          const uniqueCompetitions = [
            ...new Map(competitionsAll.map((c: any) => [String(c?.id || ''), c])).values(),
          ].filter(Boolean);
          const uniqueMatches = [
            ...new Map(matchesAll.map((m: any) => [String(m?.id || ''), m])).values(),
          ].filter(Boolean);
          setLinkedCompetitions(uniqueCompetitions);
          setLinkedMatches(uniqueMatches);
        }
      } catch {
        if (!cancelled) {
          setLinkedCompetitions([]);
          setLinkedMatches([]);
        }
      } finally {
        if (!cancelled) setLoadingRelations(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, primaryOrgSlug, teamSeasonPairs, user, userId, relationsReloadToken]);

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    userId,
    orgId,
    navigate,
    location,
    basePath,
    backPath,
    user,
    setUser,
    loading,
    error,
    apiBaseUrl,
    userDisplayName,
    activeTab,
    setTab,
    userOrgs,
    userProjects,
    primaryOrgSlug,
    clubMemberships,
    directClubMembershipById,
    teamMemberships,
    clubsForTab,
    clubSlugById,
    teamSeasonPairs,
    hierarchySearch,
    setHierarchySearch,
    hierarchyRows,
    clubsById,
    linkedCompetitions,
    linkedMatches,
    loadingRelations,
    saveMatchEdits,
    deleteMatch,
    identityEditing,
    setIdentityEditing,
    identityFirstName,
    setIdentityFirstName,
    identityLastName,
    setIdentityLastName,
    identitySaving,
    setIdentitySaving,
    identitySaveError,
    setIdentitySaveError,
    identitySaveSuccess,
    setIdentitySaveSuccess,
    userBalance,
    userBalanceLoading,
    userBalanceError,
    userBalanceReloadToken,
    setUserBalanceReloadToken,
    fetchUser,
    handleSaveUser,
    handleDeleteUser,
    getCsrfToken,
    getPreferredOrganisationId,
    renderNavLink,
    updateOrganisationMembershipRole,
    removeOrganisationMembership,
    updateProjectMembershipRole,
    removeProjectMembership,
    isViewModalOpen,
    setIsViewModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isLinkModalOpen,
    setIsLinkModalOpen,
    isCreateTxnModalOpen,
    setIsCreateTxnModalOpen,
    isMatchEditModalOpen,
    setIsMatchEditModalOpen,
    selectedEditMatch,
    setSelectedEditMatch,
    isEditMembershipModalOpen,
    setIsEditMembershipModalOpen,
    editingMembership,
    setEditingMembership,
    linkOrgs,
    linkClubs,
    linkTeams,
    linkOptionsLoading,
    linkOptionsError,
    currentUserIdForTxn,
    targetUserIdForTxn,
    userWalletOptions,
  };
}
