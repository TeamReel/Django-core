import { Settings } from '@django-core/page-templates';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { useSettingsPage } from './useSettingsPage';
import { SettingsProfileSection } from './SettingsProfileSection';
import { SettingsSecuritySection } from './SettingsSecuritySection';
import { SettingsNotificationsSection } from './SettingsNotificationsSection';
import { SettingsPreferencesSection } from './SettingsPreferencesSection';
import { SettingsTrashSection } from './SettingsTrashSection';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const {
    activeSection, setActiveSection,
    preferences, profile, notifications,
    saveStatus, profileSaveStatus, notificationsSaveStatus,
    sections,
    handlePreferenceChange, handleSavePreferences,
    handleProfileChange, handleSaveProfile,
    handleChangePassword, handleEnable2FA,
    handleNotificationChange, handleSaveNotifications,
    isSystemAdmin,
    trash,
    trashContentTypeFilter, setTrashContentTypeFilter,
    trashContentTypes,
    handleTrashRestore, handleTrashPermanentDelete, handleEmptyTrash,
  } = useSettingsPage();
  useSetBackNavigation({ label: 'Profiel', path: '/profile' });

  return (
    <div className={styles.settingsContainer}>
      <Settings
        className={styles.settingsGrid}
        sections={sections}
        activeSection={activeSection}
        onActiveSectionChange={setActiveSection}
        aria-label="User Settings"
      >
        <Settings.Section sectionId="profile">
          <SettingsProfileSection
            profile={profile}
            profileSaveStatus={profileSaveStatus}
            handleProfileChange={handleProfileChange}
            handleSaveProfile={handleSaveProfile}
          />
        </Settings.Section>

        <Settings.Section sectionId="security">
          <SettingsSecuritySection
            handleChangePassword={handleChangePassword}
            handleEnable2FA={handleEnable2FA}
          />
        </Settings.Section>

        <Settings.Section sectionId="notifications">
          <SettingsNotificationsSection
            notifications={notifications}
            notificationsSaveStatus={notificationsSaveStatus}
            handleNotificationChange={handleNotificationChange}
            handleSaveNotifications={handleSaveNotifications}
          />
        </Settings.Section>

        <Settings.Section sectionId="preferences">
          <SettingsPreferencesSection
            preferences={preferences}
            saveStatus={saveStatus}
            handlePreferenceChange={handlePreferenceChange}
            handleSavePreferences={handleSavePreferences}
          />
        </Settings.Section>

        <Settings.Section sectionId="trash">
          <SettingsTrashSection
            isSystemAdmin={isSystemAdmin}
            trash={trash}
            trashContentTypeFilter={trashContentTypeFilter}
            setTrashContentTypeFilter={setTrashContentTypeFilter}
            trashContentTypes={trashContentTypes}
            handleTrashRestore={handleTrashRestore}
            handleTrashPermanentDelete={handleTrashPermanentDelete}
            handleEmptyTrash={handleEmptyTrash}
          />
        </Settings.Section>
      </Settings>
    </div>
  );
}
