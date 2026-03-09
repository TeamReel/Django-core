/**
 * UsersTable — table body with user rows and action buttons for UsersPage.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { api } from '../../api/client';
import { type User } from './useUsersData';
import styles from './UsersTable.module.css';

/** Minimal shape for a user project membership from the API. */
interface UserProject {
  id?: string | number;
  name?: string;
  slug?: string;
  parent?: string | number | null;
  parent_name?: string;
}

/** Shape for context obj passed into table. */
interface TableContext {
  organisation?: { id?: string; slug?: string; name?: string };
}

/** A user row item — either a raw User or a membership wrapper with `.user`. */
interface UserRowItem {
  id?: string;
  user?: User;
  is_active?: boolean;
  [key: string]: unknown;
}

interface UsersTableProps {
  filteredUsers: UserRowItem[];
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  navigate: (to: string) => void;
  orgIdParam: string | null | undefined;
  context: TableContext;
  organisations: { id: string | number; name: string; slug?: string }[];
  selectedOrgId: string;
  selectedClubKey: string;
  selectedTeamKey: string;
  handleEditClick: (item: UserRowItem) => void;
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
  <div className={`${styles.root} overflow-x-auto`}>
    <Table>
      <thead>
        <tr>
          <th className={styles.thUser}>User</th>
          <th className={styles.thEmail}>Email</th>
          <th className={styles.thRole}>Role</th>
          <th className={styles.thStatus}>Status</th>
          <th className={styles.thOrganisations}>Organisations</th>
          <th className={styles.thClub}>Club</th>
          <th className={styles.thTeam}>Team</th>
          <th className={`text-right ${styles.thActions}`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredUsers.length === 0 ? (
          <tr>
            <td colSpan={8} className="p-24 text-center text-muted">No users found.</td>
          </tr>
        ) : (
          filteredUsers.map((item: UserRowItem) => (
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

const UserRow: React.FC<UserRowProps & { item: UserRowItem }> = ({
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
  const user: any = isMembership ? item.user : item;
  const userOrgs = user.organisations || [];
  const userProjects = user.projects || [];
  const displayRole = user.role || 'User';
  const isActive = isMembership ? item.is_active : user.is_active;

  // Parent projects (clubs) = projects without parent
  const directParentProjects = userProjects.filter((p: UserProject) => !p.parent);

  // Child projects (teams) = projects with parent
  const childProjects = userProjects.filter((p: UserProject) => !!p.parent);

  // Unique parent clubs derived from team parent_name
  const parentClubsFromTeams = new Map<string, { id?: string | number; name: string }>();
  childProjects.forEach((p: UserProject) => {
    if (p.parent_name && !parentClubsFromTeams.has(p.parent_name)) {
      parentClubsFromTeams.set(p.parent_name, { id: p.parent ?? undefined, name: p.parent_name });
    }
  });

  const allParentClubs = [...directParentProjects, ...Array.from(parentClubsFromTeams.values())];

  return (
    <tr>
      <td>
        <div
          className={`fw-500 fs-sm cursor-pointer ${styles.userNameLink}`}
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
            ? userOrgs.map((org: { id?: string; name?: string }) => (
                <span key={org.id} className={`border rounded-4 fs-11 bg-surface-2 text-primary ${styles.tagBadge}`}>{org.name}</span>
              ))
            : <span className="text-muted fs-12">-</span>}
        </div>
      </td>
      <td>
        <div className="flex-row gap-4 flex-wrap">
          {allParentClubs.length > 0
            ? allParentClubs.map((club: { id?: string | number; name: string }, idx: number) => (
                <span key={club.id || idx} className={`border rounded-4 fs-11 bg-surface-2 text-primary ${styles.tagBadge}`}>{club.name}</span>
              ))
            : <span className="text-muted fs-12">-</span>}
        </div>
      </td>
      <td>
        <div className="flex-row gap-4 flex-wrap">
          {childProjects.length > 0
            ? childProjects.map((project: UserProject) => (
                <span key={project.id} className={`border rounded-4 fs-11 bg-surface-2 text-primary ${styles.tagBadge}`}>{project.name}</span>
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
  item: UserRowItem;
  user: any;
  userOrgs: Array<{ id?: string; slug?: string; name?: string; membership_id?: string }>;
  isMembership: boolean;
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  navigate: (to: string) => void;
  orgIdParam: string | null | undefined;
  context: TableContext;
  organisations: { id: string | number; name: string; slug?: string }[];
  selectedOrgId: string;
  handleEditClick: (item: UserRowItem) => void;
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

  const orgEntry = userOrgs.find((o) => {
    const slugMatches = o?.slug && effectiveOrgSlug && String(o.slug).toLowerCase() === effectiveOrgSlug;
    const idMatches = o?.id && effectiveOrgId && String(o.id) === String(effectiveOrgId);
    return Boolean(slugMatches || idMatches);
  });

  const isInOrg = Boolean(orgEntry);
  const orgMembershipId = orgEntry?.membership_id || null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user.id}/`);
      fetchUsers();
    } catch (e) {
      console.error(e);
      console.error(e);
      alert('Error deleting user');
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`Remove ${user.email} from organisation?`)) return;
    try {
      await api.delete(`/organisations/${effectiveOrgSlug}/members/${orgMembershipId}/`);
      fetchUsers();
    } catch (e) {
      console.error(e);
      console.error(e);
      alert('Error removing member');
    }
  };

  return (
    <div className={`flex-row gap-8 ${styles.actionsRow}`}>
      {/* View */}
      {((isMembership && (orgIdParam || context.organisation)) || !isMembership) && (
        <button
          onClick={() => { setDetailUser(user); setIsDetailModalOpen(true); }}
          className={`${actionBtn} ${styles.btnView}`}
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
          className={`${actionBtn} ${styles.btnEdit}`}
        >
          Edit
        </button>
      )}

      {/* Delete */}
      {canManageUsers && (
        <button onClick={handleDelete} className={`${actionBtn} text-error ${styles.btnDelete}`}>
          Delete
        </button>
      )}

      {/* Link */}
      {canManageUsers && (
        <button
          onClick={() => { setLinkUser(user); setIsLinkModalOpen(true); }}
          className={`rounded-4 bg-surface cursor-pointer fs-12 fw-500 text-primary ${styles.btnLink}`}
        >
          Link
        </button>
      )}

      {/* Assign / Unassign */}
      {canManageUsers && effectiveOrgSlug && isInOrg && orgMembershipId && (
        <button onClick={handleUnassign} className={`${actionBtn} text-error ${styles.btnUnassign}`}>
          Unassign
        </button>
      )}
      {canManageUsers && effectiveOrgSlug && !isInOrg && (
        <button
          onClick={() => { setAssignUser(user); setIsAssignModalOpen(true); }}
          className={`rounded-4 bg-surface cursor-pointer fs-12 fw-500 text-success ${styles.btnAssign}`}
        >
          Assign
        </button>
      )}
      {canManageUsers && !effectiveOrgSlug && isSuperAdmin && !isMembership && (
        <button
          onClick={() => { setAssignUser(user); setIsAssignModalOpen(true); }}
          className={`rounded-4 bg-surface cursor-pointer fs-12 fw-500 text-success ${styles.btnAssign}`}
        >
          Assign
        </button>
      )}
    </div>
  );
};
