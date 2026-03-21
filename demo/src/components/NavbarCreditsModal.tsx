import { NavbarModalShell } from './NavbarModalShell';
import s from './TopNavbarModals.module.css';
import styles from './NavbarModals.module.css';

export interface CreditsModalProps {
  myCreditsBalance: string | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarCreditsModal({ myCreditsBalance, onClose, onNavigate }: CreditsModalProps) {
  const header = (
    <div className={s.modalHeaderRow}>
      <div className="flex-1">
        <div className={s.modalTitle}>Credits</div>
      </div>
      <button onClick={onClose} className={styles.closeBtnMobile} aria-label="Sluiten">{'\u2715'}</button>
    </div>
  );

  const footer = (
    <div className={styles.modalFooterLink}>
      <button onClick={() => { onClose(); onNavigate('/credits'); }} className={s.btnGhost}>
        Bekijk Credits Overzicht {'\u2192'}
      </button>
    </div>
  );

  return (
    <NavbarModalShell
      onClose={onClose}
      title="Credits"
      panelClassName={styles.creditsPanel}
      desktopHeader={header}
      footer={footer}
    >
      <div className="p-24 text-center">
        <div className={s.creditsBalance}>{myCreditsBalance}</div>
        <div className={s.creditsLabel}>beschikbare credits</div>
      </div>
    </NavbarModalShell>
  );
}
