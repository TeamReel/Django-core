import React from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './PeriodDetailModal.module.css';

export interface PeriodLike {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  organisation?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  parent_period?: { id: string; name: string } | null;
  children_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  matches_total_count?: number;
}

interface PeriodDetailModalProps {
  opened: boolean;
  onClose: () => void;
  period: PeriodLike | null;
}

export default function PeriodDetailModal({ opened, onClose, period }: PeriodDetailModalProps) {
  if (!period) return null;

  const data = period.data ?? period.metadata ?? {};
  const type = String(data?.type ?? '');

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Period Details"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="py-8 px-16 rounded-4 border bg-surface-2 text-primary cursor-pointer"
        >
          Close
        </button>
      }
    >
      <div className="flex-col gap-10">
        <div>
          <div className="fs-12 opacity-80">Name</div>
          <div className="fw-600">{period.name}</div>
        </div>

        <div className={`grid gap-10 ${styles.grid2}`}>
          <div>
            <div className="fs-12 opacity-80">Start</div>
            <div>{period.start_date || '—'}</div>
          </div>
          <div>
            <div className="fs-12 opacity-80">End</div>
            <div>{period.end_date || '—'}</div>
          </div>
        </div>

        <div className={`grid gap-10 ${styles.grid3}`}>
          <div>
            <div className="fs-12 opacity-80">Children</div>
            <div>{(period.children_count ?? 0).toString()}</div>
          </div>
          <div>
            <div className="fs-12 opacity-80">Matches (direct)</div>
            <div>{(period.matches_count ?? 0).toString()}</div>
          </div>
          <div>
            <div className="fs-12 opacity-80">Matches (total)</div>
            <div>{(period.matches_total_count ?? period.matches_count ?? 0).toString()}</div>
          </div>
        </div>

        <div>
          <div className="fs-12 opacity-80">Type</div>
          <div>{type || '—'}</div>
        </div>

        {period.description ? (
          <div>
            <div className="fs-12 opacity-80">Description</div>
            <div className={styles.descriptionText}>{period.description}</div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
