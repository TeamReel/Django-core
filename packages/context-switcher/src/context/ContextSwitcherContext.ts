import { createContext } from 'react';
import type { UserContext, Organisation, Project } from '../types';

/**
 * Context value provided by ContextSwitcherProvider
 */
export interface ContextSwitcherContextValue {
  /** Current user context (org + project) */
  context: UserContext;

  /** All available organisations for the user */
  organisations: Organisation[];

  /** All available projects in current organisation */
  projects: Project[];

  /**
   * Switch to a different organisation and optional project.
   * Updates state, persists to backend, and triggers navigation.
   */
  switchContext: (org: Organisation, project?: Project) => Promise<void>;

  /**
   * Switch to a different project within current organisation.
   * Shorthand for switchContext(currentOrg, project).
   */
  switchProject: (project: Project) => Promise<void>;

  /**
   * Refresh context data from backend.
   * Used after org/project list changes.
   */
  refresh: () => Promise<void>;

  /** True while context switch is in progress */
  isSwitching: boolean;
}

/**
 * React Context for context switcher state
 */
export const ContextSwitcherContext =
  createContext<ContextSwitcherContextValue | null>(null);
