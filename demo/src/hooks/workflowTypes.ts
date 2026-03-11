// ─── Workflow Types ──────────────────────────────────────────────────────────

export interface WorkflowState {
  name: string;
  is_initial?: boolean;
}

export interface WorkflowTransition {
  from_state: string;
  to_state: string;
  action: string;
  required_permission?: string;
  validators?: string[];
}

export interface WorkflowDefinition {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  version: string;
  definition: WorkflowDefinition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailableAction {
  action: string;
  to_state: string;
  required_permission: string;
}

export interface WorkflowInstance {
  id: number;
  workflow: number;
  workflow_name: string;
  workflow_version: string;
  workflow_snapshot: WorkflowDefinition;
  project: number;
  content_type: number;
  content_type_name: string;
  object_id: number;
  current_state: string;
  context: Record<string, unknown>;
  version: number;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
  available_actions: string[];
}

export interface TransitionHistoryEntry {
  id: number;
  instance: number;
  from_state: string;
  to_state: string;
  action: string;
  actor: number | null;
  actor_username?: string;
  comment: string;
  task_id: string | null;
  context_snapshot: Record<string, unknown>;
  created_at: string;
}
