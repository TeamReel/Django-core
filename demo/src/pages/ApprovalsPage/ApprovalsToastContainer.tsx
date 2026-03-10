/**
 * ApprovalsToastContainer - Toast notifications display
 */
import React from 'react';
import type { ApprovalsToast } from './types';
import s from '../ApprovalsPage.module.css';

interface ApprovalsToastContainerProps {
  toasts: ApprovalsToast[];
}

export function ApprovalsToastContainer({ toasts }: ApprovalsToastContainerProps) {
  return (
    <div className={s.toastContainer} style={{ pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: 'white',
            backgroundColor: t.type === 'success' ? 'var(--color-green-600)' : 'var(--color-red-600)',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'auto',
            maxWidth: 360
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
