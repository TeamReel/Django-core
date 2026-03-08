/**
 * WizardStep – Wrapper for individual wizard step content
 *
 * Only renders its children when the step is active.
 * Provides a clean API for defining steps.
 */
import React, { type ReactNode } from 'react';
import { useWizard } from './WizardContext';

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

  return <>{children}</>;
}
