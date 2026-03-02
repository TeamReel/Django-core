/**
 * PreferencesPage — Shared type definitions
 */
import type { AuditEvent } from '../../types';

/* ------------------------------------------------------------------ */
/*  Data types                                                         */
/* ------------------------------------------------------------------ */

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  marketing_email: boolean;
}

export interface I18nEffectivePreferences {
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  resolved_from: 'user' | 'org' | 'system';
}

export interface NotificationPreference {
  id: number;
  event_type: string;
  channel: 'email' | 'push' | 'in_app';
  enabled: boolean;
}

export interface EventTypeGroup {
  event_type: string;
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
}

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface PreferencesDataReturn {
  /* theme */
  resolvedMode: string;

  /* auth */
  user: any;
  setUser: (u: any) => void;

  /* preferences */
  preferences: UserPreferences | null;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
  initialPreferences: UserPreferences | null;
  effectivePrefs: I18nEffectivePreferences | null;
  loading: boolean;
  saving: boolean;
  success: boolean;

  /* active context */
  activeContext: any | null;
  activeContextLoading: boolean;
  activeContextError: string | null;
  savingContext: boolean;

  /* cascading selection */
  selectedOrgId: string;
  setSelectedOrgId: (v: string) => void;
  selectedClubId: string;
  setSelectedClubId: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  selectedSeasonId: string;
  setSelectedSeasonId: (v: string) => void;
  selectedCompetitionId: string;
  setSelectedCompetitionId: (v: string) => void;
  selectedMatchId: string;
  setSelectedMatchId: (v: string) => void;
  hasEditedContext: boolean;
  setHasEditedContext: (v: boolean) => void;

  /* entity lists */
  organisations: any[];
  clubs: any[];
  teams: any[];
  seasons: any[];
  competitions: any[];
  matches: any[];

  /* entity loading */
  loadingOrgs: boolean;
  loadingClubs: boolean;
  loadingTeams: boolean;
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  loadingMatches: boolean;

  /* notifications */
  channelPrefs: EventTypeGroup[];
  channelPrefsLoading: boolean;
  channelPrefsSaving: boolean;
  demoMode: boolean;

  /* tabs */
  activeTab: 'profile' | 'personalisation' | 'notifications' | 'audit';
  setActiveTab: (t: 'profile' | 'personalisation' | 'notifications' | 'audit') => void;

  /* audit */
  myAuditEvents: AuditEvent[];
  myAuditLoading: boolean;
  myAuditError: string | null;
  organisationLabelByKey: Map<string, string>;
  projectLabelByKey: Map<string, string>;

  /* profile modal state */
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (v: boolean) => void;
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (v: boolean) => void;
  isAvatarModalOpen: boolean;
  setIsAvatarModalOpen: (v: boolean) => void;

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

  avatarFile: File | null;
  setAvatarFile: (v: File | null) => void;
  avatarSaving: boolean;
  setAvatarSaving: (v: boolean) => void;
  avatarError: string | null;
  setAvatarError: (v: string | null) => void;

  /* handlers */
  handleSavePreferences: () => Promise<void>;
  handleCancel: () => void;
  handleToggleChannel: (eventType: string, channel: 'email' | 'push' | 'in_app') => Promise<void>;
  formatEventType: (eventType: string) => string;
  applyActiveContextSelection: (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }) => Promise<void>;
}
