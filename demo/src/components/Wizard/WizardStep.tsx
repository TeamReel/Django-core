/**
 * WizardStep – Wrapper for individual wizard step content
 *
 * Only renders its children when the step is active.
 * Wraps content in WizardTransition for slide/fade animations (P1).
 */
import React, { type ReactNode } from 'react';
import { useWizard } from './WizardContext';
import { WizardTransition } from './WizardTransition';

export interface WizardStepProps {
  /** Step ID that must match the config */
  stepId: string;
  /** Step content */
  children: ReactNode;
}

export function WizardStep({ stepId, children }: WizardStepProps) {
  const { currentStepId } = useWizard();

  if (currentStepId !== stepId) {
    return null;
  }

  return (
    <WizardTransition stepId={stepId}>
      {children}
    </WizardTransition>
  );
}
