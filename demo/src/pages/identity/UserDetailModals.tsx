import React, { useEffect, useState } from 'react';
import { Alert } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import styles from './UserDetailModals.module.css';
import UserDetailModal from './UserDetailModal';
import UserEditModal from './UserEditModal';
import LinkUserModal from './LinkUserModal';
import CreateTransactionModal from '../../components/transactions/CreateTransactionModal';
import MatchEditModal from './MatchEditModal';
import type { UserDetailDataReturn } from './useUserDetailData';
import type { User as EditUser } from './userEditTypes';
import type { User } from '@/types/api/user';

// User from data is `Record<string, unknown> | null`.
// We bridge to the canonical User type via unknown.
type ModalUser = User;

/* ------------------------------------------------------------------ */
/*  ProjectMembershipEditModal (was inline in UserDetailPage)          */
/* ------------------------------------------------------------------ */

export function ProjectMembershipEditModal({
  opened,
  onClose,
  membership,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  membership: { projectId: string; projectName: string; currentRole: string; membershipId?: string } | null;
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
      className={`flex-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`p-20 rounded-8 ${styles.modalBody}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">Edit membership role</h2>
          <button
            onClick={onClose}
            className={`bg-transparent border-none fs-18 cursor-pointer ${styles.closeButton}`}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className={`text-muted fs-13 ${styles.subtitle}`}>{membership.projectName}</div>

        {error ? (
          <div className={`mt-12 rounded-6 ${styles.errorBox}`}>{error}</div>
        ) : null}

        <div className="flex-col gap-10 mt-16">
          <div className="flex-col gap-6">
            <label className="fw-600" htmlFor="membership-role-select">
              Role
            </label>
            <select
              id="membership-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={saving}
              className={`rounded-6 bg-surface-2 ${styles.selectInput}`}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className={`gap-8 mt-8 ${styles.buttonRow}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`rounded-6 bg-surface-2 ${styles.cancelButton}`}
              data-saving={saving || undefined}
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
                  logger.error('Failed to save', e);
                  setError(e instanceof Error ? e.message : 'Failed to save');
                } finally {
                  setSaving(false);
                }
              }}
              className={`rounded-6 ${styles.saveButton}`}
              data-saving={saving || undefined}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UserDetailModals — all modal instances for UserDetailPage          */
/* ------------------------------------------------------------------ */

export interface UserDetailModalsProps {
  data: UserDetailDataReturn;
}

export const UserDetailModals: React.FC<UserDetailModalsProps> = ({ data }) => {
  const {
    isMatchEditModalOpen,
    setIsMatchEditModalOpen,
    selectedEditMatch,
    setSelectedEditMatch,
    saveMatchEdits,
    isCreateTxnModalOpen,
    setIsCreateTxnModalOpen,
    setTab,
    getPreferredOrganisationId,
    currentUserIdForTxn,
    targetUserIdForTxn,
    userWalletOptions,
    isViewModalOpen,
    setIsViewModalOpen,
    user,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSaveUser,
    fetchUser,
    primaryOrgSlug,
    isLinkModalOpen,
    setIsLinkModalOpen,
    linkOrgs,
    userOrgs,
    linkClubs,
    linkTeams,
    isEditMembershipModalOpen,
    setIsEditMembershipModalOpen,
    editingMembership,
    setEditingMembership,
    userProjects,
    updateProjectMembershipRole,
    linkOptionsError,
  } = data;

  return (
    <>
      <MatchEditModal
        opened={isMatchEditModalOpen}
        onClose={() => {
          setIsMatchEditModalOpen(false);
          setSelectedEditMatch(null);
        }}
        match={selectedEditMatch as { id: string; title: string } | null}
        onSave={async (payload) => {
          if (!selectedEditMatch) return;
          await saveMatchEdits(selectedEditMatch, payload);
        }}
      />

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

      <UserDetailModal opened={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} user={user as unknown as ModalUser} />

      <UserEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user as unknown as EditUser}
        onSave={handleSaveUser}
        onSaved={fetchUser}
        organisationSlug={String(primaryOrgSlug || getPreferredOrganisationId() || '')}
      />

      <LinkUserModal
        opened={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        user={user as unknown as ModalUser}
        organisations={linkOrgs.length ? linkOrgs : userOrgs}
        clubs={linkClubs}
        teams={linkTeams}
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
          let membershipId = editingMembership.membershipId;

          if (!membershipId) {
            const project = userProjects.find((p) => String(p?.id) === String(projectId));
            membershipId = (project as unknown as Record<string, unknown>)?.membership_id as string | undefined;
          }

          await updateProjectMembershipRole(projectId, membershipId, role);
        }}
      />

      {linkOptionsError && isLinkModalOpen ? (
        <div className={styles.linkErrorAlert}>
          <Alert variant="warning">{linkOptionsError}</Alert>
        </div>
      ) : null}
    </>
  );
};

export default UserDetailModals;
