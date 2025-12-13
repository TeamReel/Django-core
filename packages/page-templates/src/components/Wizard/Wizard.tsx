import * as React from 'react';
import type {
  WizardProps,
  WizardComponent,
  WizardStepConfig,
} from '../../types';
import { useControlledState } from '../../hooks/useControlledState';
import { WizardStep } from './WizardStep';
import { WizardNavigation } from './WizardNavigation';
import { WizardStepIndicator } from './WizardStepIndicator';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';
import { DefaultError } from '../states/DefaultError';
import { DefaultPermissionDenied } from '../states/DefaultPermissionDenied';

interface WizardContextValue {
  steps: WizardStepConfig[];
  currentStepIndex: number;
  currentStepId: string | null;
}

export const WizardContext = React.createContext<WizardContextValue | null>(null);

export const useWizardContext = () => {
  const context = React.useContext(WizardContext);
  if (!context) {
    throw new Error('useWizardContext must be used within Wizard component');
  }
  return context;
};

/**
 * Multi-step wizard template component
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'basic', label: 'Basic Info' },
 *   { id: 'details', label: 'Details' },
 *   { id: 'review', label: 'Review' },
 * ];
 *
 * <Wizard steps={steps} onComplete={handleComplete}>
 *   <Wizard.Step stepId="basic"><BasicForm /></Wizard.Step>
 *   <Wizard.Step stepId="details"><DetailsForm /></Wizard.Step>
 *   <Wizard.Step stepId="review"><ReviewSummary /></Wizard.Step>
 * </Wizard>
 * ```
 */
const WizardFC: React.FC<WizardProps> = ({
  steps,
  children,
  defaultStepIndex = 0,
  stepIndex: controlledStepIndex,
  onStepIndexChange,
  onComplete,
  onCancel,
  showStepIndicator = true,
  stepIndicatorVariant = 'numbers',
  loading = false,
  error = null,
  isEmpty = false,
  permissionDenied = false,
  renderLoading,
  renderEmpty,
  renderError,
  renderPermissionDenied,
  className,
  'aria-label': ariaLabel = 'Multi-step wizard',
  ...props
}) => {
  // All hooks must be called before conditional returns
  // Validate steps configuration
  React.useEffect(() => {
    if (!steps || steps.length < 2) {
      console.warn('Wizard requires at least 2 steps');
    }
    if (steps.length > 10) {
      console.warn('Wizard supports up to 10 steps for optimal UX');
    }

    // Check for unique step IDs
    const ids = steps.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('Wizard step IDs must be unique');
    }
  }, [steps]);

  // Controlled/uncontrolled step index
  const [currentStepIndex, setCurrentStepIndex] = useControlledState(
    controlledStepIndex,
    defaultStepIndex,
    onStepIndexChange
  );

  // Validate and clamp step index
  const validStepIndex = React.useMemo(() => {
    const clamped = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
    if (clamped !== currentStepIndex) {
      console.warn(`Step index ${currentStepIndex} out of bounds, clamped to ${clamped}`);
    }
    return clamped;
  }, [currentStepIndex, steps.length]);

  const currentStepId = steps[validStepIndex]?.id || null;
  const isLastStep = validStepIndex === steps.length - 1;

  // Navigation handlers
  const handleNext = React.useCallback(async () => {
    if (isLastStep) {
      await onComplete?.(undefined);
    } else {
      setCurrentStepIndex(validStepIndex + 1);
    }
  }, [isLastStep, onComplete, setCurrentStepIndex, validStepIndex]);

  const handlePrevious = React.useCallback(() => {
    if (validStepIndex > 0) {
      setCurrentStepIndex(validStepIndex - 1);
    }
  }, [setCurrentStepIndex, validStepIndex]);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Context value
  const contextValue: WizardContextValue = React.useMemo(
    () => ({
      steps,
      currentStepIndex: validStepIndex,
      currentStepId,
    }),
    [steps, validStepIndex, currentStepId]
  );

  // Focus management ref
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Focus first interactive element when step changes
  React.useEffect(() => {
    if (contentRef.current) {
      const firstInput = contentRef.current.querySelector<HTMLElement>(
        'input, select, textarea, button'
      );
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [validStepIndex]);

  // State rendering priority after hooks:
  // 1. Loading state
  if (loading) {
    return renderLoading ? <>{renderLoading()}</> : <DefaultLoading />;
  }

  // 2. Permission denied state
  if (permissionDenied) {
    return renderPermissionDenied ? <>{renderPermissionDenied()}</> : <DefaultPermissionDenied />;
  }

  // 3. Error state
  if (error) {
    return renderError ? <>{renderError(error)}</> : <DefaultError error={error} />;
  }

  // 4. Empty state
  if (isEmpty) {
    return renderEmpty ? <>{renderEmpty()}</> : <DefaultEmpty message="No wizard steps configured" />;
  }

  // 5. Success state - render wizard
  return (
    <WizardContext.Provider value={contextValue}>
      <div
        className={className}
        aria-label={ariaLabel}
        {...props}
      >
        {/* Step Indicator */}
        {showStepIndicator && (
          <WizardStepIndicator
            steps={steps}
            currentStepIndex={validStepIndex}
            variant={stepIndicatorVariant}
          />
        )}

        {/* Step Content */}
        <div
          ref={contentRef}
          role="region"
          aria-live="polite"
          aria-atomic="true"
          style={{ padding: '2rem 0' }}
        >
          {children}
        </div>

        {/* Navigation */}
        <WizardNavigation
          currentStep={validStepIndex}
          totalSteps={steps.length}
          canGoPrevious={validStepIndex > 0}
          canGoNext={validStepIndex < steps.length - 1}
          isLastStep={isLastStep}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onCancel={handleCancel}
          onFinish={handleNext}
        />
      </div>
    </WizardContext.Provider>
  );
};

WizardFC.displayName = 'Wizard';

// Create compound component
export const Wizard = Object.assign(WizardFC, {
  Step: WizardStep,
  Navigation: WizardNavigation,
}) as WizardComponent;
