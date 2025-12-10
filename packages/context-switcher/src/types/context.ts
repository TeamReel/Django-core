/**
 * User context and error types.
 *
 * @packageDocumentation
 */

import type { Organisation } from './organisation';
import type { Project } from './project';

/**
 * User's current active organisation and project selection.
 */
export interface UserContext {
  /** Current active organisation (null if no context selected) */
  organisation: Organisation | null;

  /** Current active project (null if org-only context or no context) */
  project: Project | null;

  /** Loading state (true while fetching context from backend) */
  isLoading: boolean;

  /** Error state (populated if context fetch/validation fails) */
  error: ContextError | null;
}

/**
 * Context error information.
 */
export interface ContextError {
  /** HTTP error code (401, 403, 404, 500) */
  code: number;

  /** User-facing error message */
  message: string;

  /** Additional error details for debugging */
  details?: unknown;
}

/**
 * Context target for switching operations.
 */
export interface ContextTarget {
  /** Target organisation slug */
  orgSlug: string;

  /** Optional target project slug */
  projectSlug?: string;
}
