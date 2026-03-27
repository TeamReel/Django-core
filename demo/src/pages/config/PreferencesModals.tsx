import React from 'react';
import {
  Button,
  Alert,
  Input,
} from '@django-core/design-system';
import { ProfileSheet } from '@/components/ProfileSheet';
import { api } from '@/api';
import type { User as ApiUser } from '@/types/api/user';
import { logger } from '@/utils/logger';
import type { PreferencesDataReturn } from './usePreferencesData';
import styles from './PreferencesModals.module.css';

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
      {/* ---- Profile Edit Sheet ---- */}
      <ProfileSheet
        isOpen={isProfileModalOpen}
        onClose={() => {
          if (profileSaving) return;
          setIsProfileModalOpen(false);
        }}
        title="Profiel bewerken"
        footer={
          <div className={`gap-8 ${styles.footer}`}>
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

                  const updatedUser = await api.patch<ApiUser>('/auth/profile/', {
                    first_name: profileFirstName,
                    last_name: profileLastName,
                    email: profileEmail,
                    two_factor_enabled: profileTwoFactorEnabled,
                    current_password: profileCurrentPassword,
                  });

                  if (typeof setUser === 'function') {
                    setUser(updatedUser as unknown as Parameters<typeof setUser>[0]);
                  }
                  setIsProfileModalOpen(false);
                } catch (e) {
                  logger.error('Failed to update profile', e);
                  setProfileError(e instanceof Error ? e.message : 'Profiel bijwerken mislukt');
                } finally {
                  setProfileSaving(false);
                }
              }}
              disabled={profileSaving}
            >
              {profileSaving ? 'Opslaan…' : 'Opslaan'}
            </Button>
          </div>
        }
      >
        {profileError && (
          <div className="mb-12">
            <Alert variant="error">{profileError}</Alert>
          </div>
        )}
        <div className={`flex-col gap-12 ${styles.flexColumn}`}>
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
          <div className={`text-xs text-gray-500 ${styles.marginTopSpace2}`}>
            Vereist om wijzigingen aan je account te bevestigen.
          </div>
        </div>
      </ProfileSheet>

      {/* ---- Password Change Sheet ---- */}
      <ProfileSheet
        isOpen={isPasswordModalOpen}
        onClose={() => {
          if (passwordSaving) return;
          setIsPasswordModalOpen(false);
        }}
        title="Wachtwoord wijzigen"
        footer={
          <div className={`gap-8 ${styles.footer}`}>
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

                  await api.post('/auth/change-password/', {
                    current_password: passwordCurrent,
                    new_password: passwordNext,
                    new_password_confirm: passwordConfirm,
                  });

                  setPasswordSuccess(true);
                  setPasswordCurrent('');
                  setPasswordNext('');
                  setPasswordConfirm('');
                } catch (e) {
                  logger.error('Failed to change password', e);
                  setPasswordError(e instanceof Error ? e.message : 'Wachtwoord wijzigen mislukt');
                } finally {
                  setPasswordSaving(false);
                }
              }}
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Opslaan…' : 'Wachtwoord wijzigen'}
            </Button>
          </div>
        }
      >
        {passwordSuccess && (
          <div className="mb-12">
            <Alert variant="success">Wachtwoord bijgewerkt.</Alert>
          </div>
        )}
        {passwordError && (
          <div className="mb-12">
            <Alert variant="error">{passwordError}</Alert>
          </div>
        )}
        <div className="flex-col gap-12">
          <Input
            label="Huidig wachtwoord"
            value={passwordCurrent}
            onChange={(e) => setPasswordCurrent(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
          <Input
            label="Nieuw wachtwoord"
            value={passwordNext}
            onChange={(e) => setPasswordNext(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
          <Input
            label="Bevestig nieuw wachtwoord"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            type="password"
            disabled={passwordSaving}
          />
        </div>
      </ProfileSheet>

      {/* ---- Avatar Upload Sheet ---- */}
      <ProfileSheet
        isOpen={isAvatarModalOpen}
        onClose={() => {
          if (avatarSaving) return;
          setIsAvatarModalOpen(false);
        }}
        title="Update profile photo"
        footer={
          <div className={`gap-8 ${styles.footer}`}>
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

                  const updatedUser = await api.upload<ApiUser>('/auth/avatar/', avatarFile);

                  if (typeof setUser === 'function') {
                    setUser(updatedUser as unknown as Parameters<typeof setUser>[0]);
                  }

                  setIsAvatarModalOpen(false);
                  setAvatarFile(null);
                } catch (e) {
                  logger.error('Failed to upload avatar', e);
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
      </ProfileSheet>
    </>
  );
};
