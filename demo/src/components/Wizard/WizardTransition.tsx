/**
 * WizardTransition – Animated wrapper for wizard step content (P1)
 *
 * Applies CSS animations based on navigation direction:
 * - forward: slide-in from right
 * - backward: slide-in from left
 * - initial: fade + scale-in (for first render / flow switch)
 *
 * Uses a key on the step ID so the animation replays on each step change.
 * Pure CSS — no framer-motion dependency.
 */
import React, { type ReactNode } from 'react';
import { useWizard, type WizardDirection } from './WizardContext';
import styles from './Wizard.module.css';

export interface WizardTransitionProps {
  /** Current step ID — used as key to re-trigger animation */
  stepId: string;
  children: ReactNode;
}

const directionClass: Record<WizardDirection, string> = {
  forward: styles.slideFromRight,
  backward: styles.slideFromLeft,
  initial: styles.scaleIn,
};

export function WizardTransition({ stepId, children }: WizardTransitionProps) {
  const { direction } = useWizard();

  return (
    <div key={stepId} className={directionClass[direction] || styles.scaleIn}>
      {children}
    </div>
  );
}
