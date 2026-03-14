/**
 * useProfileModals — Profile, password, and avatar modal state.
 *
 * Groups all modal-related state for the Preferences page.
 * Extracted from usePreferencesData to reduce its useState count.
 * Consolidated to useReducer during S3 refactor.
 */
import { useReducer, useMemo } from 'react';
import { formReducer, makeSetter } from '@/utils/formReducer';

export interface ProfileModalsReturn {
  /* modal visibility */
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (v: boolean) => void;
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (v: boolean) => void;
  isAvatarModalOpen: boolean;
  setIsAvatarModalOpen: (v: boolean) => void;

  /* profile form */
  profileFirstName: string;
  setProfileFirstName: (v: string) => void;
  profileLastName: string;
  setProfileLastName: (v: string) => void;
  profileEmail: string;
  setProfileEmail: (v: string) => void;
  profileTwoFactorEnabled: boolean;
  setProfileTwoFactorEnabled: (v: boolean) => void;
  profileCurrentPassword: string;
  setProfileCurrentPassword: (v: string) => void;
  profileSaving: boolean;
  setProfileSaving: (v: boolean) => void;
  profileError: string | null;
  setProfileError: (v: string | null) => void;

  /* password form */
  passwordCurrent: string;
  setPasswordCurrent: (v: string) => void;
  passwordNext: string;
  setPasswordNext: (v: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (v: string) => void;
  passwordSaving: boolean;
  setPasswordSaving: (v: boolean) => void;
  passwordError: string | null;
  setPasswordError: (v: string | null) => void;
  passwordSuccess: boolean;
  setPasswordSuccess: (v: boolean) => void;

  /* avatar */
  avatarFile: File | null;
  setAvatarFile: (v: File | null) => void;
  avatarSaving: boolean;
  setAvatarSaving: (v: boolean) => void;
  avatarError: string | null;
  setAvatarError: (v: string | null) => void;
}

interface ProfileModalsInternal {
  isProfileModalOpen: boolean;
  isPasswordModalOpen: boolean;
  isAvatarModalOpen: boolean;
  profileFirstName: string;
  profileLastName: string;
  profileEmail: string;
  profileTwoFactorEnabled: boolean;
  profileCurrentPassword: string;
  profileSaving: boolean;
  profileError: string | null;
  passwordCurrent: string;
  passwordNext: string;
  passwordConfirm: string;
  passwordSaving: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
  avatarFile: File | null;
  avatarSaving: boolean;
  avatarError: string | null;
}

const initial: ProfileModalsInternal = {
  isProfileModalOpen: false, isPasswordModalOpen: false, isAvatarModalOpen: false,
  profileFirstName: '', profileLastName: '', profileEmail: '',
  profileTwoFactorEnabled: false, profileCurrentPassword: '',
  profileSaving: false, profileError: null,
  passwordCurrent: '', passwordNext: '', passwordConfirm: '',
  passwordSaving: false, passwordError: null, passwordSuccess: false,
  avatarFile: null, avatarSaving: false, avatarError: null,
};

export function useProfileModals(): ProfileModalsReturn {
  const [s, dispatch] = useReducer(formReducer<ProfileModalsInternal>, initial);

  const setters = useMemo(() => ({
    setIsProfileModalOpen: makeSetter<ProfileModalsInternal, 'isProfileModalOpen'>(dispatch, 'isProfileModalOpen'),
    setIsPasswordModalOpen: makeSetter<ProfileModalsInternal, 'isPasswordModalOpen'>(dispatch, 'isPasswordModalOpen'),
    setIsAvatarModalOpen: makeSetter<ProfileModalsInternal, 'isAvatarModalOpen'>(dispatch, 'isAvatarModalOpen'),
    setProfileFirstName: makeSetter<ProfileModalsInternal, 'profileFirstName'>(dispatch, 'profileFirstName'),
    setProfileLastName: makeSetter<ProfileModalsInternal, 'profileLastName'>(dispatch, 'profileLastName'),
    setProfileEmail: makeSetter<ProfileModalsInternal, 'profileEmail'>(dispatch, 'profileEmail'),
    setProfileTwoFactorEnabled: makeSetter<ProfileModalsInternal, 'profileTwoFactorEnabled'>(dispatch, 'profileTwoFactorEnabled'),
    setProfileCurrentPassword: makeSetter<ProfileModalsInternal, 'profileCurrentPassword'>(dispatch, 'profileCurrentPassword'),
    setProfileSaving: makeSetter<ProfileModalsInternal, 'profileSaving'>(dispatch, 'profileSaving'),
    setProfileError: makeSetter<ProfileModalsInternal, 'profileError'>(dispatch, 'profileError'),
    setPasswordCurrent: makeSetter<ProfileModalsInternal, 'passwordCurrent'>(dispatch, 'passwordCurrent'),
    setPasswordNext: makeSetter<ProfileModalsInternal, 'passwordNext'>(dispatch, 'passwordNext'),
    setPasswordConfirm: makeSetter<ProfileModalsInternal, 'passwordConfirm'>(dispatch, 'passwordConfirm'),
    setPasswordSaving: makeSetter<ProfileModalsInternal, 'passwordSaving'>(dispatch, 'passwordSaving'),
    setPasswordError: makeSetter<ProfileModalsInternal, 'passwordError'>(dispatch, 'passwordError'),
    setPasswordSuccess: makeSetter<ProfileModalsInternal, 'passwordSuccess'>(dispatch, 'passwordSuccess'),
    setAvatarFile: makeSetter<ProfileModalsInternal, 'avatarFile'>(dispatch, 'avatarFile'),
    setAvatarSaving: makeSetter<ProfileModalsInternal, 'avatarSaving'>(dispatch, 'avatarSaving'),
    setAvatarError: makeSetter<ProfileModalsInternal, 'avatarError'>(dispatch, 'avatarError'),
  }), [dispatch]);

  return {
    isProfileModalOpen: s.isProfileModalOpen, setIsProfileModalOpen: setters.setIsProfileModalOpen,
    isPasswordModalOpen: s.isPasswordModalOpen, setIsPasswordModalOpen: setters.setIsPasswordModalOpen,
    isAvatarModalOpen: s.isAvatarModalOpen, setIsAvatarModalOpen: setters.setIsAvatarModalOpen,
    profileFirstName: s.profileFirstName, setProfileFirstName: setters.setProfileFirstName,
    profileLastName: s.profileLastName, setProfileLastName: setters.setProfileLastName,
    profileEmail: s.profileEmail, setProfileEmail: setters.setProfileEmail,
    profileTwoFactorEnabled: s.profileTwoFactorEnabled, setProfileTwoFactorEnabled: setters.setProfileTwoFactorEnabled,
    profileCurrentPassword: s.profileCurrentPassword, setProfileCurrentPassword: setters.setProfileCurrentPassword,
    profileSaving: s.profileSaving, setProfileSaving: setters.setProfileSaving,
    profileError: s.profileError, setProfileError: setters.setProfileError,
    passwordCurrent: s.passwordCurrent, setPasswordCurrent: setters.setPasswordCurrent,
    passwordNext: s.passwordNext, setPasswordNext: setters.setPasswordNext,
    passwordConfirm: s.passwordConfirm, setPasswordConfirm: setters.setPasswordConfirm,
    passwordSaving: s.passwordSaving, setPasswordSaving: setters.setPasswordSaving,
    passwordError: s.passwordError, setPasswordError: setters.setPasswordError,
    passwordSuccess: s.passwordSuccess, setPasswordSuccess: setters.setPasswordSuccess,
    avatarFile: s.avatarFile, setAvatarFile: setters.setAvatarFile,
    avatarSaving: s.avatarSaving, setAvatarSaving: setters.setAvatarSaving,
    avatarError: s.avatarError, setAvatarError: setters.setAvatarError,
  };
}
