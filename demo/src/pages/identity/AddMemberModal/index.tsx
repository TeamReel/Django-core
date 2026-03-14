/**
 * AddMemberModal - Modal for adding members to projects/organisations
 */
import React from 'react';
import { useAddMemberData } from './useAddMemberData';
import { ExistingUserTab } from './ExistingUserTab';
import { NewUserTab } from './NewUserTab';
import { LEVEL_LABEL } from './types';
import type { AddMemberModalProps } from './types';
import modalStyles from './AddMemberModal.module.css';
import { useEscapeKey } from '@/hooks/useEscapeKey';

// Re-export types for backward compatibility
export type { AddMemberModalProps, ContextLevel, UserResult, NewUserFormData } from './types';

export default function AddMemberModal(props: AddMemberModalProps) {
  const { isOpen, onClose, contextLevel } = props;
  const data = useAddMemberData(props);
  useEscapeKey(isOpen ? onClose : undefined);

  if (!isOpen) return null;

  const levelLabel = LEVEL_LABEL[contextLevel];

  return (
    <div className={`modal-backdrop overflow-y-auto p-16 ${modalStyles.backdrop}`} onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} className={`bg-surface p-24 rounded-12 text-primary flex-col ${modalStyles.panel}`} role="dialog">
        {/* Header */}
        <div className="flex-between mb-4">
          <h2 className="m-0 fs-20 fw-700">
            Add Member to {levelLabel}
          </h2>
          <button
            onClick={onClose}
            className={`bg-transparent border-none fs-24 cursor-pointer text-muted py-4 px-8 ${modalStyles.closeButton}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="fs-13 text-muted m-0 mb-16">
          {contextLevel === 'team' && 'Member will also be added to the parent club and federation.'}
          {contextLevel === 'club' && 'Member will also be added to the parent federation.'}
          {contextLevel === 'organisation' && 'Member will be added to this federation.'}
        </p>

        {/* Tabs */}
        <div className={`flex-row gap-4 ${modalStyles.tabBar}`}>
          <button
            className={modalStyles.tab}
            data-active={data.tab === 'existing'}
            onClick={() => { data.setTab('existing'); data.setError(null); data.setSuccessMsg(null); }}
          >
            Existing User
          </button>
          <button
            className={modalStyles.tab}
            data-active={data.tab === 'new'}
            onClick={() => { data.setTab('new'); data.setError(null); data.setSuccessMsg(null); }}
          >
            New User
          </button>
        </div>

        {/* Messages */}
        {data.error && <div className="callout-error mb-16">{data.error}</div>}
        {data.successMsg && <div className="callout-success mb-16">{data.successMsg}</div>}

        {/* Tabs content */}
        {data.tab === 'existing' && (
          <ExistingUserTab
            searchQuery={data.searchQuery}
            setSearchQuery={data.setSearchQuery}
            selectedRole={data.selectedRole}
            setSelectedRole={data.setSelectedRole}
            isSearching={data.isSearching}
            searchResults={data.searchResults}
            loading={data.loading}
            onAddUser={data.addExistingUser}
            onClose={onClose}
          />
        )}

        {data.tab === 'new' && (
          <NewUserTab
            newUser={data.newUser}
            setNewUser={data.setNewUser}
            updateNewUserName={data.updateNewUserName}
            setEmailManuallyEdited={data.setEmailManuallyEdited}
            selectedRole={data.selectedRole}
            setSelectedRole={data.setSelectedRole}
            loading={data.loading}
            onSubmit={data.createNewUser}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
