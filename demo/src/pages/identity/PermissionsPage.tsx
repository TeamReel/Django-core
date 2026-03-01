import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import AppShell from '../../components/AppShell';
import { compactTableStyle, compactThStyle, compactTdStyle } from './detail/detailStyles';
import { getApiBaseUrl } from '../../utils/apiBase';

/**
 * T010 - Permissions Dashboard
 *
 * Purpose: Visualize viewer/member/admin role capabilities
 * - Shows permission matrix for each role
 * - Hides admin-only actions for non-admin users
 * - Provides stakeholder-friendly explanations (per user stories 1-2)
 */
export const PermissionsPage: React.FC = () => {
  const [effectivePermissionKeys, setEffectivePermissionKeys] = useState<string[]>([]);
  const [permissionsTree, setPermissionsTree] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'permissions'>('hierarchy');

  type PermissionMatrixRow = {
    permission: string;
    superadmin: boolean;
    land_admin: boolean;
    club_admin: boolean;
    team_admin: boolean;
    team_member: boolean;
    supporter: boolean;
  };

  const roleColumns: Array<{ key: keyof PermissionMatrixRow; label: string }> = [
    { key: 'superadmin', label: 'Super' },
    { key: 'land_admin', label: 'Land' },
    { key: 'club_admin', label: 'Club' },
    { key: 'team_admin', label: 'Team Admin' },
    { key: 'team_member', label: 'Team Member' },
    { key: 'supporter', label: 'Supporter' },
  ];

  useEffect(() => {
    const fetchPermissionsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = getApiBaseUrl();

        // Fetch current user (platform role: superadmin/admin/user)
        const userResponse = await fetch(`${baseUrl}/api/v1/auth/me/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (userResponse.ok) {
          const rawUserData = await userResponse.json();
          const userData = rawUserData.data || rawUserData;
          setCurrentUserRole(userData.role);
        }

        // Fetch effective hierarchical permissions for current user
        const permissionsResponse = await fetch(`${baseUrl}/api/v1/permissions/current/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          const tree = permissionsData?.data || permissionsData;
          setPermissionsTree(tree);

          const keys: string[] = [];
          if (Array.isArray(tree?.global)) {
            keys.push(...tree.global);
          }
          const orgs = tree?.organizations || tree?.organisations;
          if (orgs && typeof orgs === 'object') {
            Object.values(orgs as any).forEach((orgNode: any) => {
              if (Array.isArray(orgNode?.permissions)) keys.push(...orgNode.permissions);
              if (orgNode?.projects && typeof orgNode.projects === 'object') {
                Object.values(orgNode.projects).forEach((projectNode: any) => {
                  if (Array.isArray(projectNode?.permissions)) keys.push(...projectNode.permissions);
                });
              }
            });
          }

          const uniqueSorted = Array.from(new Set(keys.map((k) => String(k).trim()).filter(Boolean))).sort();
          setEffectivePermissionKeys(uniqueSorted);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
        console.error('Permissions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissionsData();
  }, []);

  const expectedPermissionKeys = [
    'org.view_all',
    'org.manage_settings',
    'org.manage_credits',
    'project.view_all',
    'project.edit_own',
    'project.edit_children',
    'project.manage_credits',
    'match.create',
    'match.edit_own_team',
    'match.delete',
    'match.view_all',
    'content.create',
    'content.edit_own',
    'content.edit_all_team',
    'content.approve',
    'profile.edit_own',
    'profile.edit_team',
    'lineup.create',
    'lineup.edit',
    'featureflag.view',
    'featureflag.override_team',
    'featureflag.override_club',
    'featureflag.override_org',
  ];

  const permissionDescriptions: Record<string, string> = {
    'org.view_all': 'View all organisations/federations (cross-club visibility)',
    'org.manage_settings': 'Manage organisation settings and metadata',
    'org.manage_credits': 'Manage credit allocation at federation level',
    'project.view_all': 'View all clubs/teams (e.g., opponent selection)',
    'project.edit_own': 'Edit own club/team settings',
    'project.edit_children': 'Edit child projects (club → teams)',
    'project.manage_credits': 'Manage credit transactions for club/team',
    'match.create': 'Create new matches for team',
    'match.edit_own_team': "Edit matches where the user's team is involved",
    'match.delete': 'Delete matches',
    'match.view_all': 'View all matches (read-only)',
    'content.create': 'Create content (line-ups, posts, media)',
    'content.edit_own': 'Edit own created content only',
    'content.edit_all_team': 'Edit all content for team (not restricted to own)',
    'content.approve': 'Approve content before publication',
    'profile.edit_own': 'Edit own user profile',
    'profile.edit_team': 'Edit profiles of team members',
    'lineup.create': 'Create match lineups and formations',
    'lineup.edit': 'Edit existing lineups',
    'featureflag.view': 'View feature flags configuration and inheritance chain',
    'featureflag.override_team': 'Override feature flags at team level (if not blocked)',
    'featureflag.override_club': 'Override feature flags at club level (blocks teams below)',
    'featureflag.override_org': 'Override feature flags at org level (blocks clubs/teams)',
  };

  const roleDescriptions: Record<string, { title: string; description: string; scope: string; level: number }> = {
    superadmin: {
      title: 'Superadmin',
      description: 'Platform administrator (internal) with access to everything.',
      scope: 'Platform',
      level: 0,
    },
    land_admin: {
      title: 'Land Admin',
      description: 'Federation director with full access to all clubs/teams in the organisation scope.',
      scope: 'Organisation',
      level: 1,
    },
    club_admin: {
      title: 'Club Admin',
      description: 'Club director with full access to the club and all teams under it.',
      scope: 'Club (root project)',
      level: 2,
    },
    team_admin: {
      title: 'Team Admin',
      description: 'Head coach with full access to team content, matches, and lineups for their team.',
      scope: 'Team (child project)',
      level: 3,
    },
    team_member: {
      title: 'Team Member',
      description: 'Team member (Keeper/Speler/Assistent/Verzorger): read-mostly with content creation + own edits only.',
      scope: 'Team (child project)',
      level: 4,
    },
    supporter: {
      title: 'Supporter',
      description: 'External viewer with passive read-only access (matches only).',
      scope: 'Club (root project)',
      level: 5,
    },
  };

  const permissionMatrix: Array<{ category: string; permissions: PermissionMatrixRow[] }> = [
    {
      category: 'Organisation',
      permissions: [
        {
          permission: 'org.view_all',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'org.manage_settings',
          superadmin: true,
          land_admin: true,
          club_admin: false,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'org.manage_credits',
          superadmin: true,
          land_admin: true,
          club_admin: false,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
      ],
    },
    {
      category: 'Clubs',
      permissions: [
        {
          permission: 'project.view_all',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'project.edit_own',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'project.edit_children',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'project.manage_credits',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
      ],
    },
    {
      category: 'Teams',
      permissions: [
        {
          permission: 'match.create',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'match.edit_own_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'match.delete',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'match.view_all',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: true,
        },
        {
          permission: 'content.create',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'content.edit_own',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'content.edit_all_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'content.approve',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'profile.edit_own',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'profile.edit_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'lineup.create',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'lineup.edit',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
      ],
    },
    {
      category: 'Feature Flags',
      permissions: [
        {
          permission: 'featureflag.view',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: true,
          supporter: false,
        },
        {
          permission: 'featureflag.override_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'featureflag.override_club',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
        {
          permission: 'featureflag.override_org',
          superadmin: true,
          land_admin: true,
          club_admin: false,
          team_admin: false,
          team_member: false,
          supporter: false,
        },
      ],
    },
  ];

  const formatPermissionLabel = (permissionKey: string) => {
    const [domain, action] = permissionKey.split('.', 2);
    const humanDomain = (domain || permissionKey)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const humanAction = (action || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return action ? `${humanDomain}: ${humanAction}` : humanDomain;
  };

  const permissionDescriptionFor = (permissionKey: string) => {
    return permissionDescriptions[permissionKey] || '';
  };

  const normalizeRoleKey = (raw: string | null | undefined) => {
    const value = String(raw || '').trim().toLowerCase();
    if (!value) return null;
    if (value === 'land_admin' || value === 'land admin') return 'land_admin';
    if (value === 'club_admin' || value === 'club admin') return 'club_admin';
    if (value === 'team_admin' || value === 'team admin') return 'team_admin';
    if (value === 'team_member' || value === 'team member') return 'team_member';
    if (value === 'supporter') return 'supporter';
    if (value === 'superadmin' || value === 'super') return 'superadmin';
    return value;
  };

  const permissionApiKeys = new Set(effectivePermissionKeys);
  const expectedKeySet = new Set(expectedPermissionKeys);
  const missingFromApi = expectedPermissionKeys.filter((k) => permissionApiKeys.size > 0 && !permissionApiKeys.has(k));
  const unexpectedInApi = Array.from(permissionApiKeys).filter((k) => !expectedKeySet.has(k));

  const currentRoleKey = normalizeRoleKey(currentUserRole);

  const permissionRows = permissionMatrix.flatMap((c) => c.permissions);
  const grantedCountForRole = (roleKey: keyof PermissionMatrixRow) => {
    return permissionRows.reduce((acc, row) => acc + (row[roleKey] ? 1 : 0), 0);
  };

  const roleHighlights: Record<string, string[]> = {
    superadmin: ['Platform-wide access', 'Troubleshooting & ops', 'Not demo-critical (internal)'],
    land_admin: ['Org settings + org credits', 'Can manage all clubs/teams', 'Can override flags at org level'],
    club_admin: ['Manage club + all teams', 'Can delete matches', 'Can override flags at club/team level'],
    team_admin: ['Manage matches + lineups', 'Edit all team content', 'Can override flags at team level'],
    team_member: ['Create content', 'Edit own content only', 'Read-only matches'],
    supporter: ['View matches only'],
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Permissions"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Permissions' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading permissions...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeader
        title="Permissions & Access Control"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Permissions' },
        ]}
      />

      <PageContent>
        {error && (
          <Alert variant="warning" className="mb-4" data-testid="permissions-warning">
            Some permission data could not be loaded, but role hierarchy is available.
          </Alert>
        )}

        {effectivePermissionKeys.length > 0 && (missingFromApi.length > 0 || unexpectedInApi.length > 0) ? (
          <Alert variant="info" className="mb-4" data-testid="permissions-config-mismatch">
            RBAC config check: {missingFromApi.length} expected permissions missing, {unexpectedInApi.length} unexpected.
          </Alert>
        ) : null}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            borderBottom: '1px solid var(--app-border)',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
          aria-label="Tabs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            style={{
              padding: '10px 14px',
              borderRadius: '6px 6px 0 0',
              border: '1px solid var(--app-border)',
              borderBottom: activeTab === 'hierarchy' ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
              backgroundColor: activeTab === 'hierarchy' ? 'var(--app-surface)' : 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'hierarchy' ? 600 : 500,
            }}
          >
            Role Hierarchy
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '10px 14px',
              borderRadius: '6px 6px 0 0',
              border: '1px solid var(--app-border)',
              borderBottom: activeTab === 'permissions' ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
              backgroundColor: activeTab === 'permissions' ? 'var(--app-surface)' : 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'permissions' ? 600 : 500,
            }}
          >
            Permissions
          </button>
        </div>

        {/* Tab Content: Role Hierarchy */}
        {activeTab === 'hierarchy' && (
          <>
            <Card className="mb-6 p-20">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h3 className="m-0 fs-18 fw-700">Role Hierarchy</h3>
                  <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--app-muted-text)' }}>
                    Higher roles generally include all permissions of the roles below.
                  </p>
                </div>
                <div className="flex-row gap-8 flex-wrap">
                  <Badge variant="info">{expectedPermissionKeys.length} permissions</Badge>
                  {currentRoleKey ? <Badge variant="success">Current: {roleDescriptions[currentRoleKey]?.title ?? currentRoleKey}</Badge> : null}
                </div>
              </div>

              <div
                className="grid gap-12 mt-16"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                }}
              >
                {Object.entries(roleDescriptions)
                  .sort(([, a], [, b]) => a.level - b.level)
                  .map(([roleKey, roleInfo]) => {
                    const isCurrent = currentRoleKey === roleKey;
                    const roleCol = roleColumns.find((c) => String(c.key) === roleKey);
                    const grantedCount = roleCol ? grantedCountForRole(roleCol.key) : null;
                    const total = expectedPermissionKeys.length;

                    return (
                      <div
                        key={roleKey}
                        data-testid={`role-hierarchy-${roleKey}`}
                        style={{
                          border: `1px solid ${isCurrent ? 'var(--app-focus-ring)' : 'var(--app-border)'}`,
                          backgroundColor: isCurrent ? 'var(--app-surface-2)' : 'var(--app-surface)',
                          borderRadius: '12px',
                          padding: '14px',
                          boxShadow: isCurrent ? '0 0 0 2px rgba(0,0,0,0)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                backgroundColor: 'var(--app-table-header-bg)',
                                border: '1px solid var(--app-border)',
                              }}
                              aria-label={`Role level ${roleInfo.level}`}
                            >
                              {roleInfo.level}
                            </div>

                            <div>
                              <div className="flex-row gap-8 flex-wrap">
                                <div className="fs-16 fw-800">{roleInfo.title}</div>
                                {isCurrent ? <Badge variant="success">You</Badge> : null}
                                {grantedCount != null ? <Badge variant="default">{grantedCount}/{total}</Badge> : null}
                              </div>
                              <div style={{ marginTop: '2px', fontSize: '0.8rem', color: 'var(--app-muted-text)' }}>{roleInfo.scope}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--app-text)' }}>
                          {roleInfo.description}
                        </div>

                        {roleHighlights[roleKey]?.length ? (
                          <div className="grid gap-6" style={{ marginTop: '10px' }}>
                            {roleHighlights[roleKey].map((line) => (
                              <div key={line} style={{ display: 'flex', gap: '8px', color: 'var(--app-muted-text)', fontSize: '0.85rem' }}>
                                <span aria-hidden="true">•</span>
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </Card>

            <Card className="p-20">
              <h3 className="m-0 fs-18 fw-700">Hierarchy Ladder</h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--app-muted-text)' }}>
                Scopes flow from org → club → team, with increasing restrictions.
              </p>

              <div style={{ marginTop: '14px', padding: '14px', border: '1px solid var(--app-border)', borderRadius: '12px', backgroundColor: 'var(--app-surface)' }}>
                {Object.entries(roleDescriptions)
                  .sort(([, a], [, b]) => a.level - b.level)
                  .map(([roleKey, roleInfo], idx, arr) => {
                    const isCurrent = currentRoleKey === roleKey;
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={roleKey} style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ width: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '999px',
                              backgroundColor: isCurrent ? 'var(--app-focus-ring)' : 'var(--app-border)',
                              marginTop: '4px',
                            }}
                          />
                          {!isLast ? <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--app-border)', opacity: 0.8 }} /> : null}
                        </div>

                        <div style={{ paddingBottom: isLast ? 0 : '12px' }}>
                          <div className="flex-row gap-8 flex-wrap">
                            <div className="fw-800">{roleInfo.title}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--app-muted-text)' }}>({roleInfo.scope})</span>
                            {isCurrent ? <Badge variant="success">You</Badge> : null}
                          </div>
                          <div className="mt-4 text-muted" style={{ fontSize: '0.9rem' }}>{roleInfo.description}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </>
        )}

        {/* Tab Content: Permission Matrix */}
        {activeTab === 'permissions' && (
          <>
            <Card className="mb-6" style={{ overflow: 'visible' }}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Permissions (Feature Comparison)</h3>
                <p className="text-sm text-gray-600">
                  Features are grouped by category. Columns show which role can perform an action.
                </p>
              </div>

              <div
                style={{
                  border: '1px solid var(--app-border)',
                  borderRadius: '10px',
                  overflow: 'auto',
                  maxHeight: 'calc(100vh - 320px)',
                  backgroundColor: 'var(--app-surface)',
                }}
              >
              <Table style={compactTableStyle} responsive={false}>
                <colgroup>
                  <col style={{ width: '360px' }} />
                  {roleColumns.map((col) => (
                    <col key={String(col.key)} style={{ width: '100px' }} />
                  ))}
                </colgroup>

                <thead>
                  <tr>
                    <th
                      style={{
                        ...compactThStyle,
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        zIndex: 4,
                        minWidth: 320,
                        backgroundColor: 'var(--app-table-header-bg)',
                      }}
                    >
                      Feature
                    </th>
                    {roleColumns.map((col) => (
                      <th
                        key={String(col.key)}
                        style={{
                          ...compactThStyle,
                          position: 'sticky',
                          top: 0,
                          zIndex: 3,
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          backgroundColor: 'var(--app-table-header-bg)',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {permissionMatrix.flatMap((category) => {
                    const rows: Array<React.ReactNode> = [];

                    rows.push(
                      <tr key={`cat-${category.category}`}>
                        <td colSpan={1 + roleColumns.length} style={{ ...compactTdStyle, paddingTop: '14px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 10px',
                            border: '1px solid var(--app-border)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--app-surface-2)',
                          }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {category.category}
                            </span>
                            <span style={{ height: 1, backgroundColor: 'var(--app-border)', flex: 1, opacity: 0.9 }} />
                            <span style={{ fontSize: '0.75rem', opacity: 0.75, whiteSpace: 'nowrap' }}>
                              {category.permissions.length} features
                            </span>
                          </div>
                        </td>
                      </tr>,
                    );

                    category.permissions.forEach((row) => {
                      const label = formatPermissionLabel(row.permission);
                      const desc = permissionDescriptionFor(row.permission);

                      rows.push(
                        <tr key={row.permission} data-testid={`permission-row-${row.permission}`}>
                          <td
                            style={{
                              ...compactTdStyle,
                              verticalAlign: 'top',
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                              borderRight: '1px solid var(--app-border)',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              backgroundColor: 'var(--app-table-row-bg)',
                            }}
                          >
                            <div className="fw-600">{label}</div>
                            {desc ? (
                              <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 2 }}>{desc}</div>
                            ) : null}
                            <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: 4, fontFamily: 'monospace' }}>
                              {row.permission}
                            </div>
                          </td>
                          {roleColumns.map((col) => (
                            <td
                              key={String(col.key)}
                              style={{
                                ...compactTdStyle,
                                textAlign: 'center',
                                fontWeight: row[col.key] ? 700 : 400,
                                color: row[col.key] ? 'var(--app-text)' : 'var(--app-muted-text)',
                              }}
                            >
                              {row[col.key] ? '✓' : '—'}
                            </td>
                          ))}
                        </tr>,
                      );
                    });

                    return rows;
                  })}
                </tbody>
              </Table>
              </div>
            </Card>

            {/* Legend */}
            <Card>
              <div className="text-sm text-gray-600">
                <p>
                  <strong>✓</strong> = Permission granted | <strong>—</strong> = Permission denied
                </p>
                <p className="mt-2 text-xs">
                  Note: Higher roles typically inherit permissions from lower roles. For example, Land Admin has all Club Admin permissions.
                </p>
              </div>
            </Card>
          </>
        )}
      </PageContent>
      </div>
    </>
  );
};

export default PermissionsPage;
