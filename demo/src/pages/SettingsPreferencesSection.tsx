import styles from './SettingsPage.module.css';

export interface SettingsPreferencesSectionProps {
  preferences: { theme: string; language: string; timezone: string };
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  handlePreferenceChange: (key: string, value: string) => void;
  handleSavePreferences: () => void;
}

export function SettingsPreferencesSection({
  preferences,
  saveStatus,
  handlePreferenceChange,
  handleSavePreferences,
}: SettingsPreferencesSectionProps) {
  return (
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
  );
}
