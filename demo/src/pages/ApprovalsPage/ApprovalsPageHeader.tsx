/**
 * ApprovalsPageHeader - Header section with title, subtitle and action buttons
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { ApprovalsPageHeaderProps } from './types';
import s from '../ApprovalsPage.module.css';

export function ApprovalsPageHeader({
  title,
  subtitle,
  needsReviewCount,
  showBeginReview,
  onBeginReview,
  onRefresh,
}: ApprovalsPageHeaderProps) {
  return (
    <div className={s.headerRow}>
      <div className={s.titleBlock}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className={s.actions}>
        {showBeginReview && needsReviewCount > 0 && (
          <button onClick={onBeginReview} className={s.btnBeginReview}>
            Beoordelen ({needsReviewCount})
          </button>
        )}
        <button onClick={onRefresh} className={s.btnRefresh} title="Vernieuwen">
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
}
