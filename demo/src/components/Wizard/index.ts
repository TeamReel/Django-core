/**
 * Wizard – Generic multi-step wizard component
 *
 * A composable wizard system for building consistent multi-step flows
 * across the application (content generation, member creation, etc.).
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'select', title: 'Selecteer' },
 *   { id: 'configure', title: 'Configureren' },
 *   { id: 'confirm', title: 'Bevestigen' },
 * ];
 *
 * <WizardProvider steps={steps} onClose={handleClose}>
 *   <WizardShell isOpen={isOpen} showProgress>
 *     <WizardStep stepId="select">
 *       <SelectStepContent />
 *     </WizardStep>
 *     <WizardStep stepId="configure">
 *       <ConfigureStepContent />
 *     </WizardStep>
 *     <WizardStep stepId="confirm">
 *       <ConfirmStepContent />
 *     </WizardStep>
 *   </WizardShell>
 * </WizardProvider>
 * ```
 */

// Context and Provider
export {
  WizardProvider,
  useWizard,
  type WizardDirection,
  type WizardStepConfig,
  type WizardState,
  type WizardActions,
  type WizardContextValue,
  type WizardProviderProps,
} from './WizardContext';

// Shell Component
export { WizardShell, type WizardShellProps } from './WizardShell';

// Step Wrapper
export { WizardStep, type WizardStepProps } from './WizardStep';

// Transition Wrapper
export { WizardTransition, type WizardTransitionProps } from './WizardTransition';

// Footer Components
export {
  WizardFooterPrimary,
  WizardFooterDual,
  WizardFooterSubmit,
  type WizardFooterPrimaryProps,
  type WizardFooterDualProps,
  type WizardFooterSubmitProps,
} from './WizardFooter';

// CSS Module
export { default as wizardStyles } from './Wizard.module.css';
