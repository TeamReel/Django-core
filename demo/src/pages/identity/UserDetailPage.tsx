import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';

import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import UserDetailModal from './UserDetailModal';
import UserEditModal from './UserEditModal';
import LinkUserModal from './LinkUserModal';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import { useAuth } from '@django-core/auth-ui';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detail/detailStyles';

function ProjectMembershipEditModal({
  opened,
  onClose,
  membership,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  membership: { projectId: string; projectName: string; currentRole: string } | null;
  onSave: (payload: { role: string }) => Promise<void>;
}) {
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !membership) return;
    setRole(String(membership.currentRole || 'viewer'));
    setError(null);
  }, [opened, membership]);

  if (!opened || !membership) return null;

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
          padding: '20px',
          borderRadius: '8px',
          width: '520px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Edit membership role</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--app-text)',
            }}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: '10px', color: 'var(--app-muted-text)', fontSize: '13px' }}>{membership.projectName}</div>

        {error ? (
          <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#fee', color: '#c00' }}>{error}</div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="membership-role-select">
              Role
            </label>
            <select
              id="membership-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={saving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await onSave({ role });
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to save');
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #007bff',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const UserDetailPage: React.FC = () => {
  const { userId, orgId } = useParams<{ userId: string; orgId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    []
  );

  const [editingMembership, setEditingMembership] = useState<{ projectId: string; projectName: string; currentRole: string } | null>(null);
  const [isEditMembershipModalOpen, setIsEditMembershipModalOpen] = useState(false);

  const [clubsById, setClubsById] = useState<Map<string, any>>(new Map());
  const [linkedCompetitions, setLinkedCompetitions] = useState<any[]>([]);
  const [linkedMatches, setLinkedMatches] = useState<any[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  const [hierarchySearch, setHierarchySearch] = useState('');

  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [userBalanceLoading, setUserBalanceLoading] = useState(false);
  const [userBalanceError, setUserBalanceError] = useState<string | null>(null);
  const [userBalanceReloadToken, setUserBalanceReloadToken] = useState(0);

  const allowedTabs = useMemo(
    () => new Set(['overview', 'balance', 'hierarchy', 'federations', 'clubs', 'teams', 'seasons', 'competitions', 'matches', 'transactions']),
    []
  );

  const basePath = `/users/${userId}`;

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    return allowedTabs.has(tab) ? (tab as any) : 'overview';
  }, [allowedTabs, location.search]);

  const setTab = (tab: string) => {
    if (!allowedTabs.has(tab)) return;
    const params = new URLSearchParams(location.search);
    if (tab === 'overview') params.delete('tab');
    else params.set('tab', tab);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    navigate(`${basePath}${suffix}`);
  };

  const renderNavLink = (label: string, href?: string) => {
    const safe = String(label || '').trim();
    if (!href) return <span>{safe || '—'}</span>;
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href);
        }}
        style={{ color: '#007bff', textDecoration: 'none', fontWeight: 600 }}
      >
        {safe || '—'}
      </a>
    );
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

  const getPreferredOrganisationId = (): string => {
    const fromStorage = String(localStorage.getItem('django-core:currentOrgId') || '').trim();
    if (fromStorage) return fromStorage;

    const memberships = (user as any)?.memberships || (user as any)?.organisation_memberships || (user as any)?.organization_memberships;
    if (Array.isArray(memberships) && memberships.length > 0) {
      const first = memberships[0];
      const oid = first?.organisation?.id || first?.organization?.id || first?.org?.id || first?.organisation_id || first?.organization_id;
      if (oid) return String(oid);
    }

    return '';
  };

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
          { credentials: 'include', signal: controller.signal }
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
        } catch (e) {
            // Ignore JSON parse error
        }
        throw new Error(errorMsg);
      }

      const rawData = await response.json();
      // Handle B13 envelope: {data: {...}} or direct {...}
      const userData = rawData.data || rawData;
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
          { ttlMs: 60_000, cacheKey: 'user-detail:link:orgs', maxItems: 5000 }
        ),
        fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'user-detail:link:clubs', maxItems: 20_000 }
        ),
        fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'user-detail:link:teams', maxItems: 50_000 }
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

  useEffect(() => {
    if (!isLinkModalOpen) return;
    void ensureLinkOptionsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkModalOpen]);

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      // Wrap fetch calls to respect isMounted
      const loadData = async () => {
          if (!isMounted) return;
          await fetchUser();
      };
      loadData();
    }
    return () => { isMounted = false; };
  }, [userId]);

    const handleSaveUser = async (updatedUser: any) => {
      try {
          // Use userId from URL params instead of updatedUser.id (which may be undefined)
        const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify(updatedUser),
              credentials: 'include',
          });

          if (res.ok) {
              fetchUser();
              setIsEditModalOpen(false);
          } else {
              const data = await res.json();
              alert(data.message || 'Failed to update user');
              throw new Error(data.message || 'Failed to update user');
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
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
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

  const findOrganisationMembershipId = async (orgSlugOrId: string): Promise<string> => {
    if (!user) throw new Error('User missing');
    const slugOrId = String(orgSlugOrId || '').trim();
    if (!slugOrId) throw new Error('Missing federation');

    const orgs = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    const direct = orgs.find((o: any) => String(o?.slug || o?.id || '') === slugOrId || String(o?.id || '') === slugOrId);
    const directMembershipId = String(direct?.membership_id ?? '').trim();
    if (directMembershipId) return directMembershipId;

    const members = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `user-detail:org:${slugOrId}:members:${String(user.id)}`, maxPages: 50, maxItems: 10_000 }
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
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update federation role');
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
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to unlink federation');
    }

    await fetchUser();
  };

  const findProjectMembershipId = async (projectId: string, directMembershipId?: any): Promise<string> => {
    const direct = String(directMembershipId || '').trim();
    if (direct) return direct;
    if (!user) throw new Error('User missing');

    const members = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=500`,
      { credentials: 'include' },
      { ttlMs: 5_000, cacheKey: `user-detail:project:${String(projectId)}:members:${String(user.id)}`, maxPages: 50, maxItems: 10_000 }
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
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });
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
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to update role');
    }

    // 202 may indicate promotion flow; still refresh.
    await fetchUser();
  };

  const clubMemberships = useMemo(() => {
    return userProjects.filter((p: any) => !p?.parent);
  }, [userProjects]);

  const teamMemberships = useMemo(() => {
    return userProjects.filter((p: any) => Boolean(p?.parent));
  }, [userProjects]);

  const clubSlugById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubMemberships) {
      const id = String(c?.id || '').trim();
      const slug = String(c?.slug || '').trim();
      if (id && slug) m.set(id, slug);
    }
    // add clubs fetched from API
    for (const [id, club] of clubsById.entries()) {
      const slug = String(club?.slug || '').trim();
      if (id && slug && !m.has(id)) m.set(id, slug);
    }
    return m;
  }, [clubMemberships, clubsById]);

  const teamSeasonPairs = useMemo(() => {
    const pairs: Array<{ teamId: string; teamName: string; teamSlug: string; clubId: string; clubName: string; seasonId: string; seasonName: string }> = [];
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
    // unique
    const seen = new Set<string>();
    return pairs.filter((p) => {
      const k = `${p.teamId}::${p.seasonId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [teamMemberships]);

  // Load club slug map + competitions/matches for team-season memberships.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) return;
      if (!primaryOrgSlug) return;
      if (!user) return;

      setLoadingRelations(true);
      try {
        // Fetch all clubs for the primary org so we can link teams reliably.
        const clubs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?organisation_id=${encodeURIComponent(primaryOrgSlug)}&parent_project__isnull=true&page_size=200`,
          { credentials: 'include' },
          { ttlMs: 30_000, cacheKey: `user:${userId}:clubs:${primaryOrgSlug}`, maxItems: 2000 }
        );

        if (!cancelled) {
          const map = new Map<string, any>();
          for (const c of clubs || []) {
            const id = String(c?.id || '').trim();
            if (id) map.set(id, c);
          }
          setClubsById(map);
        }

        // Fetch competitions + matches for linked team-season pairs.
        const competitionsAll: any[] = [];
        const matchesAll: any[] = [];

        for (const pair of teamSeasonPairs) {
          const teamId = pair.teamId;
          const seasonId = pair.seasonId;

          const competitions = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(seasonId)}&project_id=${encodeURIComponent(teamId)}&page_size=250`,
            { credentials: 'include' },
            { ttlMs: 30_000, cacheKey: `user:${userId}:competitions:${teamId}:${seasonId}`, maxItems: 2000 }
          );
          competitionsAll.push(...(competitions || []));

          const matches = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(teamId)}&period_id=${encodeURIComponent(seasonId)}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`,
            { credentials: 'include' },
            { ttlMs: 30_000, cacheKey: `user:${userId}:matches:${teamId}:${seasonId}`, maxItems: 250 }
          );
          matchesAll.push(...(matches || []));
        }

        if (!cancelled) {
          // De-dupe
          const uniqueCompetitions = [...new Map(competitionsAll.map((c: any) => [String(c?.id || ''), c])).values()].filter(Boolean);
          const uniqueMatches = [...new Map(matchesAll.map((m: any) => [String(m?.id || ''), m])).values()].filter(Boolean);
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
  }, [apiBaseUrl, primaryOrgSlug, teamSeasonPairs, user, userId]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading user..." />
      </AppShell>
    );
  }
  if (error) return <AppShell><Alert variant="error" title="Error">{error}</Alert></AppShell>;
  if (!user) return <AppShell><div>User not found</div></AppShell>;

  const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
  const userDisplayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${userId}`;

  const renderTabButton = (id: string, label: string) => {
    const isActive = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${isActive ? 'var(--app-border)' : 'transparent'}`,
          backgroundColor: isActive ? 'var(--app-surface-2)' : 'transparent',
          color: 'var(--app-text)',
          cursor: 'pointer',
          fontWeight: isActive ? 700 : 600,
          fontSize: '13px',
        }}
      >
        {label}
      </button>
    );
  };

  const hierarchyRows = (() => {
    const q = hierarchySearch.trim().toLowerCase();
    const rows = teamSeasonPairs.map((p) => {
      const clubSlug = clubSlugById.get(p.clubId) || '';
      const teamPath = clubSlug
        ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${p.teamSlug || p.teamId}`
        : '';
      const seasonPath = clubSlug
        ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${p.teamSlug || p.teamId}/seasons/${p.seasonId}`
        : '';
      return {
        ...p,
        clubSlug,
        teamPath,
        seasonPath,
      };
    });
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.teamName.toLowerCase().includes(q) ||
        r.clubName.toLowerCase().includes(q) ||
        r.seasonName.toLowerCase().includes(q)
      );
    });
  })();

  return (
    <AppShell>
      <PageHeader
        title={userDisplayName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          ...(orgId ? [{ label: 'Federations', href: '/organisations' }] : []),
          ...(orgId ? [{ label: 'Members', href: backPath }] : [{ label: 'Users', href: backPath }]),
          { label: userDisplayName, current: true },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="app-action-button"
              onClick={() => {
                const orgIdForTxn = getPreferredOrganisationId();
                if (!orgIdForTxn) {
                  alert('Select an organisation first (context switcher), then try again');
                  return;
                }
                if (!Number.isFinite(currentUserIdForTxn)) {
                  alert('No current user id available');
                  return;
                }
                if (!Number.isFinite(targetUserIdForTxn)) {
                  alert('No target user id available');
                  return;
                }
                setIsCreateTxnModalOpen(true);
              }}
              style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '160px' }}
              disabled={!user}
            >
              Create transaction
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={() => setIsLinkModalOpen(true)}
              style={{ ...actionButtonStyle('neutral'), padding: '8px 16px', fontSize: '14px', minWidth: '120px' }}
              disabled={!user}
            >
              Add to…
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={() => setIsViewModalOpen(true)}
              style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '92px' }}
            >
              View
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={() => setIsEditModalOpen(true)}
              style={{ ...actionButtonStyle('warning'), padding: '8px 16px', fontSize: '14px', minWidth: '92px' }}
            >
              Edit
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={handleDeleteUser}
              style={{ ...actionButtonStyle('danger'), padding: '8px 16px', fontSize: '14px', minWidth: '92px' }}
            >
              Delete
            </button>
          </div>
        }
      />

      <PageContent>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {renderTabButton('overview', 'Overview')}
          {renderTabButton('hierarchy', 'Hierarchy')}
          {renderTabButton('federations', 'Federations')}
          {renderTabButton('clubs', 'Clubs')}
          {renderTabButton('teams', 'Teams')}
          {renderTabButton('seasons', 'Seasons')}
          {renderTabButton('competitions', 'Competitions')}
          {renderTabButton('matches', 'Matches')}
          {renderTabButton('transactions', 'Transactions')}
          {renderTabButton('balance', 'Balance')}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>User</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px' }}>
                <div style={{ color: 'var(--app-muted-text)' }}>Name</div>
                <div style={{ fontWeight: 600 }}>{userDisplayName}</div>

                <div style={{ color: 'var(--app-muted-text)' }}>Email</div>
                <div>{user.email}</div>

                <div style={{ color: 'var(--app-muted-text)' }}>Role</div>
                <div>
                  <Badge variant={String(user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                    {user.role}
                  </Badge>
                </div>

                <div style={{ color: 'var(--app-muted-text)' }}>Status</div>
                <div>
                  <Badge variant={user.is_active ? 'success' : 'error'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <Card>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Federations</div>
                <div style={{ fontWeight: 800, fontSize: '22px' }}>{userOrgs.length}</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Clubs</div>
                <div style={{ fontWeight: 800, fontSize: '22px' }}>{clubMemberships.length}</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Teams</div>
                <div style={{ fontWeight: 800, fontSize: '22px' }}>{teamMemberships.length}</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Matches</div>
                <div style={{ fontWeight: 800, fontSize: '22px' }}>{linkedMatches.length}</div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Balance</h3>
                <button
                  type="button"
                  onClick={() => setUserBalanceReloadToken((n) => n + 1)}
                  style={actionButtonStyle('neutral')}
                  disabled={userBalanceLoading}
                >
                  Refresh
                </button>
              </div>

              {userBalanceError ? (
                <div style={{ marginTop: '12px' }}>
                  <Alert variant="warning">{userBalanceError}</Alert>
                </div>
              ) : null}

              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card>
                  <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Current balance</div>
                  <div style={{ fontWeight: 900, fontSize: '28px', marginTop: '6px' }}>
                    {userBalanceLoading ? 'Loading…' : userBalance != null ? userBalance : '—'}
                  </div>
                </Card>
                <Card>
                  <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Quick links</div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setTab('transactions')} style={actionButtonStyle('primary')}>
                      View transactions
                    </button>
                    <button type="button" onClick={() => setIsCreateTxnModalOpen(true)} style={actionButtonStyle('neutral')}>
                      Create transaction
                    </button>
                  </div>
                </Card>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <TransactionsPanel
              title="Transactions"
              description="User-scoped transactions (charged_user_id)"
              filters={{
                organization_id: getPreferredOrganisationId(),
                charged_user_id: String((user as any)?.id || userId),
              }}
            />
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Hierarchy</h3>
              <Input value={hierarchySearch} onChange={(e) => setHierarchySearch((e.target as any).value)} placeholder="Search…" />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Club</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={compactThStyle}>Season</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchyRows.map((r) => (
                    <tr key={`${r.teamId}::${r.seasonId}`}>
                      <td style={compactTextTdStyle}>
                        {renderNavLink(
                          r.clubName || '-',
                          r.clubSlug ? `/organisations/${primaryOrgSlug}/projects/${r.clubSlug}` : ''
                        )}
                      </td>
                      <td style={compactTextTdStyle}>{renderNavLink(r.teamName || '-', r.teamPath)}</td>
                      <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, r.seasonPath)}</td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          {r.teamPath ? (
                            <button type="button" onClick={() => navigate(r.teamPath)} style={actionButtonStyle('primary')}>
                              View Team
                            </button>
                          ) : (
                            <button type="button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>
                              View Team
                            </button>
                          )}
                          {r.seasonPath ? (
                            <button type="button" onClick={() => navigate(r.seasonPath)} style={actionButtonStyle('primary')}>
                              View Season
                            </button>
                          ) : (
                            <button type="button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>
                              View Season
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!hierarchyRows.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em style={{ color: 'var(--app-muted-text)' }}>No linked seasons found.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        {activeTab === 'federations' && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Federations</h3>
              <button type="button" onClick={() => setIsLinkModalOpen(true)} style={actionButtonStyle('neutral')} disabled={!user}>
                Add to…
              </button>
            </div>

            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Name</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userOrgs.map((o: any) => {
                  const orgSlugOrId = String(o?.slug || o?.id || '').trim();
                  const orgPath = orgSlugOrId ? `/organisations/${orgSlugOrId}` : '';
                  const currentRole = String(o?.role || o?.user_role || '').trim() || 'member';
                  return (
                    <tr key={String(o?.id || o?.slug)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(o?.name || orgSlugOrId || ''), orgPath)}</td>
                      <td style={compactTextTdStyle}>
                        <button
                          type="button"
                          disabled={!orgSlugOrId}
                          onClick={async () => {
                            if (!orgSlugOrId) return;
                            const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                            const role = next.trim().toLowerCase();
                            if (!role) return;
                            try {
                              await updateOrganisationMembershipRole(orgSlugOrId, role);
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Failed to update role');
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: orgSlugOrId ? '#007bff' : 'var(--app-muted-text)',
                            fontWeight: 700,
                            cursor: orgSlugOrId ? 'pointer' : 'not-allowed',
                            textDecoration: orgSlugOrId ? 'underline' : 'none',
                          }}
                          title={orgSlugOrId ? 'Click to edit role' : 'Missing federation id'}
                        >
                          {currentRole}
                        </button>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" onClick={() => orgPath && navigate(orgPath)} disabled={!orgPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            style={actionButtonStyle('warning')}
                            disabled={!orgSlugOrId}
                            onClick={async () => {
                              if (!orgSlugOrId) return;
                              const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                              const role = next.trim().toLowerCase();
                              if (!role) return;
                              try {
                                await updateOrganisationMembershipRole(orgSlugOrId, role);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to update role');
                              }
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={actionButtonStyle('danger')}
                            disabled={!orgSlugOrId}
                            onClick={async () => {
                              if (!orgSlugOrId) return;
                              if (!window.confirm('Unlink this user from the federation?')) return;
                              try {
                                await removeOrganisationMembership(orgSlugOrId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to unlink federation');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!userOrgs.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={3}>
                      <em style={{ color: 'var(--app-muted-text)' }}>No federation memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'clubs' && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Clubs</h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                style={actionButtonStyle('neutral')}
                disabled={!user}
              >
                Add to…
              </button>
            </div>
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Name</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubMemberships.map((c: any) => {
                  const clubPath = primaryOrgSlug && c?.slug ? `/organisations/${primaryOrgSlug}/projects/${c.slug}` : '';
                  const projectId = String(c?.id || '').trim();
                  const membershipId = (c as any)?.membership_id;
                  return (
                    <tr key={String(c?.id)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), clubPath)}</td>
                      <td style={compactTextTdStyle}>
                        <button
                          type="button"
                          disabled={!projectId}
                          onClick={() => {
                            if (!projectId) return;
                            setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String(c?.role || 'viewer') });
                            setIsEditMembershipModalOpen(true);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: projectId ? '#007bff' : 'var(--app-muted-text)',
                            fontWeight: 700,
                            cursor: projectId ? 'pointer' : 'not-allowed',
                            textDecoration: projectId ? 'underline' : 'none',
                          }}
                          title={projectId ? 'Click to edit role' : 'Missing project id'}
                        >
                          {String(c?.role || '') || '—'}
                        </button>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" onClick={() => clubPath && navigate(clubPath)} disabled={!clubPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!projectId) return;
                              setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String(c?.role || 'viewer') });
                              setIsEditMembershipModalOpen(true);
                            }}
                            disabled={!projectId}
                            style={actionButtonStyle('warning')}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={actionButtonStyle('danger')}
                            disabled={!projectId}
                            onClick={async () => {
                              if (!projectId) return;
                              if (!window.confirm('Remove this user from the club?')) return;
                              try {
                                await removeProjectMembership(projectId, membershipId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to remove membership');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!clubMemberships.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={3}>
                      <em style={{ color: 'var(--app-muted-text)' }}>No club memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'teams' && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Teams</h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                style={actionButtonStyle('neutral')}
                disabled={!user}
              >
                Add to…
              </button>
            </div>
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Club</th>
                  <th style={compactThStyle}>Team</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMemberships.map((t: any) => {
                  const clubIdValue = String(t?.parent || '').trim();
                  const clubSlug = clubSlugById.get(clubIdValue) || '';
                  const teamSlugOrId = String(t?.slug || t?.id || '').trim();
                  const teamPath = primaryOrgSlug && clubSlug && teamSlugOrId
                    ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}`
                    : '';
                  const clubPath = primaryOrgSlug && clubSlug ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}` : '';
                  const projectId = String(t?.id || '').trim();
                  const membershipId = (t as any)?.membership_id;
                  return (
                    <tr key={String(t?.id)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(t?.parent_name || ''), clubPath)}</td>
                      <td style={compactTextTdStyle}>{renderNavLink(String(t?.name || ''), teamPath)}</td>
                      <td style={compactTextTdStyle}>
                        <button
                          type="button"
                          disabled={!projectId}
                          onClick={() => {
                            if (!projectId) return;
                            setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer') });
                            setIsEditMembershipModalOpen(true);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: projectId ? '#007bff' : 'var(--app-muted-text)',
                            fontWeight: 700,
                            cursor: projectId ? 'pointer' : 'not-allowed',
                            textDecoration: projectId ? 'underline' : 'none',
                          }}
                          title={projectId ? 'Click to edit role' : 'Missing project id'}
                        >
                          {String(t?.role || '') || '—'}
                        </button>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" onClick={() => teamPath && navigate(teamPath)} disabled={!teamPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!projectId) return;
                              setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer') });
                              setIsEditMembershipModalOpen(true);
                            }}
                            disabled={!projectId}
                            style={actionButtonStyle('warning')}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={actionButtonStyle('danger')}
                            disabled={!projectId}
                            onClick={async () => {
                              if (!projectId) return;
                              if (!window.confirm('Remove this user from the team?')) return;
                              try {
                                await removeProjectMembership(projectId, membershipId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to remove membership');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!teamMemberships.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={4}>
                      <em style={{ color: 'var(--app-muted-text)' }}>No team memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'seasons' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {loadingRelations && <Alert variant="info">Loading seasons, competitions and matches…</Alert>}

            <Card>
              <h3 style={{ marginTop: 0 }}>Seasons</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Season</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={compactThStyle}>Club</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSeasonPairs.map((r) => {
                    const clubSlug = clubSlugById.get(r.clubId) || '';
                    const teamSlugOrId = String(r.teamSlug || r.teamId).trim();
                    const seasonPath = primaryOrgSlug && clubSlug && teamSlugOrId && r.seasonId
                      ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${r.seasonId}`
                      : '';
                    return (
                      <tr key={`${r.teamId}::${r.seasonId}`}>
                        <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, seasonPath)}</td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            r.teamName || r.teamId,
                            primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            r.clubName || r.clubId,
                            primaryOrgSlug && clubSlug ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}` : ''
                          )}
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button type="button" onClick={() => seasonPath && navigate(seasonPath)} disabled={!seasonPath} style={actionButtonStyle('primary')}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!teamSeasonPairs.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em style={{ color: 'var(--app-muted-text)' }}>No season-linked team memberships.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {loadingRelations && <Alert variant="info">Loading competitions…</Alert>}
            <Card>
              <h3 style={{ marginTop: 0 }}>Competitions</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Name</th>
                    <th style={compactThStyle}>Season</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedCompetitions.map((c: any) => {
                    const teamIdValue = String(c?.project_id ?? c?.project?.id ?? '').trim();
                    const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                    const clubIdValue = String(team?.parent || '').trim();
                    const clubSlug = clubSlugById.get(clubIdValue) || '';
                    const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                    const parentSeasonId = String(c?.parent_period_id ?? c?.parent_period?.id ?? '').trim();
                    const competitionPath = primaryOrgSlug && clubSlug && teamSlugOrId && parentSeasonId && c?.id
                      ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${parentSeasonId}/competitions/${c.id}`
                      : '';
                    return (
                      <tr key={String(c?.id)}>
                        <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), competitionPath)}</td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            String(c?.parent_period?.name || ''),
                            parentSeasonId && primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${parentSeasonId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            String(team?.name || ''),
                            primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button type="button" onClick={() => competitionPath && navigate(competitionPath)} disabled={!competitionPath} style={actionButtonStyle('primary')}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!linkedCompetitions.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em style={{ color: 'var(--app-muted-text)' }}>No competitions found for linked seasons.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {activeTab === 'matches' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {loadingRelations && <Alert variant="info">Loading matches…</Alert>}
            <Card>
              <h3 style={{ marginTop: 0 }}>Matches</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Title</th>
                    <th style={compactThStyle}>Start</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedMatches.slice(0, 200).map((m: any) => {
                    const teamIdValue = String(m?.project?.id || m?.project_id || '').trim();
                    const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                    const clubIdValue = String(team?.parent || '').trim();
                    const clubSlug = clubSlugById.get(clubIdValue) || '';
                    const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                    const teamPath = primaryOrgSlug && clubSlug && teamSlugOrId
                      ? `/organisations/${primaryOrgSlug}/projects/${clubSlug}/teams/${teamSlugOrId}`
                      : '';
                    const teamName = String(team?.name || m?.project?.name || m?.project_name || '').trim();
                    const matchPath = m?.id ? `/matches/${String(m?.id)}` : '';
                    return (
                      <tr key={String(m?.id)}>
                        <td style={compactTextTdStyle}>{renderNavLink(String(m?.title || ''), matchPath)}</td>
                        <td style={compactTextTdStyle}>{String(m?.start_time || '')}</td>
                        <td style={compactTextTdStyle}>{renderNavLink(teamName, teamPath)}</td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button type="button" onClick={() => matchPath && navigate(matchPath)} disabled={!matchPath} style={actionButtonStyle('primary')}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!linkedMatches.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em style={{ color: 'var(--app-muted-text)' }}>No matches found.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {linkedMatches.length > 200 && (
                <div style={{ marginTop: '8px', color: 'var(--app-muted-text)' }}>
                  Showing first 200 matches.
                </div>
              )}
            </Card>
          </div>
        )}
      </PageContent>

      <CreateTransactionModal
        isOpen={isCreateTxnModalOpen}
        onClose={() => setIsCreateTxnModalOpen(false)}
        onCreated={() => setTab('transactions')}
        title="Create transaction"
        scope="user"
        organizationId={String(getPreferredOrganisationId() || '')}
        defaultProjectId={null}
        seasonId={null}
        periodId={null}
        activityId={null}
        currentUserId={currentUserIdForTxn}
        chargedUserId={Number.isFinite(targetUserIdForTxn) ? targetUserIdForTxn : null}
        walletOptions={userWalletOptions}
      />

      <UserDetailModal opened={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} user={user} />

      <UserEditModal opened={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={user} onSave={handleSaveUser} />

      <LinkUserModal
        opened={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        user={user as any}
        organisations={(linkOrgs.length ? linkOrgs : userOrgs) as any}
        clubs={linkClubs as any}
        teams={linkTeams as any}
        initialOrganisationSlugOrId={String(primaryOrgSlug || '')}
        onSuccess={() => {
          fetchUser();
          setIsLinkModalOpen(false);
        }}
      />

      <ProjectMembershipEditModal
        opened={isEditMembershipModalOpen}
        onClose={() => {
          setIsEditMembershipModalOpen(false);
          setEditingMembership(null);
        }}
        membership={editingMembership}
        onSave={async ({ role }) => {
          if (!editingMembership) return;
          const projectId = editingMembership.projectId;
          const project = userProjects.find((p: any) => String(p?.id) === String(projectId));
          const membershipId = (project as any)?.membership_id;
          await updateProjectMembershipRole(projectId, membershipId, role);
        }}
      />

      {linkOptionsError && isLinkModalOpen ? (
        <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 1100, maxWidth: 420 }}>
          <Alert variant="warning">{linkOptionsError}</Alert>
        </div>
      ) : null}
    </AppShell>
  );
};

export default UserDetailPage;
