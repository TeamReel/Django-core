/**
 * Configuration types for ContextSwitcherProvider.
 *
 * @packageDocumentation
 */

import type { RouterAdapter } from './router';
import type { UserContext } from './context';
import type { Organisation } from './organisation';
import type { Project } from './project';

/**
 * Custom labels for i18n support.
 */
export interface ContextLabels {
  /** Label for "Organisation" (default: "Organisation") */
  organisationLabel?: string;

  /** Label for "Project" (default: "Project") */
  projectLabel?: string;

  /** Placeholder for search input (default: "Search...") */
  searchPlaceholder?: string;

  /** Message when no organisations available (default: "No organisations available") */
  noOrganisations?: string;

  /** Message when no projects available (default: "No projects available") */
  noProjects?: string;
}

/**
 * Context change target.
 */
export interface ContextChangeTarget {
  /** Target organisation */
  organisation: Organisation;

  /** Optional target project */
  project?: Project;
}

/**
 * Configuration object for ContextSwitcherProvider.
 */
export interface ContextSwitcherConfig {
  /** Router adapter for navigation integration (required) */
  routerAdapter: RouterAdapter;

  /** Base URL for backend API (e.g., "/api" or "https://api.example.com") */
  apiBaseUrl?: string;

  /** Keyboard shortcut to open context switcher (default: "Ctrl+K" / "Cmd+K") */
  keyboardShortcut?: string;

  /** Disable keyboard shortcut entirely */
  disableKeyboardShortcut?: boolean;

  /** Custom labels for organisations/projects (i18n support) */
  labels?: ContextLabels;

  /**
   * Callback invoked before context switch.
   * Return false or reject promise to cancel the switch.
   * Useful for unsaved changes confirmation.
   */
  onBeforeContextChange?: (
    from: UserContext,
    to: ContextChangeTarget
  ) => boolean | Promise<boolean>;

  /**
   * Callback invoked after successful context switch.
   */
  onContextChanged?: (context: UserContext) => void;

  /**
   * Callback invoked when context loading fails.
   */
  onContextError?: (error: Error) => void;
}
