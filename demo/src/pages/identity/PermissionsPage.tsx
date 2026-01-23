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
import { Permission, Role } from '../../types';
import AppShell from '../../components/AppShell';

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
    team_staff: boolean;
    team_member: boolean;
    viewer: boolean;
  };

  const roleColumns: Array<{ key: keyof PermissionMatrixRow; label: string }> = [
    { key: 'superadmin', label: 'Super' },
    { key: 'land_admin', label: 'Land' },
    { key: 'club_admin', label: 'Club' },
    { key: 'team_admin', label: 'Team Admin' },
    { key: 'team_staff', label: 'Staff' },
    { key: 'team_member', label: 'Member' },
    { key: 'viewer', label: 'Viewer' },
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

  // Permission descriptions for stakeholders
  const permissionDescriptions: Record<string, string> = {
    view_organisation: 'Can view organisation details and members',
    create_project: 'Can create new projects',
    edit_project: 'Can modify project settings and description',
    delete_project: 'Can permanently delete projects',
    view_members: 'Can view team members and roles',
    invite_member: 'Can invite new team members',
    remove_member: 'Can remove team members from organisation',
    manage_roles: 'Can assign and modify member roles',
    view_audit: 'Can access audit logs for compliance',
    manage_permissions: 'Can modify organisation permissions (admin only)',
    view_billing: 'Can access billing and credits information',
    manage_billing: 'Can modify billing settings and payment methods',
    view_settings: 'Can access organisation settings',
    manage_settings: 'Can modify organisation configuration',
  };

  // TeamReel Role hierarchy descriptions
  const roleDescriptions: Record<string, { title: string; description: string; scope: string; level: number }> = {
    superadmin: {
      title: 'Superadmin',
      description: 'Platform administrator with access to all organisations',
      scope: 'Cross-organisation',
      level: 1,
    },
    'land_admin': {
      title: 'Land Admin',
      description: 'Federation administrator (e.g., KNVB, DFB admin)',
      scope: 'Organisation-wide',
      level: 2,
    },
    'club_admin': {
      title: 'Club Admin',
      description: 'Club administrator (e.g., Ajax club manager)',
      scope: 'Club-wide',
      level: 3,
    },
    'team_admin': {
      title: 'Team Admin',
      description: 'Team administrator (e.g., Ajax 1 coach)',
      scope: 'Team-specific',
      level: 4,
    },
    'team_staff': {
      title: 'Team Staff',
      description: 'Team staff/editor (e.g., assistant coach)',
      scope: 'Team-specific',
      level: 5,
    },
    'team_member': {
      title: 'Team Member',
      description: 'Team player or member',
      scope: 'User-specific',
      level: 6,
    },
    viewer: {
      title: 'Viewer',
      description: 'Read-only access to team content',
      scope: 'Limited',
      level: 7,
    },
    user: {
      title: 'User',
      description: 'Default user with no memberships',
      scope: 'None',
      level: 8,
    },
  };

  // TeamReel Permission matrix
  const permissionMatrix: Array<{ category: string; permissions: PermissionMatrixRow[] }> = [
    {
      category: 'Organisation Management',
      permissions: [
        {
          permission: 'view_all_organisations',
          superadmin: true,
          land_admin: false,
          club_admin: false,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'manage_organisation',
          superadmin: true,
          land_admin: true,
          club_admin: false,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_organisation',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: true,
        },
      ],
    },
    {
      category: 'Club Management',
      permissions: [
        {
          permission: 'create_club',
          superadmin: true,
          land_admin: true,
          club_admin: false,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'manage_club',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_all_clubs',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
      ],
    },
    {
      category: 'Team Management',
      permissions: [
        {
          permission: 'create_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'manage_team_settings',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'manage_team_matches',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_team',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: true,
        },
      ],
    },
    {
      category: 'User & Profile',
      permissions: [
        {
          permission: 'manage_all_users',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: false,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_users',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: false,
        },
        {
          permission: 'edit_own_profile',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: false,
        },
      ],
    },
    {
      category: 'Content & Media',
      permissions: [
        {
          permission: 'create_content',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: false,
        },
        {
          permission: 'approve_content',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_content',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: true,
          viewer: true,
        },
      ],
    },
    {
      category: 'Credits & Billing',
      permissions: [
        {
          permission: 'manage_credits',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: false,
          team_member: false,
          viewer: false,
        },
        {
          permission: 'view_credits',
          superadmin: true,
          land_admin: true,
          club_admin: true,
          team_admin: true,
          team_staff: true,
          team_member: false,
          viewer: false,
        },
      ],
    },
  ];

  const formatPermissionLabel = (permissionKey: string) => {
    return permissionKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const permissionDescriptionFor = (permissionKey: string) => {
    return permissionDescriptions[permissionKey] || '';
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
                        currentUserRole === roleKey
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
                        {currentUserRole === roleKey && (
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
                  <div>1. <strong>Superadmin</strong> (Django superuser)</div>
                  <div className="ml-4">└─ Can manage ALL organisations</div>
                  <div className="ml-2">2. <strong>Land Admin</strong> (Organisation admin)</div>
                  <div className="ml-6">└─ KNVB/DFB administrator</div>
                  <div className="ml-4">3. <strong>Club Admin</strong> (Project parent admin)</div>
                  <div className="ml-8">└─ Ajax club manager</div>
                  <div className="ml-6">4. <strong>Team Admin</strong> (Project child admin)</div>
                  <div className="ml-10">└─ Ajax 1 coach</div>
                  <div className="ml-8">5. <strong>Team Staff</strong> (Staff/Editor role)</div>
                  <div className="ml-10">6. <strong>Team Member</strong> (Player role)</div>
                  <div className="ml-10">7. <strong>Viewer</strong> (Read-only)</div>
                  <div className="ml-10">8. <strong>User</strong> (No memberships)</div>
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

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold" style={{ minWidth: 280 }}>
                        Feature
                      </th>
                      {roleColumns.map((col) => (
                        <th
                          key={String(col.key)}
                          className="text-center py-3 px-2 font-semibold text-xs"
                          style={{ minWidth: 86 }}
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
                        <tr key={`cat-${category.category}`} className="border-b">
                          <td colSpan={1 + roleColumns.length} className="py-3 px-4 bg-gray-50">
                            <div className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
                              {category.category}
                            </div>
                          </td>
                        </tr>,
                      );

                      category.permissions.forEach((row) => {
                        const label = formatPermissionLabel(row.permission);
                        const desc = permissionDescriptionFor(row.permission);

                        rows.push(
                          <tr
                            key={row.permission}
                            className="border-b hover:bg-gray-50"
                            data-testid={`permission-row-${row.permission}`}
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium">{label}</div>
                              {desc ? <div className="text-xs text-gray-500 mt-0.5">{desc}</div> : null}
                            </td>
                            {roleColumns.map((col) => (
                              <td key={String(col.key)} className="text-center py-3 px-2">
                                {row[col.key] ? <Badge variant="success">✓</Badge> : <span className="text-gray-400">—</span>}
                              </td>
                            ))}
                          </tr>,
                        );
                      });

                      return rows;
                    })}
                  </tbody>
                </table>
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
    </AppShell>
  );
};

export default PermissionsPage;
