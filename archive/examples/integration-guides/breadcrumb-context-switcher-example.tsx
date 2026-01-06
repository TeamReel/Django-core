import { PageHeader, BreadcrumbContextSwitcher, useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import type { BreadcrumbItem } from '@django-core/page-templates';

/**
 * Example: Organisation Detail Page with Hierarchical Breadcrumb Switchers
 *
 * Shows:
 * - Organisation switcher in breadcrumb
 * - Permission-based filtering
 * - Navigation updates on selection
 */

interface ExampleProps {
  currentOrgId: string;
  currentOrgName: string;
  currentOrgSlug: string;
  organisations: Array<{ id: string; name: string; slug: string }>;
  userRole: 'admin' | 'staff' | 'player';
}

export function OrganisationDetailPage({
  currentOrgId,
  currentOrgName,
  currentOrgSlug,
  organisations,
  userRole,
}: ExampleProps) {
  // Permission check: admins see all orgs, staff/players see only their org
  const canAccessOrganisation = (orgId: string) => {
    if (userRole === 'admin') return true;
    return orgId === currentOrgId;
  };

  const {
    organisationOptions,
    handleOrganisationSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations,
    projects: [],
    users: [],
    context: { currentOrgId },
    permissions: { canAccessOrganisation },
  });

  // Build breadcrumb with embedded context switcher
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/app' },
    {
      label: 'Organisations',
      path: '/app/organisations',
    },
    {
      // This breadcrumb segment is a context switcher
      label: currentOrgName,
      current: true,
      // Render as custom component
      onClick: undefined, // Will be replaced by switcher
    },
  ];

  return (
    <div>
      {/* Standard PageHeader with breadcrumbs */}
      <PageHeader
        title={currentOrgName}
        subtitle={`Manage ${currentOrgName} details and settings`}
        breadcrumbs={breadcrumbs}
      />

      {/* Alternative: Manual breadcrumb with embedded switcher */}
      <nav aria-label="Breadcrumb" style={{ padding: '16px', backgroundColor: '#f9fafb' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <a href="/app" style={{ color: '#6b7280', textDecoration: 'none' }}>Home</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            <a href="/app/organisations" style={{ color: '#6b7280', textDecoration: 'none' }}>Organisations</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            {/* Embedded context switcher replaces plain text */}
            <BreadcrumbContextSwitcher
              label={currentOrgName}
              currentId={currentOrgId}
              options={organisationOptions}
              onSelect={handleOrganisationSwitch}
              current={true}
              hasDropdown={userRole === 'admin'} // Only admins can switch orgs
            />
          </li>
        </ol>
      </nav>

      {/* Page content */}
      <div style={{ padding: '24px' }}>
        <h2>Organisation Details</h2>
        <p>Current organisation: {currentOrgName} ({currentOrgSlug})</p>
        <p>Your role: {userRole}</p>

        {userRole === 'admin' && (
          <p style={{ color: '#10b981', fontSize: '14px' }}>
            ✓ You can switch between organisations using the breadcrumb dropdown
          </p>
        )}
        {userRole !== 'admin' && (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            You can only view your own organisation
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Example 2: Project Detail Page with Nested Context Switchers
 *
 * Shows:
 * - Organisation switcher + Project switcher
 * - Hierarchical filtering (project options constrained by org)
 * - Context preservation on navigation
 */

interface ProjectPageProps {
  currentOrgId: string;
  currentOrgName: string;
  currentOrgSlug: string;
  currentProjectId: string;
  currentProjectName: string;
  currentProjectSlug: string;
  organisations: Array<{ id: string; name: string; slug: string }>;
  projects: Array<{ id: string; name: string; slug: string; organisation_id: string }>;
  userRole: 'admin' | 'staff' | 'player';
}

export function ProjectDetailPage({
  currentOrgId,
  currentOrgName,
  currentOrgSlug,
  currentProjectId,
  currentProjectName,
  currentProjectSlug,
  organisations,
  projects,
  userRole,
}: ProjectPageProps) {
  const {
    organisationOptions,
    projectOptions,
    handleOrganisationSwitch,
    handleProjectSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations,
    projects,
    users: [],
    context: { currentOrgId, currentProjectId },
    permissions: {
      canAccessOrganisation: () => true, // Example: all users can see all orgs
      canAccessProject: () => true, // Example: all users can see all projects
    },
  });

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ padding: '16px', backgroundColor: '#f9fafb' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <a href="/app" style={{ color: '#6b7280', textDecoration: 'none' }}>Home</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            <a href="/app/organisations" style={{ color: '#6b7280', textDecoration: 'none' }}>Organisations</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            {/* Organisation switcher */}
            <BreadcrumbContextSwitcher
              label={currentOrgName}
              currentId={currentOrgId}
              options={organisationOptions}
              onSelect={handleOrganisationSwitch}
              hasDropdown={true}
            />
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            <a href={`/app/organisations/${currentOrgSlug}/projects`} style={{ color: '#6b7280', textDecoration: 'none' }}>
              Projects
            </a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            {/* Project switcher - constrained to current org */}
            <BreadcrumbContextSwitcher
              label={currentProjectName}
              currentId={currentProjectId}
              options={projectOptions} // Automatically filtered by current org
              onSelect={handleProjectSwitch}
              current={true}
              hasDropdown={true}
            />
          </li>
        </ol>
      </nav>

      <div style={{ padding: '24px' }}>
        <h2>Project Details</h2>
        <p>Organisation: {currentOrgName}</p>
        <p>Project: {currentProjectName} ({currentProjectSlug})</p>
        <p>Available projects in this org: {projectOptions.length}</p>

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
            <strong>Hierarchical behavior:</strong> Project switcher only shows projects from "{currentOrgName}".
            If you switch organisations, the project context will reset if the current project doesn't belong to the new org.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: User Detail Page with All Three Switchers
 *
 * Shows:
 * - Complete hierarchical breadcrumb: Home > Orgs > [OrgSwitcher] > Projects > [ProjectSwitcher] > Users > [UserSwitcher]
 * - Permission-based user filtering (players see only self)
 */

interface UserPageProps {
  currentOrgId: string;
  currentOrgName: string;
  currentProjectId?: string;
  currentProjectName?: string;
  currentUserId: string;
  currentUserName: string;
  organisations: Array<{ id: string; name: string; slug: string }>;
  projects: Array<{ id: string; name: string; slug: string; organisation_id: string }>;
  users: Array<{ id: string; username: string; email: string }>;
  currentUserRole: 'admin' | 'staff' | 'player';
  viewedUserId: string;
}

export function UserDetailPage({
  currentOrgId,
  currentOrgName,
  currentUserId,
  currentUserName,
  organisations,
  users,
  currentUserRole,
  viewedUserId,
}: UserPageProps) {
  // Permission: admins/staff see all users, players see only self
  const canViewUser = (userId: string) => {
    if (currentUserRole === 'admin' || currentUserRole === 'staff') return true;
    return userId === currentUserId;
  };

  const {
    organisationOptions,
    userOptions,
    handleOrganisationSwitch,
    handleUserSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations,
    projects: [],
    users,
    context: { currentOrgId, currentUserId: viewedUserId },
    permissions: { canViewUser },
  });

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ padding: '16px', backgroundColor: '#f9fafb' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <a href="/app" style={{ color: '#6b7280', textDecoration: 'none' }}>Home</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            <BreadcrumbContextSwitcher
              label={currentOrgName}
              currentId={currentOrgId}
              options={organisationOptions}
              onSelect={handleOrganisationSwitch}
              hasDropdown={currentUserRole === 'admin'}
            />
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            <a href="/app/users" style={{ color: '#6b7280', textDecoration: 'none' }}>Users</a>
          </li>
          <li aria-hidden="true" style={{ color: '#9ca3af' }}>/</li>
          <li>
            {/* User switcher - filtered by permission */}
            <BreadcrumbContextSwitcher
              label={currentUserName}
              currentId={viewedUserId}
              options={userOptions} // Filtered by canViewUser
              onSelect={handleUserSwitch}
              current={true}
              hasDropdown={currentUserRole !== 'player'} // Players can't switch users
            />
          </li>
        </ol>
      </nav>

      <div style={{ padding: '24px' }}>
        <h2>User Profile</h2>
        <p>Viewing: {currentUserName}</p>
        <p>Your role: {currentUserRole}</p>
        <p>Available users: {userOptions.length}</p>

        {currentUserRole === 'player' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
              <strong>Limited access:</strong> Players can only view their own profile.
              The user switcher is disabled for your role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
