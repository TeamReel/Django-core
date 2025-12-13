/**
 * Wizard Template Component Contracts
 */

import * as React from 'react';
import { A11yProps, StateRenderProps } from './common';

/**
 * Multi-step wizard configuration
 */
export interface WizardStepConfig {
  /** Unique step identifier */
  id: string;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Step is optional (can skip) */
  optional?: boolean;

  /** Validation function (async supported) */
  validate?: (data: unknown) => boolean | Promise<boolean>;

  /** Icon component */
  icon?: React.ComponentType<{ size?: number }>;
}

/**
 * Main Wizard template component
 *
 * @example
 * ```tsx
 * const steps: WizardStepConfig[] = [
 *   { id: 'basic', label: 'Basic Info' },
 *   { id: 'details', label: 'Details', optional: true },
 *   { id: 'review', label: 'Review' },
 * ];
 *
 * <Wizard steps={steps}>
 *   <Wizard.Step stepId="basic">
 *     <BasicInfoForm />
 *   </Wizard.Step>
 *   <Wizard.Step stepId="details">
 *     <DetailsForm />
 *   </Wizard.Step>
 *   <Wizard.Step stepId="review">
 *     <ReviewSummary />
 *   </Wizard.Step>
 * </Wizard>
 * ```
 */
export interface WizardProps extends A11yProps, StateRenderProps {
  /** Step configuration array */
  steps: WizardStepConfig[];

  /** Child components (Wizard.Step elements) */
  children: React.ReactNode;

  /** Default current step index (uncontrolled) */
  defaultStepIndex?: number;

  /** Controlled current step index */
  stepIndex?: number;

  /** Callback when step changes */
  onStepIndexChange?: (index: number) => void;

  /** Callback when wizard completes */
  onComplete?: (data: unknown) => void | Promise<void>;

  /** Callback when wizard cancelled */
  onCancel?: () => void;

  /** Show step indicator (progress bar/breadcrumb) */
  showStepIndicator?: boolean;

  /** Step indicator variant */
  stepIndicatorVariant?: 'dots' | 'numbers' | 'labels';

  /** Allow free navigation (skip validation) */
  allowFreeNavigation?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Individual wizard step container
 */
export interface WizardStepProps extends A11yProps {
  /** Step ID (must match WizardStepConfig.id) */
  stepId: string;

  /** Step content */
  children: React.ReactNode;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Wizard navigation controls (auto-rendered by Wizard)
 */
export interface WizardNavigationProps {
  /** Current step index */
  currentStep: number;

  /** Total steps */
  totalSteps: number;

  /** Can navigate to previous step */
  canGoPrevious: boolean;

  /** Can navigate to next step */
  canGoNext: boolean;

  /** Is last step */
  isLastStep: boolean;

  /** Callback for previous button */
  onPrevious: () => void;

  /** Callback for next button */
  onNext: () => void;

  /** Callback for cancel button */
  onCancel: () => void;

  /** Callback for finish button */
  onFinish: () => void;

  /** Previous button label */
  previousLabel?: string;

  /** Next button label */
  nextLabel?: string;

  /** Cancel button label */
  cancelLabel?: string;

  /** Finish button label */
  finishLabel?: string;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Wizard component with sub-components
 */
export interface WizardComponent extends React.FC<WizardProps> {
  Step: React.FC<WizardStepProps>;
  Navigation: React.FC<WizardNavigationProps>;
}

export declare const Wizard: WizardComponent;
export declare const WizardStep: React.FC<WizardStepProps>;
export declare const WizardNavigation: React.FC<WizardNavigationProps>;
