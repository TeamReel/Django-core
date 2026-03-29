import { Settings } from '@django-core/page-templates';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { useSettingsPage } from './useSettingsPage';
import { SettingsSecuritySection } from './SettingsSecuritySection';
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
    // Trash
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
          {/* Profile Section */}
          <Settings.Section sectionId="profile">
            <div className="max-w-600">
              <h2 className="mb-8 mt-0">Profielinstellingen</h2>
              <p className="text-muted mb-32">
                Beheer je persoonlijke informatie en openbaar profiel
              </p>

              <div className="flex-col gap-20">
                <div>
                  <label className="block mb-8 fw-600">
                    Volledige naam
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                  />
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                  />
                  <small className="text-muted fs-12 mt-4 block">
                    Je e-mailadres wordt gebruikt voor meldingen en accountherstel
                  </small>
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    rows={4}
                    className={`w-full border rounded-4 fs-14 font-inherit ${styles.formTextarea}`}
                  />
                </div>

                <div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaveStatus === 'saving'}
                    className={`border-none rounded-4 fs-14 fw-600 text-white ${styles.saveButton}`}
                    data-status={profileSaveStatus}
                  >
                    {profileSaveStatus === 'saving' ? 'Opslaan...' :
                     profileSaveStatus === 'success' ? '✓ Opgeslagen!' :
                     profileSaveStatus === 'error' ? '✗ Mislukt' :
                     'Wijzigingen opslaan'}
                  </button>
                </div>
              </div>
            </div>
          </Settings.Section>

          {/* Security Section */}
          <Settings.Section sectionId="security">
            <SettingsSecuritySection
              handleChangePassword={handleChangePassword}
              handleEnable2FA={handleEnable2FA}
            />
          </Settings.Section>

          {/* Notifications Section */}
          <Settings.Section sectionId="notifications">
            <div className="max-w-600">
              <h2 className="mb-8 mt-0">Meldingsvoorkeuren</h2>
              <p className="text-muted mb-32">
                Kies welke meldingen je wilt ontvangen
              </p>

              <div className="flex-col gap-16">
                {[
                  { key: 'emailNotifications', label: 'E-mailmeldingen', description: 'Ontvang belangrijke updates per e-mail' },
                  { key: 'projectUpdates', label: 'Projectupdates', description: 'Word op de hoogte gebracht van projectwijzigingen' },
                  { key: 'securityAlerts', label: 'Beveiligingsmeldingen', description: 'Kritieke beveiligingsmeldingen' },
                  { key: 'marketingEmails', label: 'Marketing e-mails', description: 'Productupdates en tips' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-16 border rounded-8 flex-row items-start bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                      className="mt-4 mr-12"
                    />
                    <div className="flex-1">
                      <div className="fw-600 mb-4">{item.label}</div>
                      <div className="fs-14 text-muted">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-20">
                <button
                  onClick={handleSaveNotifications}
                  disabled={notificationsSaveStatus === 'saving'}
                  className={`border-none rounded-4 fs-14 fw-600 text-white ${styles.saveButton}`}
                  data-status={notificationsSaveStatus}
                >
                  {notificationsSaveStatus === 'saving' ? 'Opslaan...' :
                   notificationsSaveStatus === 'success' ? '✓ Opgeslagen!' :
                   notificationsSaveStatus === 'error' ? '✗ Mislukt' :
                   'Meldingen opslaan'}
                </button>
              </div>
            </div>
          </Settings.Section>

          {/* Preferences Section */}
          <Settings.Section sectionId="preferences">
            <div className="max-w-600">
              <h2 className="mb-8 mt-0">Applicatievoorkeuren</h2>
              <p className="text-muted mb-32">
                Pas je applicatie-ervaring aan
              </p>

              <div className="flex-col gap-20">
                <div>
                  <label className="block mb-8 fw-600">
                    Thema
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                  >
                    <option value="light">Licht</option>
                    <option value="dark">Donker</option>
                    <option value="auto">Automatisch (Systeem)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Taal
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="it">Italian</option>
                    <option value="de">German</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Tijdzone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                  >
                    <option value="utc">UTC</option>
                    <option value="est">Eastern Time (ET)</option>
                    <option value="pst">Pacific Time (PT)</option>
                    <option value="cet">Central European Time (CET)</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleSavePreferences}
                    disabled={saveStatus === 'saving'}
                    className={`border-none rounded-4 fs-14 fw-600 text-white ${styles.saveButton}`}
                    data-status={saveStatus}
                  >
                    {saveStatus === 'saving' ? 'Opslaan...' :
                     saveStatus === 'success' ? '✓ Opgeslagen!' :
                     saveStatus === 'error' ? '✗ Mislukt' :
                     'Voorkeuren opslaan'}
                  </button>
                </div>
              </div>
            </div>
          </Settings.Section>

          {/* Trash Section */}
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
