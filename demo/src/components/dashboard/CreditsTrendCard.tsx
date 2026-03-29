import React, { useState, lazy, Suspense } from 'react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import { Spinner } from '@django-core/design-system';
import { useCreditBalance } from '../../hooks/useCreditBalance';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

const CreditsSheetContent = lazy(() =>
  import('../../pages/config/CreditsSheetContent').then(m => ({ default: m.CreditsSheetContent })),
);

export const CreditsTrendCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const org = context.organisation;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { balance, lowBalanceAlert } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  return (
    <>
      <div
        className={`${styles.summaryCard} ${lowBalanceAlert ? styles.alertCard : ''}`}
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
      >
        <div className={styles.cardIcon} style={{
          background: lowBalanceAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: lowBalanceAlert ? 'var(--color-red-400)' : 'var(--color-green-400)',
        }}>
          <CreditCard size={18} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>
            {balance ?? '—'}
            {lowBalanceAlert && <AlertCircle size={14} className={styles.warnIcon} />}
          </div>
          <div className={styles.cardLabel}>Credits</div>
        </div>
        <ChevronRight size={16} className={styles.cardArrow} />
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Credits"
        icon={<CreditCard size={18} />}
      >
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="md" /></div>}>
          <CreditsSheetContent />
        </Suspense>
      </NavigationSheet>
    </>
  );
};
