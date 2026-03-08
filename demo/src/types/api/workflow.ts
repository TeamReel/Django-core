/**
 * Workflow types — WorkflowTemplate, WorkflowInstance, TransitionHistory.
 * Mirrors: src/workflows/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Available Action                                                   */
/* ------------------------------------------------------------------ */

export interface AvailableAction {
  action: string;
  target_state: string;
  label: string;
  requires_comment: boolean;
}

/* ------------------------------------------------------------------ */
/*  Workflow Template                                                   */
/* ------------------------------------------------------------------ */

export interface WorkflowState {
  name: string;
  label: string;
  is_initial: boolean;
  is_final: boolean;
}

export interface WorkflowTransitionDef {
  from_state: string;
  to_state: string;
  action: string;
  label: string;
  requires_comment: boolean;
  allowed_roles: string[];
}

export interface WorkflowTemplate {
  id: string;                    // UUID
  name: string;
  slug: string;
  description: string;
  states: WorkflowState[];
  transitions: WorkflowTransitionDef[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Workflow Instance                                                   */
/* ------------------------------------------------------------------ */

export interface WorkflowInstance {
  id: string;                    // UUID
  workflow: string;              // UUID → WorkflowTemplate
  current_state: string;
  context: Record<string, unknown>;
  version: number;
  available_actions: AvailableAction[];
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Transition History                                                 */
/* ------------------------------------------------------------------ */

export interface TransitionHistory {
  id: number;
  instance: string;              // UUID → WorkflowInstance
  from_state: string;
  to_state: string;
  action: string;
  comment: string;
  performed_by: number;
  performed_by_name: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Project Permission Override                                        */
/* ------------------------------------------------------------------ */

export interface ProjectPermissionOverride {
  id: number;
  project: number;
  role: string;
  permission: string;
  is_allowed: boolean;
  created_at: string;
  updated_at: string;
}
