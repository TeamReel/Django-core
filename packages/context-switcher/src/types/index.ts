/**
 * Type definitions for @django-core/context-switcher.
 *
 * @packageDocumentation
 */

// Core entities
export type { Organisation, OrganisationMetadata } from './organisation';
export type { Project, ProjectMetadata } from './project';

// Context types
export type { UserContext, ContextError, ContextTarget } from './context';

// Router integration
export type {
  RouterAdapter,
  PathBuildOptions,
  ContextPathInfo,
} from './router';

// Configuration
export type { ContextSwitcherConfig } from './config';
