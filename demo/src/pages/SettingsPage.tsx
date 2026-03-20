import { Settings } from '@django-core/page-templates';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { useSettingsPage } from './useSettingsPage';
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
  useSetBackNavigation({ label: 'Profile', path: '/profile' });

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
            <div className="max-w-600">
              <h2 className="mb-8 mt-0">Beveiligingsinstellingen</h2>
              <p className="text-muted mb-32">
                Beheer je wachtwoord, tweefactorauthenticatie en beveiligingsvoorkeuren
              </p>

              <div className="flex-col gap-24">
                <div className="border rounded-8 p-20 bg-surface">
                  <h3 className="mb-8 fs-16 mt-0">Wachtwoord</h3>
                  <p className="text-muted fs-14 mb-16">
                    Laatst gewijzigd 3 maanden geleden
                  </p>
                  <button
                    onClick={handleChangePassword}
                    className={`py-8 px-16 border rounded-4 fs-14 cursor-pointer fw-600 ${styles.changePasswordButton}`}
                  >
                    Wachtwoord wijzigen
                  </button>
                </div>

                <div className="border rounded-8 p-20 bg-surface">
                  <h3 className="mb-8 fs-16 mt-0">Tweefactorauthenticatie</h3>
                  <p className="text-muted fs-14 mb-16">
                    Voeg extra beveiliging toe aan je account
                  </p>
                  <div className="flex-row gap-12">
                    <span
                      className={`inline-block py-4 px-12 fs-12 fw-600 rounded-full text-error ${styles.badgeDanger}`}
                    >
                      Not Enabled
                    </span>
                    <button
                      onClick={handleEnable2FA}
                      className={`py-8 px-16 border-none rounded-4 fs-14 cursor-pointer fw-600 text-white ${styles.enable2faButton}`}
                    >
                      2FA inschakelen
                    </button>
                  </div>
                </div>

                <div className="border rounded-8 p-20 bg-surface">
                  <h3 className="mb-8 fs-16 mt-0">Actieve sessies</h3>
                  <p className="text-muted fs-14 mb-16">
                    Beheer apparaten waarop je nu bent ingelogd
                  </p>
                  <div className="flex-col gap-12">
                    <div className="flex-between">
                      <div>
                        <div className="fw-600 fs-14">Windows PC</div>
                        <div className="fs-12 text-muted">Laatst actief: Zojuist</div>
                      </div>
                      <span
                        className={`py-4 px-12 fs-12 fw-600 rounded-full text-success ${styles.badgeSuccess}`}
                      >
                        Current
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            <div className="max-w-800">
              <h2 className="mb-8 mt-0">Prullenbak</h2>
              <p className="text-muted mb-32">
                Verwijderde items worden 30 dagen bewaard voordat ze definitief worden verwijderd
              </p>

              {/* Stats badges */}
              {trash.stats.length > 0 && (
                <div className="flex-row gap-8 mb-24 flex-wrap">
                  {trash.stats.map((stat) => (
                    <span
                      key={stat.content_type}
                      className="px-12 py-4 rounded-16 fs-12 fw-600 bg-surface border"
                    >
                      {stat.content_type.split('.').pop()}: {stat.count}
                    </span>
                  ))}
                </div>
              )}

              {/* Admin actions */}
              {isSystemAdmin && trash.items.length > 0 && (
                <div className="mb-24">
                  <button
                    onClick={handleEmptyTrash}
                    disabled={trash.mutating}
                    className={`border-none rounded-4 fs-14 fw-600 text-white ${styles.dangerButton}`}
                  >
                    {trash.mutating ? 'Bezig...' : 'Prullenbak legen'}
                  </button>
                </div>
              )}

              {/* Filter dropdown */}
              {trashContentTypes.length > 1 && (
                <div className="mb-24">
                  <label className="block mb-8 fw-600">Filter op type</label>
                  <select
                    value={trashContentTypeFilter ?? ''}
                    onChange={(e) => setTrashContentTypeFilter(e.target.value ? Number(e.target.value) : undefined)}
                    className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="">Alle types</option>
                    {trashContentTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.label} ({ct.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Loading state */}
              {trash.loading && (
                <div className="p-24 text-center text-muted">
                  Laden...
                </div>
              )}

              {/* Empty state */}
              {!trash.loading && trash.items.length === 0 && (
                <div className="p-24 text-center text-muted border rounded-8 bg-surface">
                  <div className="fs-32 mb-8">🗑️</div>
                  <div>Prullenbak is leeg</div>
                </div>
              )}

              {/* Trash items list */}
              {!trash.loading && trash.items.length > 0 && (
                <div className="flex-col gap-12">
                  {trash.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-16 border rounded-8 bg-surface ${styles.trashItem}`}
                    >
                      <div className="flex-row items-start justify-between gap-16">
                        <div className="flex-1 min-w-0">
                          <div className="fw-600 mb-4 truncate" title={item.object_repr}>
                            {item.object_repr}
                          </div>
                          <div className="flex-row gap-16 fs-12 text-muted flex-wrap">
                            <span className="badge badge--subtle">
                              {item.content_type_detail.label}
                            </span>
                            <span>
                              Verwijderd {new Date(item.deleted_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {item.deleted_by_email && (
                              <span>door {item.deleted_by_email}</span>
                            )}
                            {item.is_expired && (
                              <span className="text-error fw-600">Verlopen</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-row gap-8 flex-shrink-0">
                          <button
                            onClick={() => handleTrashRestore(item.id, item.object_repr)}
                            disabled={trash.mutating}
                            className={`border-none rounded-4 fs-12 fw-600 text-white ${styles.restoreButton}`}
                          >
                            Herstellen
                          </button>
                          {isSystemAdmin && (
                            <button
                              onClick={() => handleTrashPermanentDelete(item.id, item.object_repr)}
                              disabled={trash.mutating}
                              className={`border rounded-4 fs-12 fw-600 ${styles.deleteButton}`}
                            >
                              Verwijderen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {trash.count > 20 && (
                <div className="flex-row justify-center gap-8 mt-24">
                  <button
                    onClick={() => trash.setPage(trash.page - 1)}
                    disabled={trash.page === 1 || trash.mutating}
                    className={`border rounded-4 fs-12 fw-600 px-12 py-8 ${styles.paginationButton}`}
                  >
                    Vorige
                  </button>
                  <span className="px-12 py-8 fs-12">
                    Pagina {trash.page} van {Math.ceil(trash.count / 20)}
                  </span>
                  <button
                    onClick={() => trash.setPage(trash.page + 1)}
                    disabled={trash.page >= Math.ceil(trash.count / 20) || trash.mutating}
                    className={`border rounded-4 fs-12 fw-600 px-12 py-8 ${styles.paginationButton}`}
                  >
                    Volgende
                  </button>
                </div>
              )}
            </div>
          </Settings.Section>
        </Settings>
      </div>
  );
}
