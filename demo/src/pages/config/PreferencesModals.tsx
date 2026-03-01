import React from 'react';
import {
  Button,
  Alert,
  Input,
  Modal,
} from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from './usePreferencesData';
import type { PreferencesDataReturn } from './usePreferencesData';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type PreferencesModalsProps = Pick<
  PreferencesDataReturn,
  | 'user'
  | 'setUser'
  | 'isProfileModalOpen'
  | 'setIsProfileModalOpen'
  | 'isPasswordModalOpen'
  | 'setIsPasswordModalOpen'
  | 'isAvatarModalOpen'
  | 'setIsAvatarModalOpen'
  | 'profileFirstName'
  | 'setProfileFirstName'
  | 'profileLastName'
  | 'setProfileLastName'
  | 'profileEmail'
  | 'setProfileEmail'
  | 'profileTwoFactorEnabled'
  | 'setProfileTwoFactorEnabled'
  | 'profileCurrentPassword'
  | 'setProfileCurrentPassword'
  | 'profileSaving'
  | 'setProfileSaving'
  | 'profileError'
  | 'setProfileError'
  | 'passwordCurrent'
  | 'setPasswordCurrent'
  | 'passwordNext'
  | 'setPasswordNext'
  | 'passwordConfirm'
  | 'setPasswordConfirm'
  | 'passwordSaving'
  | 'setPasswordSaving'
  | 'passwordError'
  | 'setPasswordError'
  | 'passwordSuccess'
  | 'setPasswordSuccess'
  | 'avatarFile'
  | 'setAvatarFile'
  | 'avatarSaving'
  | 'setAvatarSaving'
  | 'avatarError'
  | 'setAvatarError'
