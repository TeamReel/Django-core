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
import { Permission, Role } from '../../types';
import AppShell from '../../components/AppShell';
import { compactTableStyle, compactThStyle, compactTdStyle } from './detail/detailStyles';

/**
 * T010 - Permissions Dashboard
 *
 * Purpose: Visualize viewer/member/admin role capabilities
 * - Shows permission matrix for each role
 * - Hides admin-only actions for non-admin users
 * - Provides stakeholder-friendly explanations (per user stories 1-2)
 */
export const PermissionsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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

        // Fetch current user to determine role
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const userResponse = await fetch(`${baseUrl}/api/users/me/`, {
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

        // Fetch permissions
        const permissionsResponse = await fetch(`${baseUrl}/api/permissions/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          // Handle B13 response envelope
          const permissionsList = permissionsData.data?.results || permissionsData.results || permissionsData.data || permissionsData || [];
          setPermissions(Array.isArray(permissionsList) ? permissionsList : []);
        }

        // Fetch roles
        const rolesResponse = await fetch(`${baseUrl}/api/roles/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          // Handle B13 response envelope
          const rolesList = rolesData.data?.results || rolesData.results || rolesData.data || rolesData || [];
          setRoles(Array.isArray(rolesList) ? rolesList : []);
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
    'project.view_all': 'View all projects/clubs/teams (opponent selection)',
    'project.edit_own': 'Edit own project/team settings',
    'project.edit_children': 'Edit child projects (club → teams)',
    'project.manage_credits': 'Manage credit transactions for project/team',
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
      category: 'Projects',
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
      category: 'Matches',
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
      ],
    },
    {
      category: 'Content',
      permissions: [
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
      ],
    },
    {
      category: 'Profiles',
      permissions: [
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
      ],
    },
    {
      category: 'Lineups',
      permissions: [
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

  const permissionApiKeys = new Set(
    (Array.isArray(permissions) ? permissions : [])
      .map((p: any) => String((p as any)?.key ?? (p as any)?.code ?? (p as any)?.name ?? p).trim())
      .filter(Boolean),
  );
  const expectedKeySet = new Set(expectedPermissionKeys);
  const missingFromApi = expectedPermissionKeys.filter((k) => permissionApiKeys.size > 0 && !permissionApiKeys.has(k));
  const unexpectedInApi = Array.from(permissionApiKeys).filter((k) => !expectedKeySet.has(k));

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
    <AppShell>
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

        {permissions.length > 0 && (missingFromApi.length > 0 || unexpectedInApi.length > 0) ? (
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
            <Card className="mb-6">
              <h3 className="text-lg font-semibold mb-4">TeamReel Role Hierarchy</h3>
              <p className="text-sm text-gray-600 mb-4">
                The system uses a hierarchical role structure where higher roles inherit permissions from lower roles.
              </p>
              <div className="space-y-4">
                {Object.entries(roleDescriptions)
                  .sort(([, a], [, b]) => a.level - b.level)
                  .map(([roleKey, roleInfo]) => (
                    <div
                      key={roleKey}
                      className={`p-4 rounded-lg border-2 ${
                        normalizeRoleKey(currentUserRole) === roleKey
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      data-testid={`role-hierarchy-${roleKey}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                            {roleInfo.level}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{roleInfo.title}</h4>
                            <p className="text-xs text-gray-500">{roleInfo.scope}</p>
                          </div>
                        </div>
                        {normalizeRoleKey(currentUserRole) === roleKey && (
                          <Badge variant="success">Your Role</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 ml-11">{roleInfo.description}</p>
                    </div>
                  ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4">Hierarchy Structure</h3>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                <div className="space-y-1">
                  <div>0. <strong>Superadmin</strong> (platform)</div>
                  <div className="ml-4">└─ Internal: full access</div>
                  <div>1. <strong>Land Admin</strong> (organisation)</div>
                  <div className="ml-4">└─ Federation level</div>
                  <div>2. <strong>Club Admin</strong> (club/root project)</div>
                  <div className="ml-4">└─ Club + all teams</div>
                  <div>3. <strong>Team Admin</strong> (team/child project)</div>
                  <div className="ml-4">└─ Team content + matches + lineups</div>
                  <div>4. <strong>Team Member</strong> (team)</div>
                  <div className="ml-4">└─ Own profile + content create + own edits</div>
                  <div>5. <strong>Supporter</strong> (club)</div>
                  <div className="ml-4">└─ Matches view-only</div>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Tab Content: Permission Matrix */}
        {activeTab === 'permissions' && (
          <>
            <Card className="mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Permissions (Feature Comparison)</h3>
                <p className="text-sm text-gray-600">
                  Features are grouped by category. Columns show which role can perform an action.
                </p>
              </div>

              <Table style={compactTableStyle}>
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
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{label}</div>
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
    </AppShell>
  );
};

export default PermissionsPage;
