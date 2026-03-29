import styles from './SettingsPage.module.css';

export interface SettingsProfileSectionProps {
  profile: { fullName: string; email: string; bio: string };
  profileSaveStatus: 'idle' | 'saving' | 'success' | 'error';
  handleProfileChange: (key: string, value: string) => void;
  handleSaveProfile: () => void;
}

export function SettingsProfileSection({
  profile,
  profileSaveStatus,
  handleProfileChange,
  handleSaveProfile,
}: SettingsProfileSectionProps) {
  return (
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
  );
}
