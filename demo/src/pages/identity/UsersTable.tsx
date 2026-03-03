/**
 * UsersTable — table body with user rows and action buttons for UsersPage.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCookie, type User } from './useUsersData';

interface UsersTableProps {
  filteredUsers: any[];
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  navigate: (to: string) => void;
  orgIdParam: string | null | undefined;
  context: any;
  organisations: { id: string | number; name: string; slug?: string }[];
  selectedOrgId: string;
  selectedClubKey: string;
  selectedTeamKey: string;
  handleEditClick: (item: any) => void;
  setDetailUser: (u: User | null) => void;
  setIsDetailModalOpen: (v: boolean) => void;
  setAssignUser: (u: User | null) => void;
  setIsAssignModalOpen: (v: boolean) => void;
  setLinkUser: (u: User | null) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  fetchUsers: () => void;
}

/** Props shared by UserRow and UserActions (excludes filteredUsers). */
type UserRowProps = Omit<UsersTableProps, 'filteredUsers'>;

export const UsersTable: React.FC<UsersTableProps> = ({
  filteredUsers,
  canManageUsers,
  isSuperAdmin,
  navigate,
  orgIdParam,
  context,
  organisations,
  selectedOrgId,
  selectedClubKey,
  selectedTeamKey,
  handleEditClick,
  setDetailUser,
  setIsDetailModalOpen,
  setAssignUser,
  setIsAssignModalOpen,
  setLinkUser,
  setIsLinkModalOpen,
  fetchUsers,
}) => (
  <div className="overflow-x-auto">
    <Table>
      <thead>
        <tr>
          <th style={{ minWidth: '150px' }}>User</th>
          <th style={{ minWidth: '200px' }}>Email</th>
          <th style={{ minWidth: '100px' }}>Role</th>
          <th style={{ minWidth: '100px' }}>Status</th>
          <th style={{ minWidth: '150px' }}>Organisations</th>
          <th style={{ minWidth: '150px' }}>Club</th>
          <th style={{ minWidth: '150px' }}>Team</th>
          <th className="text-right" style={{ minWidth: '150px' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredUsers.length === 0 ? (
          <tr>
            <td colSpan={8} className="p-24 text-center text-muted">No users found.</td>
          </tr>
        ) : (
          filteredUsers.map((item: any) => (
            <UserRow
              key={item.id || item.user?.id}
              item={item}
              canManageUsers={canManageUsers}
              isSuperAdmin={isSuperAdmin}
              navigate={navigate}
              orgIdParam={orgIdParam}
              context={context}
              organisations={organisations}
              selectedOrgId={selectedOrgId}
              selectedClubKey={selectedClubKey}
              selectedTeamKey={selectedTeamKey}
              handleEditClick={handleEditClick}
              setDetailUser={setDetailUser}
              setIsDetailModalOpen={setIsDetailModalOpen}
              setAssignUser={setAssignUser}
              setIsAssignModalOpen={setIsAssignModalOpen}
              setLinkUser={setLinkUser}
              setIsLinkModalOpen={setIsLinkModalOpen}
              fetchUsers={fetchUsers}
            />
          ))
        )}
      </tbody>
    </Table>
  </div>
);

// ── Single row ────────────────────────────────────────────────────────

const UserRow: React.FC<UserRowProps & { item: any }> = ({
  item,
  canManageUsers,
  isSuperAdmin,
  navigate,
  orgIdParam,
  context,
  organisations,
  selectedOrgId,
  handleEditClick,
  setDetailUser,
  setIsDetailModalOpen,
  setAssignUser,
  setIsAssignModalOpen,
  setLinkUser,
  setIsLinkModalOpen,
  fetchUsers,
}) => {
  const isMembership = !!item.user;
  const user = isMembership ? item.user : item;
  const userOrgs = user.organisations || [];
  const userProjects = user.projects || [];
  const displayRole = user.role || 'User';
  const isActive = isMembership ? item.is_active : user.is_active;

  // Parent projects (clubs) = projects without parent
  const directParentProjects = userProjects.filter((p: any) => !p.parent);

  // Child projects (teams) = projects with parent
  const childProjects = userProjects.filter((p: any) => !!p.parent);

  // Unique parent clubs derived from team parent_name
  const parentClubsFromTeams = new Map<string, any>();
  childProjects.forEach((p: any) => {
    if (p.parent_name && !parentClubsFromTeams.has(p.parent_name)) {
      parentClubsFromTeams.set(p.parent_name, { id: p.parent, name: p.parent_name });
    }
  });

  const allParentClubs = [...directParentProjects, ...Array.from(parentClubsFromTeams.values())];

  return (
    <tr>
      <td>
        <div
          className="fw-500 fs-sm cursor-pointer"
          style={{ color: '#0066cc', textDecoration: 'underline' }}
          onClick={() => navigate(`/users/${user.id}`)}
        >
          {user.first_name} {user.last_name}
        </div>
      </td>
      <td className="fs-sm">{user.email}</td>
      <td><Badge variant="default">{displayRole}</Badge></td>
      <td>
        <Badge variant={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Badge>
      </td>
      <td>
        <div className="flex-row gap-4 flex-wrap">
          {userOrgs.length > 0
            ? userOrgs.map((org: any) => (
                <span key={org.id} className="border rounded-4 fs-11 bg-surface-2 text-primary" style={{ padding: '2px 6px' }}>{org.name}</span>
              ))
            : <span className="text-muted fs-12">-</span>}
        </div>
      </td>
      <td>
        <div className="flex-row gap-4 flex-wrap">
          {allParentClubs.length > 0
            ? allParentClubs.map((club: any, idx: number) => (
                <span key={club.id || idx} className="border rounded-4 fs-11 bg-surface-2 text-primary" style={{ padding: '2px 6px' }}>{club.name}</span>
              ))
            : <span className="text-muted fs-12">-</span>}
        </div>
      </td>
      <td>
        <div className="flex-row gap-4 flex-wrap">
          {childProjects.length > 0
            ? childProjects.map((project: any) => (
                <span key={project.id} className="border rounded-4 fs-11 bg-surface-2 text-primary" style={{ padding: '2px 6px' }}>{project.name}</span>
              ))
            : <span className="text-muted fs-12">-</span>}
        </div>
      </td>
      <td>
        <UserActions
          item={item}
          user={user}
          userOrgs={userOrgs}
          isMembership={isMembership}
          canManageUsers={canManageUsers}
          isSuperAdmin={isSuperAdmin}
          navigate={navigate}
          orgIdParam={orgIdParam}
          context={context}
          organisations={organisations}
          selectedOrgId={selectedOrgId}
          handleEditClick={handleEditClick}
          setDetailUser={setDetailUser}
          setIsDetailModalOpen={setIsDetailModalOpen}
          setAssignUser={setAssignUser}
          setIsAssignModalOpen={setIsAssignModalOpen}
          setLinkUser={setLinkUser}
          setIsLinkModalOpen={setIsLinkModalOpen}
          fetchUsers={fetchUsers}
        />
      </td>
    </tr>
  );
};

// ── Action buttons per row ────────────────────────────────────────────

interface UserActionsProps {
  item: any;
  user: any;
  userOrgs: any[];
  isMembership: boolean;
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  navigate: (to: string) => void;
  orgIdParam: string | null | undefined;
  context: any;
  organisations: { id: string | number; name: string; slug?: string }[];
  selectedOrgId: string;
  handleEditClick: (item: any) => void;
  setDetailUser: (u: User | null) => void;
  setIsDetailModalOpen: (v: boolean) => void;
  setAssignUser: (u: User | null) => void;
  setIsAssignModalOpen: (v: boolean) => void;
  setLinkUser: (u: User | null) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  fetchUsers: () => void;
}

const actionBtn = 'rounded-4 bg-surface cursor-pointer fs-12 py-4 px-8';

const UserActions: React.FC<UserActionsProps> = ({
  item,
  user,
  userOrgs,
  isMembership,
  canManageUsers,
  isSuperAdmin,
  navigate,
  orgIdParam,
  context,
  organisations,
  selectedOrgId,
  handleEditClick,
  setDetailUser,
  setIsDetailModalOpen,
  setAssignUser,
  setIsAssignModalOpen,
  setLinkUser,
  setIsLinkModalOpen,
  fetchUsers,
}) => {
  const selectedOrg = isSuperAdmin && selectedOrgId
    ? organisations.find(o => String(o.id) === String(selectedOrgId))
    : null;

  const effectiveOrgSlug = String(orgIdParam || selectedOrg?.slug || context.organisation?.slug || '').toLowerCase();
  const effectiveOrgId = String(selectedOrg?.id || orgIdParam || context.organisation?.id || '');

  const orgEntry = userOrgs.find((o: any) => {
    const slugMatches = o?.slug && effectiveOrgSlug && String(o.slug).toLowerCase() === effectiveOrgSlug;
    const idMatches = o?.id && effectiveOrgId && String(o.id) === String(effectiveOrgId);
    return Boolean(slugMatches || idMatches);
  });

  const isInOrg = Boolean(orgEntry);
  const orgMembershipId = orgEntry?.membership_id || null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const csrfToken = getCookie('csrftoken');
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${user.id}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        credentials: 'include',
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.message || 'Failed to delete user');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting user');
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`Remove ${user.email} from organisation?`)) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const csrfToken = getCookie('csrftoken');
      const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${effectiveOrgSlug}/members/${orgMembershipId}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        credentials: 'include',
      });
      if (res.ok) fetchUsers();
      else alert('Failed to remove member');
    } catch (e) {
      console.error(e);
      alert('Error removing member');
    }
  };

  return (
    <div className="gap-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
      {/* View */}
      {((isMembership && (orgIdParam || context.organisation)) || !isMembership) && (
        <button
          onClick={() => { setDetailUser(user); setIsDetailModalOpen(true); }}
          className={actionBtn}
          style={{ border: '1px solid #6c757d', color: '#6c757d' }}
        >
          View
        </button>
      )}

      {/* Edit */}
      {canManageUsers && (
        <button
          onClick={() => {
            if (isMembership && (orgIdParam || context.organisation)) {
              navigate(`/organisations/${orgIdParam || context.organisation?.slug}/members/${item.id}?action=edit`);
            } else {
              handleEditClick(item);
            }
          }}
          className={actionBtn}
          style={{ border: '1px solid var(--app-warning)', color: 'var(--app-warning)' }}
        >
          Edit
        </button>
      )}

      {/* Delete */}
      {canManageUsers && (
        <button onClick={handleDelete} className={actionBtn} style={{ border: '1px solid #dc3545', color: 'var(--app-error)' }}>
          Delete
        </button>
      )}

      {/* Link */}
      {canManageUsers && (
        <button
          onClick={() => { setLinkUser(user); setIsLinkModalOpen(true); }}
          className="rounded-4 bg-surface cursor-pointer fs-12 fw-500"
          style={{ padding: '6px 12px', border: '1px solid #007bff', color: 'var(--app-primary)' }}
        >
          Link
        </button>
      )}

      {/* Assign / Unassign */}
      {canManageUsers && effectiveOrgSlug && isInOrg && orgMembershipId && (
        <button onClick={handleUnassign} className={actionBtn} style={{ border: '1px solid #dc3545', color: 'var(--app-error)' }}>
          Unassign
        </button>
      )}
      {canManageUsers && effectiveOrgSlug && !isInOrg && (
        <button
          onClick={() => { setAssignUser(user); setIsAssignModalOpen(true); }}
          className="rounded-4 bg-surface cursor-pointer fs-12 fw-500"
          style={{ padding: '6px 12px', border: '1px solid #1e7e34', color: 'var(--app-success)' }}
        >
          Assign
        </button>
      )}
      {canManageUsers && !effectiveOrgSlug && isSuperAdmin && !isMembership && (
        <button
          onClick={() => { setAssignUser(user); setIsAssignModalOpen(true); }}
          className="rounded-4 bg-surface cursor-pointer fs-12 fw-500"
          style={{ padding: '6px 12px', border: '1px solid #1e7e34', color: 'var(--app-success)' }}
        >
          Assign
        </button>
      )}
    </div>
  );
};
