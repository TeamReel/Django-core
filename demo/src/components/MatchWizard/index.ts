/**
 * MatchWizard (v2) — Refactored with extracted step components
 *
 * This version extracts each step into its own file for better maintainability.
 * The core wizard shell and navigation remain in this file.
 */
export { default } from '../MatchWizard';
export { default as MatchWizard } from '../MatchWizard';
export { MatchWizardLineupStep } from '../MatchWizardLineupStep';
export { MatchSelectStep, ContentTypeStep, ReviewStep } from './MatchWizardSteps';
export * from '../matchWizardTypes';
export { useMatchWizardData } from '../useMatchWizardData';
