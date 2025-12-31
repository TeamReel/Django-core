/**
 * Project/Workspace entity type.
 * Represents a sub-context within an organisation.
 *
 * @packageDocumentation
 */

/**
 * Project/Workspace entity.
 * Sub-context within an organisation (optional depending on product usage).
 */
export interface Project {
  /** Unique identifier (backend primary key) */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** URL-safe slug for routing (e.g., "website-redesign") */
  slug: string;

  /** Parent organisation ID */
  organisationId: string;

  /** Parent organisation ID (snake_case alias) */
  organisation_id?: string;

  /** Optional metadata */
  metadata?: ProjectMetadata;
}

/**
 * Optional metadata for projects.
 */
export interface ProjectMetadata {
  /** Whether this project is archived */
  isArchived?: boolean;

  /** Last time this project was visited (ISO 8601 timestamp) */
  lastVisitedAt?: string;

  /** Additional custom metadata */
  [key: string]: unknown;
}
