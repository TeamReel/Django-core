import { Modal } from '@/components/ui/Modal';
import styles from './MatchDetailModal.module.css';

interface MatchActivity {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string | null;
  location?: string;
  description?: string;
  activity_type?: string;
  [key: string]: unknown;
}

interface MatchDetailModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchActivity | null;
}

export default function MatchDetailModal({ opened, onClose, match }: MatchDetailModalProps) {
  if (!match) return null;

  return (
    <Modal isOpen={opened} onClose={onClose} title="Match" size="sm">
      <div className={styles.detailGrid}>
        <div className={styles.label}>Title</div>
        <div>{match.title}</div>

        <div className={styles.label}>Start</div>
        <div>{match.start_time || '-'}</div>

        <div className={styles.label}>End</div>
        <div>{match.end_time || '-'}</div>

        <div className={styles.label}>Location</div>
        <div>{match.location || '-'}</div>

        <div className={styles.label}>Description</div>
        <div className={styles.descriptionValue}>{match.description || '-'}</div>
      </div>
    </Modal>
  );
}
