import * as React from 'react';
import type { WizardStepProps } from '../../types';
import { useWizardContext } from './Wizard';

/**
 * Individual wizard step container
 *
 * Only renders content when this step is active
 */
export const WizardStep: React.FC<WizardStepProps> = ({
  stepId,
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const { currentStepId } = useWizardContext();

  // Only render if this is the active step
  if (stepId !== currentStepId) {
    return null;
  }

  return (
    <div
      className={className}
      role="tabpanel"
      aria-label={ariaLabel || `Step: ${stepId}`}
      style={{ padding: '1rem' }}
      {...props}
    >
      {children}
    </div>
  );
};

WizardStep.displayName = 'Wizard.Step';
