/**
 * Router adapter interface for navigation integration.
 *
 * @packageDocumentation
 */

/**
 * Options for building context paths.
 */
export interface PathBuildOptions {
  /** If true, attempt to preserve current page path */
  preservePath?: boolean;

  /** Fallback path if preserve fails or not requested */
  fallbackPath?: string;
}

/**
 * Context information for path building.
 */
export interface ContextPathInfo {
  /** Organisation slug */
  orgSlug: string;

  /** Optional project slug */
  projectSlug?: string;
}

/**
 * Router adapter interface for routing integration.
 * Injected by host application to enable framework-agnostic navigation.
 *
 * This interface allows the context switcher to integrate with any routing
 * library (React Router, Next.js, etc.) without direct dependencies.
 */
export interface RouterAdapter {
  /**
   * Get the current URL path.
   * Used to initialize context from URL.
   *
   * @returns Current path (e.g., "/acme-corp/tasks")
   */
  getCurrentPath(): string;

  /**
   * Navigate to a new path.
   * Called on context switch.
   *
   * @param path - Target path (e.g., "/beta-inc/dashboard")
   */
  navigateTo(path: string): void;

  /**
   * Build URL path for a given context.
   * Implements path preservation logic.
   *
   * @param ctx - Target organisation and project
   * @param options - Path building options
   * @returns Constructed path
   */
  buildPathForContext(
    ctx: ContextPathInfo,
    options?: PathBuildOptions
  ): string;
}
