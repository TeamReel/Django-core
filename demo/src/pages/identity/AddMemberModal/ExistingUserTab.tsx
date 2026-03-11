/**
 * ExistingUserTab - Search and add existing users tab
 */
import React from 'react';
import { Button, Input } from '@django-core/design-system';
import type { UserResult } from './types';
import modalStyles from './AddMemberModal.module.css';

interface ExistingUserTabProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedRole: string;
  setSelectedRole: (val: string) => void;
  isSearching: boolean;
  searchResults: UserResult[];
  loading: boolean;
  onAddUser: (user: UserResult) => void;
  onClose: () => void;
}

export function ExistingUserTab({
  searchQuery,
  setSearchQuery,
  selectedRole,
  setSelectedRole,
  isSearching,
  searchResults,
  loading,
  onAddUser,
  onClose,
}: ExistingUserTabProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Role selector */}
        <div className="mb-16 flex-row gap-16">
          <div className="flex-1">
            <label className="block mb-4 fs-14 fw-500">Search Users</label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              autoFocus
            />
          </div>
          <div className={modalStyles.roleSelectWrapper}>
            <label className="block mb-4 fs-14 fw-500">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-input"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Search results */}
        {isSearching && (
          <div className="p-16 text-center text-muted fs-14">
            Searching...
          </div>
        )}

        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="p-16 text-center text-muted fs-14">
            No users found for &quot;{searchQuery}&quot;
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className={`overflow-y-auto ${modalStyles.searchResultsList}`}>
            {searchResults.map((u) => (
              <div
                key={u.id}
                className={`flex-between rounded-8 border mb-8 cursor-pointer ${modalStyles.userRow}`}
              >
                <div>
                  <div className="fw-600 fs-14">
                    {u.first_name} {u.last_name}
                  </div>
                  <div className="fs-13 text-muted">
                    {u.email}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAddUser(u)}
                  loading={loading}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length < 2 && !isSearching && (
          <div className={`text-center text-muted fs-14 ${modalStyles.emptyState}`}>
            Type at least 2 characters to search for users
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-top mt-8 flex-row justify-end pt-12">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
