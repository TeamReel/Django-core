/**
 * WizardShell – Generic wizard container
 *
 * Provides the visual shell for any wizard: BottomSheet container,
 * header with back/title/close, optional footer, and step content area.
 *
 * A11y (P3): aria-label on dialog, progress bar role, screen-reader
 * live region for step announcements, auto-focus on step change.
 */
import React, { useEffect, useRef, type ReactNode } from 'react';
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
  /** Accessible label for the dialog (screen readers) */
  ariaLabel?: string;
  /** Step content */
  children: ReactNode;
}

// ─── Component ────────────────────────────────────────────

export function WizardShell({
  isOpen,
  footer,
  showProgress = false,
  bodyClassName,
  ariaLabel = 'Nieuw aanmaken',
  children,
}: WizardShellProps) {
  const {
    currentStep,
    currentStepIndex,
    steps,
    isFirstStep,
    progress,
    back,
    close,
  } = useWizard();

  // Ref for the scrollable content area — used for auto-focus on step change
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus first interactive element when step changes (P3)
  useEffect(() => {
    if (!scrollRef.current) return;
    // Small delay to let the transition animation start before focusing
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [currentStep.id]);

  // Determine if back button should show
  const showBack = currentStep.showBack !== false && !isFirstStep;

  // Screen reader step announcement (e.g. "Stap 2 van 4: Details")
  const stepAnnouncement = `Stap ${currentStepIndex + 1} van ${steps.length}: ${currentStep.title}`;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={close}
      bodyClassName={`${styles.sheetBody} ${bodyClassName || ''}`}
      footer={footer || undefined}
      showDragHandle={false}
    >
      <div className={`flex-col ${styles.root}`} role="region" aria-label={ariaLabel}>
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
          <span className="flex-1 text-center fw-600 fs-16 text-primary" id="wizard-step-title">
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
          <div
            className={styles.progressContainer}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Voortgang wizard"
          >
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ── Screen reader step announcement (live region) ──── */}
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {stepAnnouncement}
        </div>

        {/* ── Step content (scrollable) ──────────────────────────── */}
        <div className={styles.scrollArea} ref={scrollRef}>
          {children}
        </div>
      </div>
    </BottomSheet>
  );
}
