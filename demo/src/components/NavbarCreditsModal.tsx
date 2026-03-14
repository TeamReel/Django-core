import { useEscapeKey } from '../hooks/useEscapeKey';
import s from './TopNavbar.module.css';
import styles from './NavbarModals.module.css';

export interface CreditsModalProps {
  myCreditsBalance: string | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarCreditsModal({ myCreditsBalance, onClose, onNavigate }: CreditsModalProps) {
  useEscapeKey(onClose);
  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
        <div onClick={e => e.stopPropagation()} className={`w-full ${s.modalPanel} ${styles.creditsPanel}`} role="dialog">
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            <div className={s.modalTitle15}>Credits</div>
          </div>
          <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
        </div>
        <div className="p-24 text-center">
          <div className={s.creditsBalance}>{myCreditsBalance}</div>
          <div className={s.creditsLabel}>beschikbare credits</div>
          <button onClick={() => { onClose(); onNavigate('/credits'); }} className={s.creditsLink}>
            Bekijk Credits Overzicht {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