>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const PreferencesModals: React.FC<PreferencesModalsProps> = (props) => {
  const {
    setUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    isAvatarModalOpen,
    setIsAvatarModalOpen,
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profileEmail,
    setProfileEmail,
    profileTwoFactorEnabled,
    setProfileTwoFactorEnabled,
    profileCurrentPassword,
    setProfileCurrentPassword,
    profileSaving,
    setProfileSaving,
    profileError,
    setProfileError,
    passwordCurrent,
    setPasswordCurrent,
    passwordNext,
    setPasswordNext,
    passwordConfirm,
    setPasswordConfirm,
    passwordSaving,
    setPasswordSaving,
    passwordError,
    setPasswordError,
    passwordSuccess,
    setPasswordSuccess,
    avatarFile,
    setAvatarFile,
    avatarSaving,
    setAvatarSaving,
    avatarError,
    setAvatarError,
  } = props;

  return (
    <>
      {/* ---- Profile Edit Modal ---- */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => {
          if (profileSaving) return;
          setIsProfileModalOpen(false);
        }}
        title="Edit profile"
        footer={
          <div className="gap-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsProfileModalOpen(false)}
              disabled={profileSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  setProfileSaving(true);
                  setProfileError(null);

                  const apiBaseUrl = getApiBaseUrl();
                  const response = await fetch(`${apiBaseUrl}/api/v1/auth/profile/`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-CSRFToken': getCsrfToken(),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      first_name: profileFirstName,
                      last_name: profileLastName,
                      email: profileEmail,
                      two_factor_enabled: profileTwoFactorEnabled,
                      current_password: profileCurrentPassword,
                    }),
                  });

                  const json = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    const message =
                      (json as any)?.error?.message ||
                      (json as any)?.message ||
                      `Failed to update profile (${response.status})`;
                    throw new Error(message);
                  }

                  const updatedUser = (json as any)?.data || json;
                  if (typeof setUser === 'function') {
                    setUser(updatedUser);
                  }
                  setIsProfileModalOpen(false);
                } catch (e) {
                  setProfileError(e instanceof Error ? e.message : 'Failed to update profile');
                } finally {
                  setProfileSaving(false);
                }
              }}
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {profileError && (
          <div className="mb-12">
            <Alert variant="error">{profileError}</Alert>
          </div>
        )}
        <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label="First name"
            value={profileFirstName}
            onChange={(e) => setProfileFirstName(e.target.value)}
            placeholder="First name"
            disabled={profileSaving}
          />
          <Input
            label="Last name"
            value={profileLastName}
            onChange={(e) => setProfileLastName(e.target.value)}
            placeholder="Last name"
            disabled={profileSaving}
          />
        </div>
        <div className="mt-12">
          <Input
            label="Email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={profileSaving}
          />
        </div>
        <div className="flex-row gap-8 mt-12">
          <input
            id="twoFactorEnabled"
            type="checkbox"
            checked={profileTwoFactorEnabled}
            onChange={(e) => setProfileTwoFactorEnabled(e.target.checked)}
            disabled={profileSaving}
          />
          <label htmlFor="twoFactorEnabled" className="text-sm">
            Enable 2FA (flag)
          </label>
        </div>
        <div className="mt-12">
          <Input
            label="Current password (required)"
            value={profileCurrentPassword}
            onChange={(e) => setProfileCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            type="password"
            disabled={profileSaving}
          />
          <div className="text-xs text-gray-500" style={{ marginTop: 6 }}>
            Required to confirm changes to your account.
          </div>
        </div>
      </Modal>

      {/* ---- Password Change Modal ---- */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          if (passwordSaving) return;
          setIsPasswordModalOpen(false);
        }}
        title="Change password"
        footer={
          <div className="gap-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={passwordSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  setPasswordSaving(true);
                  setPasswordError(null);
                  setPasswordSuccess(false);

                  const apiBaseUrl = getApiBaseUrl();
                  const response = await fetch(`${apiBaseUrl}/api/v1/auth/change-password/`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-CSRFToken': getCsrfToken(),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      current_password: passwordCurrent,
                      new_password: passwordNext,
                      new_password_confirm: passwordConfirm,
                    }),
                  });

                  const json = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    const message =
                      (json as any)?.error?.message ||
                      (json as any)?.message ||
                      `Failed to change password (${response.status})`;
                    throw new Error(message);
                  }

                  setPasswordSuccess(true);
                  setPasswordCurrent('');
                  setPasswordNext('');
                  setPasswordConfirm('');
                } catch (e) {
                  setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
                } finally {
                  setPasswordSaving(false);
                }
              }}
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        }
      >
        {passwordSuccess && (
          <div className="mb-12">
            <Alert variant="success">Password updated.</Alert>
          </div>
        )}
        {passwordError && (
          <div className="mb-12">
            <Alert variant="error">{passwordError}</Alert>
          </div>
        )}
        <div className="flex-col gap-12">
          <Input
            label="Current password"
            value={passwordCurrent}
            onChange={(e) => setPasswordCurrent(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
          <Input
            label="New password"
            value={passwordNext}
            onChange={(e) => setPasswordNext(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
          <Input
            label="Confirm new password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
        </div>
      </Modal>

      {/* ---- Avatar Upload Modal ---- */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => {
          if (avatarSaving) return;
          setIsAvatarModalOpen(false);
        }}
        title="Update profile photo"
        footer={
          <div className="gap-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAvatarModalOpen(false)}
              disabled={avatarSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                if (!avatarFile) {
                  setAvatarError('Please choose an image file');
                  return;
                }

                try {
                  setAvatarSaving(true);
                  setAvatarError(null);

                  const apiBaseUrl = getApiBaseUrl();
                  const formData = new FormData();
                  formData.append('avatar', avatarFile);

                  const response = await fetch(`${apiBaseUrl}/api/v1/auth/avatar/`, {
                    method: 'POST',
                    headers: {
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-CSRFToken': getCsrfToken(),
                    },
                    credentials: 'include',
                    body: formData,
                  });

                  const json = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    const message =
                      (json as any)?.error?.message ||
                      (json as any)?.message ||
                      `Failed to upload avatar (${response.status})`;
                    throw new Error(message);
                  }

                  const updatedUser = (json as any)?.data || json;
                  if (typeof setUser === 'function') {
                    setUser(updatedUser);
                  }

                  setIsAvatarModalOpen(false);
                  setAvatarFile(null);
                } catch (e) {
                  setAvatarError(e instanceof Error ? e.message : 'Failed to upload avatar');
                } finally {
                  setAvatarSaving(false);
                }
              }}
              disabled={avatarSaving}
            >
              {avatarSaving ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        }
      >
        {avatarError && (
          <div className="mb-12">
            <Alert variant="error">{avatarError}</Alert>
          </div>
        )}
        <div className="flex-col gap-8">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            disabled={avatarSaving}
          />
          <div className="text-xs text-gray-500">
            PNG/JPG recommended. After upload, you may need a hard refresh if your browser caches the old image.
          </div>
        </div>
      </Modal>
    </>
  );
};
