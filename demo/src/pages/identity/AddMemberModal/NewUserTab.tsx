/**
 * NewUserTab - Create new user form tab
 */
import React from 'react';
import { Button, Input } from '@django-core/design-system';
import type { NewUserFormData } from './types';
import modalStyles from './AddMemberModal.module.css';

interface NewUserTabProps {
  newUser: NewUserFormData;
  setNewUser: React.Dispatch<React.SetStateAction<NewUserFormData>>;
  updateNewUserName: (field: 'first_name' | 'last_name', value: string) => void;
  setEmailManuallyEdited: (val: boolean) => void;
  selectedRole: string;
  setSelectedRole: (val: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function NewUserTab({
  newUser,
  setNewUser,
  updateNewUserName,
  setEmailManuallyEdited,
  selectedRole,
  setSelectedRole,
  loading,
  onSubmit,
  onClose,
}: NewUserTabProps) {
  return (
    <form onSubmit={onSubmit} className={`flex-1 overflow-y-auto ${modalStyles.formBody}`}>
      <div className="flex-row gap-12 mb-16">
        <div className="flex-1">
          <label className="block mb-4 fs-14 fw-500">First Name</label>
          <Input
            value={newUser.first_name}
            onChange={(e) => updateNewUserName('first_name', e.target.value)}
            placeholder="John"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-4 fs-14 fw-500">Last Name</label>
          <Input
            value={newUser.last_name}
            onChange={(e) => updateNewUserName('last_name', e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="mb-16">
        <label className="block mb-4 fs-14 fw-500">Email Address *</label>
        <Input
          value={newUser.email}
          onChange={(e) => {
            setEmailManuallyEdited(true);
            setNewUser({ ...newUser, email: e.target.value });
          }}
          placeholder="user@example.com"
          required
          type="email"
        />
      </div>

      <div className="mb-16">
        <label className="block mb-4 fs-14 fw-500">Password *</label>
        <Input
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          placeholder="••••••••"
          required
          type="password"
        />
      </div>

      <div className="mb-16">
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

      <div className="gap-8 border-top flex-row justify-end pt-8">
        <Button variant="secondary" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Create &amp; Add Member
        </Button>
      </div>
    </form>
  );
}
