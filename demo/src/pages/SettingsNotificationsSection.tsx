import styles from './SettingsPage.module.css';

export interface SettingsNotificationsSectionProps {
  notifications: Record<string, boolean>;
  notificationsSaveStatus: 'idle' | 'saving' | 'success' | 'error';
  handleNotificationChange: (key: string, value: boolean) => void;
  handleSaveNotifications: () => void;
}

export function SettingsNotificationsSection({
  notifications,
  notificationsSaveStatus,
  handleNotificationChange,
  handleSaveNotifications,
}: SettingsNotificationsSectionProps) {
  return (
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
  );
}
