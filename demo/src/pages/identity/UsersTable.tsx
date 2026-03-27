/**
 * UsersTable — table body with user rows and action buttons for UsersPage.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import styles from './UsersTable.module.css';
import { routes } from '../../routes';
import type { UserProject, UserRowItem, UsersTableProps, UserRowProps } from './UsersTable.types';
import type { User } from './useUsersData';
import { UserActions } from './UsersTableActions';

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
  const user = (isMembership ? item.user : item) as User;
  const userOrgs = user.organisations || [];
  const userProjects: any[] = user.projects || [];
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
          onClick={() => navigate(routes.userDetail({ userId: String(user.id) }))}
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
