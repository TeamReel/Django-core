/**
 * CreateWizardContext – Domain state for the universal create wizard.
 *
 * Manages:
 * - Which flow the user selected (content, match, member, team, season)
 * - Context pre-fills from the current page (org, club, team, period, activity)
 * - Per-flow form data (delegated to sub-flow providers later)
 *
 * Sits alongside the generic WizardProvider (navigation) following the
 * dual-context pattern proven in MatchWizardV2.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────

/** Available create flows */
export type CreateFlowType = 'content' | 'match' | 'member' | 'team' | 'season';

/** Context pre-fills from the current page */
export interface CreatePrefill {
  organisationId?: string;
  organisationSlug?: string;
  clubProjectId?: string | number;
  teamProjectId?: string | number;
  periodId?: string;
  activityId?: string;
}

/** Domain state */
export interface CreateWizardState {
  /** Which flow is selected (null = still on choose step) */
  selectedFlow: CreateFlowType | null;
  /** Pre-fills from current page context */
  prefill: CreatePrefill;
}

/** Domain actions */
export interface CreateWizardActions {
  /** Select a flow and advance past the choose step */
  selectFlow: (flow: CreateFlowType) => void;
  /** Go back to the choose step */
  clearFlow: () => void;
  /** Update prefill values */
  setPrefill: (prefill: CreatePrefill) => void;
  /** Full reset (called on close) */
  resetAll: () => void;
}

export interface CreateWizardContextValue extends CreateWizardState, CreateWizardActions {}

// ─── Context ──────────────────────────────────────────────

const CreateWizardCtx = createContext<CreateWizardContextValue | null>(null);

export function useCreateWizard(): CreateWizardContextValue {
  const ctx = useContext(CreateWizardCtx);
  if (!ctx) {
    throw new Error('useCreateWizard must be used within a CreateWizardProvider');
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────

export interface CreateWizardProviderProps {
  /** Initial pre-fills from context */
  initialPrefill?: CreatePrefill;
  children: ReactNode;
}

export function CreateWizardProvider({
  initialPrefill = {},
  children,
}: CreateWizardProviderProps) {
  const [selectedFlow, setSelectedFlow] = useState<CreateFlowType | null>(null);
  const [prefill, setPrefillState] = useState<CreatePrefill>(initialPrefill);

  const selectFlow = useCallback((flow: CreateFlowType) => {
    setSelectedFlow(flow);
  }, []);

  const clearFlow = useCallback(() => {
    setSelectedFlow(null);
  }, []);

  const setPrefill = useCallback((p: CreatePrefill) => {
    setPrefillState(p);
  }, []);

  const resetAll = useCallback(() => {
    setSelectedFlow(null);
    setPrefillState(initialPrefill);
  }, [initialPrefill]);

  const value = useMemo<CreateWizardContextValue>(() => ({
    selectedFlow,
    prefill,
    selectFlow,
    clearFlow,
    setPrefill,
    resetAll,
  }), [selectedFlow, prefill, selectFlow, clearFlow, setPrefill, resetAll]);

  return (
    <CreateWizardCtx.Provider value={value}>
      {children}
    </CreateWizardCtx.Provider>
  );
}
