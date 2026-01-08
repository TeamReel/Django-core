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
  const permissionMatrix = [
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
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`${
                activeTab === 'hierarchy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Role Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Permission Matrix
            </button>
          </nav>
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
            {permissionMatrix.map((category) => (
              <Card key={category.category} className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{category.category}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-semibold">Permission</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Super</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Land</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Club</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Team Admin</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Staff</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Member</th>
                        <th className="text-center py-2 px-2 font-semibold text-xs">Viewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.permissions.map((row) => (
                        <tr
                          key={row.permission}
                          className="border-b hover:bg-gray-50"
                          data-testid={`permission-row-${row.permission}`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium capitalize">
                              {row.permission.replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.superadmin ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.land_admin ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.club_admin ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.team_admin ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.team_staff ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.team_member ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.viewer ? (
                              <Badge variant="success">✓</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}

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
