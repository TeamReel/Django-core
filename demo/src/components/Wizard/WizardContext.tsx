/**
 * WizardContext – Generic wizard state management
 *
 * Provides step navigation, validation, and state for any multi-step flow.
 * Works with WizardShell for the UI container.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────

export interface WizardStepConfig {
  /** Unique step identifier */
  id: string;
  /** Display title for the step */
  title: string;
  /** Whether this step shows a back button (default: true except first step) */
  showBack?: boolean;
  /** Whether this step can be skipped */
  skippable?: boolean;
  /** Steps that must be completed before this one */
  requires?: string[];
}

/** Navigation direction for step transition animations */
export type WizardDirection = 'forward' | 'backward' | 'initial';

export interface WizardState {
  /** Current step ID */
  currentStepId: string;
  /** Index of current step */
  currentStepIndex: number;
  /** All step configurations */
  steps: WizardStepConfig[];
  /** Completed step IDs */
  completedSteps: Set<string>;
  /** Arbitrary data shared across steps */
  data: Record<string, unknown>;
  /** Whether wizard is submitting/processing */
  isSubmitting: boolean;
  /** Error message if any */
  error: string | null;
  /** Navigation direction for transition animations */
  direction: WizardDirection;
}

export interface WizardActions {
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  back: () => void;
  /** Jump to a specific step by ID */
  goTo: (stepId: string) => void;
  /** Mark current step as completed and go to next */
  complete: () => void;
  /** Mark a specific step as completed */
  markCompleted: (stepId: string) => void;
  /** Update shared data */
  setData: <T>(key: string, value: T) => void;
  /** Merge multiple data values */
  updateData: (updates: Record<string, unknown>) => void;
  /** Set submitting state */
  setSubmitting: (submitting: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Reset wizard to initial state */
  reset: () => void;
  /** Close the wizard */
  close: () => void;
}

export interface WizardContextValue extends WizardState, WizardActions {
  /** Current step config */
  currentStep: WizardStepConfig;
  /** Whether on first step */
  isFirstStep: boolean;
  /** Whether on last step */
  isLastStep: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether a step is completed */
  isCompleted: (stepId: string) => boolean;
  /** Whether a step is available (requirements met) */
  isAvailable: (stepId: string) => boolean;
}

// ─── Context ──────────────────────────────────────────────

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────

export interface WizardProviderProps {
  /** Step configurations */
  steps: WizardStepConfig[];
  /** Initial step ID (defaults to first step) */
  initialStepId?: string;
  /** Initial shared data */
  initialData?: Record<string, unknown>;
  /** Called when wizard is closed */
  onClose: () => void;
  /** Called when wizard completes (last step completed) */
  onComplete?: (data: Record<string, unknown>) => void;
  children: ReactNode;
}

export function WizardProvider({
  steps,
  initialStepId,
  initialData = {},
  onClose,
  onComplete,
  children,
}: WizardProviderProps) {
  const [currentStepId, setCurrentStepId] = useState(initialStepId || steps[0]?.id || '');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [data, setDataState] = useState<Record<string, unknown>>(initialData);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<WizardDirection>('initial');

  // Derived state
  const currentStepIndex = steps.findIndex(s => s.id === currentStepId);
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = steps.length > 1 ? (currentStepIndex / (steps.length - 1)) * 100 : 100;

  // Check if step requirements are met
  const isAvailable = useCallback((stepId: string): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step?.requires?.length) return true;
    return step.requires.every(reqId => completedSteps.has(reqId));
  }, [steps, completedSteps]);

  const isCompleted = useCallback((stepId: string): boolean => {
    return completedSteps.has(stepId);
  }, [completedSteps]);

  // Actions
  const next = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setDirection('forward');
      setCurrentStepId(steps[currentStepIndex + 1].id);
      setError(null);
    }
  }, [currentStepIndex, steps]);

  const back = useCallback(() => {
    if (currentStepIndex > 0) {
      setDirection('backward');
      setCurrentStepId(steps[currentStepIndex - 1].id);
      setError(null);
    }
  }, [currentStepIndex, steps]);

  const goTo = useCallback((stepId: string) => {
    const targetIndex = steps.findIndex(s => s.id === stepId);
    if (targetIndex >= 0 && isAvailable(stepId)) {
      setDirection(targetIndex > currentStepIndex ? 'forward' : 'backward');
      setCurrentStepId(stepId);
      setError(null);
    }
  }, [steps, isAvailable, currentStepIndex]);

  const markCompleted = useCallback((stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
  }, []);

  const complete = useCallback(() => {
    markCompleted(currentStepId);
    if (isLastStep) {
      onComplete?.(data);
    } else {
      next();
    }
  }, [currentStepId, isLastStep, markCompleted, next, onComplete, data]);

  const setData = useCallback(<T,>(key: string, value: T) => {
    setDataState(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateData = useCallback((updates: Record<string, unknown>) => {
    setDataState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStepId(initialStepId || steps[0]?.id || '');
    setCompletedSteps(new Set());
    setDataState(initialData);
    setSubmitting(false);
    setError(null);
    setDirection('initial');
  }, [initialStepId, initialData, steps]);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Memoized context value
  const value = useMemo<WizardContextValue>(() => ({
    // State
    currentStepId,
    currentStepIndex,
    steps,
    completedSteps,
    data,
    isSubmitting,
    error,
    direction,
    // Derived
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    // Checks
    isCompleted,
    isAvailable,
    // Actions
    next,
    back,
    goTo,
    complete,
    markCompleted,
    setData,
    updateData,
    setSubmitting,
    setError,
    reset,
    close,
  }), [
    currentStepId, currentStepIndex, steps, completedSteps, data, isSubmitting, error, direction,
    currentStep, isFirstStep, isLastStep, progress,
    isCompleted, isAvailable,
    next, back, goTo, complete, markCompleted, setData, updateData, setSubmitting, setError, reset, close,
  ]);

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}
