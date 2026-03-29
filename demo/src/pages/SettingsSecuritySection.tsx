import styles from './SettingsPage.module.css';

export interface SettingsSecuritySectionProps {
  handleChangePassword: () => void;
  handleEnable2FA: () => void;
}

export function SettingsSecuritySection({
  handleChangePassword,
  handleEnable2FA,
}: SettingsSecuritySectionProps) {
  return (
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
  );
}
