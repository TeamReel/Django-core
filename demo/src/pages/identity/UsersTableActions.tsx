/**
 * UserActions — action buttons per row in the identity-level UsersTable.
 */
import React from 'react';
import { api } from '../../api/client';
import { logger } from '@/utils/logger';
import { type User } from './useUsersData';
import type { UserRowItem, TableContext } from './UsersTable.types';
import styles from './UsersTable.module.css';

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

export const UserActions: React.FC<UserActionsProps> = ({
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
      logger.error('Error deleting user', e);
      alert('Error deleting user');
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`Remove ${user.email} from organisation?`)) return;
    try {
      await api.delete(`/organisations/${effectiveOrgSlug}/members/${orgMembershipId}/`);
      fetchUsers();
    } catch (e) {
      logger.error('Error removing member', e);
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
