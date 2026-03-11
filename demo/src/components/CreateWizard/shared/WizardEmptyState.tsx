/**
 * WizardEmptyState — Reusable empty/error state for wizard steps (P2).
 *
 * Shows an icon, title, description, and an optional action button that
 * can either trigger a cross-flow navigation (via selectFlow) or a
 * custom onClick handler.
 *
 * Used when a prerequisite is missing (no matches, no teams, no seasons)
 * or when an API error occurs.
 */
import React, { type ReactNode } from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import styles from '../CreateWizard.module.css';

export interface WizardEmptyAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Visual variant (default: primary) */
  variant?: 'primary' | 'secondary';
}

export interface WizardEmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon;
  /** Main title */
  title: string;
  /** Descriptive text below the title */
  description?: string;
  /** Optional action button(s) */
  actions?: WizardEmptyAction[];
  /** Extra content (e.g. a retry button or link) */
  children?: ReactNode;
}

export function WizardEmptyState({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: WizardEmptyStateProps) {
  return (
    <div className={styles.wizardEmptyState}>
      <div className={styles.wizardEmptyIcon}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className={styles.wizardEmptyTitle}>{title}</h3>
      {description && (
        <p className={styles.wizardEmptyDescription}>{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className={styles.wizardEmptyActions}>
          {actions.map((action) => (
            <button
              key={action.label}
              className={styles.wizardEmptyActionBtn}
              data-variant={action.variant || 'primary'}
              onClick={action.onClick}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * WizardErrorState — Specialised empty state for API errors.
 * Shows the error message with a retry button.
 */
export interface WizardErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Retry handler */
  onRetry?: () => void;
}

export function WizardErrorState({
  message = 'Er ging iets mis. Probeer opnieuw.',
  onRetry,
}: WizardErrorStateProps) {
  return (
    <WizardEmptyState
      icon={AlertCircle}
      title="Fout"
      description={message}
      actions={onRetry ? [{ label: 'Opnieuw proberen', onClick: onRetry }] : undefined}
    />
  );
}
