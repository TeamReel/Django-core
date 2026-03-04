import React from 'react';
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
  if (!opened || !period) return null;

  const data = (period as any).data ?? (period as any).metadata ?? {};
  const type = String((data as any)?.type ?? '');

  return (
    <div
      className={`flex-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`bg-surface p-24 rounded-8 overflow-auto text-primary border ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`gap-12 ${styles.headerRow}`}>
          <h2 className={`mb-12 text-primary ${styles.title}`}>Period Details</h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none fs-18 cursor-pointer text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

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

          <div className={`mt-12 ${styles.footer}`}>
            <button
              onClick={onClose}
              className={`rounded-6 border bg-surface-2 text-primary cursor-pointer ${styles.closeButton}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
