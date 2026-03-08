/**
 * WizardShell – Generic wizard container
 *
 * Provides the visual shell for any wizard: BottomSheet container,
 * header with back/title/close, optional footer, and step content area.
 */
import React, { type ReactNode } from 'react';
import { BottomSheet } from '@django-core/design-system';
import { useWizard } from './WizardContext';
import styles from './Wizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface WizardShellProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Optional custom footer content */
  footer?: ReactNode;
  /** Show progress bar below header */
  showProgress?: boolean;
  /** Additional body class */
  bodyClassName?: string;
  /** Step content */
  children: ReactNode;
}

// ─── Component ────────────────────────────────────────────

export function WizardShell({
  isOpen,
  footer,
  showProgress = false,
  bodyClassName,
  children,
}: WizardShellProps) {
  const {
    currentStep,
    isFirstStep,
    progress,
    back,
    close,
  } = useWizard();

  // Determine if back button should show
  const showBack = currentStep.showBack !== false && !isFirstStep;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={close}
      bodyClassName={`${styles.sheetBody} ${bodyClassName || ''}`}
      footer={footer || undefined}
      showDragHandle={false}
    >
      <div className={`flex-col ${styles.root}`}>
        {/* ── Header: back + title + close ─────────────────────── */}
        <div className={`flex-row gap-12 border-bottom ${styles.header}`}>
          {showBack ? (
            <button
              onClick={back}
              aria-label="Terug"
              className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}
            >
              ←
            </button>
          ) : (
            <div className={styles.headerSpacer} />
          )}
          <span className="flex-1 text-center fw-600 fs-16 text-primary">
            {currentStep.title}
          </span>
          <button
            onClick={close}
            aria-label="Sluiten"
            className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}
          >
            ×
          </button>
        </div>

        {/* ── Progress bar (optional) ──────────────────────────── */}
        {showProgress && (
          <div className={styles.progressContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ── Step content (scrollable) ────────────────────────── */}
        <div className={styles.scrollArea}>
          {children}
        </div>
      </div>
    </BottomSheet>
  );
}
