/**
 * WizardFooter – Common footer patterns for wizard steps
 *
 * Provides pre-built footer variants:
 * - Primary: Single "Next" button
 * - Dual: Back + Next buttons
 * - Submit: Submit with loading state
 */
import React from 'react';
import { ChevronRight, Zap, Loader2, type LucideIcon } from 'lucide-react';
import { useWizard } from './WizardContext';
import styles from './Wizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface WizardFooterPrimaryProps {
  /** Button label (default: "Verder") */
  label?: string;
  /** Show chevron icon */
  showIcon?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Custom onClick (defaults to wizard.complete) */
  onClick?: () => void;
}

export interface WizardFooterDualProps {
  /** Back button label (default: "Terug") */
  backLabel?: string;
  /** Next button label (default: "Verder") */
  nextLabel?: string;
  /** Disable the next button */
  disabled?: boolean;
  /** Custom back onClick (defaults to wizard.back) */
  onBack?: () => void;
  /** Custom next onClick (defaults to wizard.complete) */
  onNext?: () => void;
}

export interface WizardFooterSubmitProps {
  /** Button label (default: "Genereer") */
  label?: string;
  /** Loading label (default: "Bezig...") */
  loadingLabel?: string;
  /** Icon to show (default: Zap) */
  icon?: LucideIcon;
  /** Disable the button */
  disabled?: boolean;
  /** Custom onClick */
  onClick?: () => void;
}

// ─── Components ───────────────────────────────────────────

export function WizardFooterPrimary({
  label = 'Verder',
  showIcon = true,
  disabled = false,
  onClick,
}: WizardFooterPrimaryProps) {
  const { complete } = useWizard();

  return (
    <button
      onClick={onClick || complete}
      disabled={disabled}
      className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
    >
      {label}
      {showIcon && <ChevronRight size={18} />}
    </button>
  );
}

export function WizardFooterDual({
  backLabel = 'Terug',
  nextLabel = 'Verder',
  disabled = false,
  onBack,
  onNext,
}: WizardFooterDualProps) {
  const { back, complete } = useWizard();

  return (
    <div className="flex-row gap-12">
      <button
        onClick={onBack || back}
        className={`flex-1 rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 fs-15 ${styles.secondaryBtn}`}
      >
        {backLabel}
      </button>
      <button
        onClick={onNext || complete}
        disabled={disabled}
        className={`flex-1 rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
      >
        {nextLabel}
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function WizardFooterSubmit({
  label = 'Genereer',
  loadingLabel = 'Bezig...',
  icon: Icon = Zap,
  disabled = false,
  onClick,
}: WizardFooterSubmitProps) {
  const { isSubmitting, complete } = useWizard();

  return (
    <button
      onClick={onClick || complete}
      disabled={disabled || isSubmitting}
      className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
    >
      {isSubmitting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Icon size={18} />
          {label}
        </>
      )}
    </button>
  );
}
